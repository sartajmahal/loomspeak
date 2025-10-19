/*
 * LoomSpeak+ Backend - Gemini Action Parser for Atlassian Tools
 * Processes audio transcripts and extracts structured actions for Jira and Confluence
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");
// Ensure fetch is available in Node environments < 18
const _fetch =
  typeof fetch !== "undefined"
    ? fetch
    : (...args) => import("node-fetch").then(({ default: f }) => f(...args));

// Use a different default port than mic-to-text (which uses 3001)
const PORT = process.env.PORT || 3010;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Simple in-memory + file persistence for latest parsed result
let lastResult = null;
const LAST_FILE = path.join(__dirname, "last-parsed.json");
try {
  if (fs.existsSync(LAST_FILE)) {
    const raw = fs.readFileSync(LAST_FILE, "utf-8");
    lastResult = JSON.parse(raw);
  }
} catch (e) {
  console.warn("[WARN] Could not read last-parsed.json:", e.message);
}

if (!GOOGLE_API_KEY) {
  console.warn(
    "[WARN] GOOGLE_API_KEY not set. Create a .env file in model-output/ with GOOGLE_API_KEY=..."
  );
}

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
// Serve the model-output UI
app.use(express.static(__dirname));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    model: GEMINI_MODEL,
    timestamp: new Date().toISOString(),
  });
});

// AI connectivity health check
app.get("/health/ai", async (_req, res) => {
  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ ok: false, error: "Missing GOOGLE_API_KEY" });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}?key=${GOOGLE_API_KEY}`;
    const response = await _fetch(url);
    const data = await response.text();

    return res.status(response.ok ? 200 : 502).json({
      ok: response.ok,
      status: response.status,
      model: GEMINI_MODEL,
      available: response.ok,
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: "connectivity_failed",
      message: error.message,
    });
  }
});

// Main endpoint: Parse transcript text into structured Atlassian actions
app.post("/api/parse", async (req, res) => {
  try {
    const { text } = req.body || {};

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        error: "Invalid payload: expected { text: string }",
      });
    }

    if (!GOOGLE_API_KEY) {
      return res.status(500).json({
        error: "Missing GOOGLE_API_KEY on server",
      });
    }

    // System prompt with comprehensive Jira/Confluence heuristics
    const system = `
You are LoomSpeak+, the Gemini Action Parser for Atlassian Forge.

Your job is to extract ALL actionable items from the user's input and return them as STRICT JSON.

Return ONLY a valid JSON object with this structure:
{
  "actions": [
    {
      "action": "create_issue" | "update_issue" | "delete_issue" | "create_page" | "update_page" | "delete_page",
      "title": "short, human-readable title (required for create_*; optional for update_/delete_)",
      "target": "jira" | "confluence",
      "identifier": {
        "issueKey": "e.g., PROJ-123",
        "projectKey": "e.g., PROJ", 
        "pageId": "confluence page id if known",
        "pageTitle": "page title if id unknown",
        "spaceKey": "e.g., ENG"
      },
      "data": {
        "summary": "short summary/title",
        "description": "longer text",
        "issueType": "Bug|Task|Story", 
        "priority": "Highest|High|Medium|Low",
        "assignee": "name",
        "labels": ["list","of","tags"],
        "dueDate": "date or natural language",
        "body": "confluence body content"
      }
    }
  ]
}

---
### Decision Heuristics

🔹 Jira (target="jira")
- Triggers when input mentions **tasks, bugs, tickets, issues, assignments, deadlines, schedules, meetings to plan, things to fix/do/change**.
- Keywords: fix, resolve, implement, complete, do, finish, assign, task, issue, bug, sprint, schedule meeting, plan, review, push, reschedule, delay.
- Prefer Jira for *actions that need to be tracked or executed*.
- Default action mapping:
  - create_issue → create/make/add/new/open/file/schedule/plan
  - update_issue → update/edit/change/reassign/close/resolve/push/reschedule
  - delete_issue → delete/remove

🔹 Confluence (target="confluence")
- Triggers when input mentions **documents, notes, summaries, meeting minutes, write-ups, pages, references, docs**.
- Keywords: write, document, add notes, make page, create doc, summary, documentation, notes.
- Prefer Confluence for *content to be stored or documented*, not executed.
- Default action mapping:
  - create_page → create/make/add/write new doc/page
  - update_page → update/edit/change/append/add to existing doc
  - delete_page → delete/remove doc/page/notes

---
If both Jira and Confluence could apply, **prefer Jira** for actions (do/fix/schedule) and **Confluence** for documentation/notes after the action.

If no valid actions are found, return { "actions": [] }.

Do NOT include explanations, prose, or markdown.
Return VALID JSON ONLY.

---
### Examples

Input: "Fix the API rate limit bug and update the onboarding docs. Delete page 'Old Sprint Plan' in space ENG."
Output:
{
  "actions": [
    {
      "action": "create_issue",
      "title": "Fix API rate limit bug", 
      "target": "jira",
      "data": { "issueType": "Bug", "summary": "Fix API rate limit bug" }
    },
    {
      "action": "update_page",
      "title": "Update onboarding documentation",
      "target": "confluence", 
      "identifier": { "pageTitle": "Onboarding documentation" }
    },
    {
      "action": "delete_page",
      "target": "confluence",
      "identifier": { "pageTitle": "Old Sprint Plan", "spaceKey": "ENG" }
    }
  ]
}

Input: "Bro I got so much to do today. Sartaj needs to schedule a meeting with me later at 6:30 about the political and economic state of the world. Me and John Pork are beefing so we gotta delete that document of our happiest memories. Also the bug in my code for CSE493 is fixed thanks to Ranjay Krishna. Finally, that meeting with Yanda and Sid should be pushed back from Tuesday to Thursday."
Output:
{
  "actions": [
    {
      "action": "create_issue",
      "target": "jira",
      "title": "Schedule meeting with Sartaj about political and economic state of the world",
      "data": { "dueDate": "6:30 PM" }
    },
    {
      "action": "delete_page", 
      "target": "confluence",
      "identifier": { "pageTitle": "Memories with John Pork" }
    },
    {
      "action": "update_issue",
      "target": "jira",
      "title": "CSE493 bug fix",
      "data": { "description": "Bug in CSE493 code solved with help from Ranjay Krishna." }
    },
    {
      "action": "update_issue",
      "target": "jira", 
      "title": "Reschedule meeting with Yanda and Sid",
      "data": { "dueDate": "Thursday 6-7 PM" }
    }
  ]
}
`;

    // Build the prompt
    const prompt = `${system}\n\nInput: ${text}\n\nOutput:`;

    // Call Gemini API directly via fetch for reliability
    const genRequest = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;

    const response = await _fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(genRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return res.status(502).json({
        error: "Gemini API request failed",
        status: response.status,
        details: errorText.slice(0, 200),
      });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Raw Gemini response:", rawText);

    // Parse the JSON response with fallback extraction
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (secondAttempt) {
          // Try to salvage partial JSON arrays
          const actionsMatch = rawText.match(
            /\{"actions":\s*\[[\s\S]*?\]\s*\}/
          );
          if (actionsMatch) {
            try {
              parsed = JSON.parse(actionsMatch[0]);
            } catch (thirdAttempt) {
              return res.status(502).json({
                error: "Could not parse JSON from model response",
                raw: rawText.slice(0, 500),
              });
            }
          } else {
            return res.status(502).json({
              error: "No valid JSON found in response",
              raw: rawText.slice(0, 500),
            });
          }
        }
      } else {
        return res.status(502).json({
          error: "No JSON structure found in response",
          raw: rawText.slice(0, 500),
        });
      }
    }

    // Validate and normalize the response
    if (!parsed || !Array.isArray(parsed.actions)) {
      return res.status(502).json({
        error: "Invalid response structure",
        raw: rawText.slice(0, 500),
      });
    }

    // Normalize actions
    const validActions = [
      "create_issue",
      "update_issue",
      "delete_issue",
      "create_page",
      "update_page",
      "delete_page",
    ];
    const validTargets = ["jira", "confluence"];

    const actions = parsed.actions
      .filter((action) => action && typeof action === "object")
      .map((action) => ({
        action: validActions.includes(action.action)
          ? action.action
          : undefined,
        title:
          typeof action.title === "string"
            ? action.title.trim().slice(0, 100)
            : undefined,
        target: validTargets.includes(action.target)
          ? action.target
          : undefined,
        identifier:
          action.identifier && typeof action.identifier === "object"
            ? action.identifier
            : undefined,
        data:
          action.data && typeof action.data === "object"
            ? action.data
            : undefined,
      }))
      .filter((action) => {
        // Must have action and target
        if (!action.action || !action.target) return false;
        // Create actions must have a title
        if (action.action.startsWith("create_") && !action.title) return false;
        return true;
      });

    const resultPayload = {
      input: text,
      actions,
      raw: parsed,
      metadata: {
        inputLength: text.length,
        actionsFound: actions.length,
        timestamp: new Date().toISOString(),
      },
    };

    // Save latest result in-memory and to disk
    lastResult = resultPayload;
    try {
      fs.writeFileSync(
        LAST_FILE,
        JSON.stringify(resultPayload, null, 2),
        "utf-8"
      );
    } catch (e) {
      console.warn("[WARN] Failed to persist last parsed result:", e.message);
    }

    return res.json(resultPayload);
  } catch (error) {
    console.error("Error in /api/parse:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Retrieve last parsed result
app.get("/api/last", (_req, res) => {
  if (lastResult) {
    return res.json(lastResult);
  }
  try {
    if (fs.existsSync(LAST_FILE)) {
      const raw = fs.readFileSync(LAST_FILE, "utf-8");
      const data = JSON.parse(raw);
      lastResult = data;
      return res.json(data);
    }
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Failed to read last result", message: e.message });
  }
  return res.status(404).json({ error: "No parsed result available yet" });
});

// Friendly root route to index.html
app.get(["/", "/app", "/model-output"], (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 LoomSpeak+ Backend listening on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI health: http://localhost:${PORT}/health/ai`);
});
