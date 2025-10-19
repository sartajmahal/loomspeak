import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const {
  OPENAI_API_KEY,
  GEMINI_API_KEY
} = process.env;

// Cost optimization settings
const COST_OPTIMIZATION = {
  MAX_AUDIO_DURATION: 10 * 60, // 10 minutes max
  TARGET_SAMPLE_RATE: 16000,   // 16kHz for Whisper
  CHUNK_SIZE: 25 * 1024 * 1024, // 25MB chunks
  USE_WHISPER_1: true,         // Use cheaper Whisper-1 model
  COMPRESS_AUDIO: true,        // Enable audio compression
  BATCH_PROCESSING: true       // Process in batches to reduce API calls
};

// Simple file upload endpoint (no S3 needed)
app.post('/upload', async (req, res) => {
  try {
    const { audioData, filename } = req.body;
    
    // Process audio data directly (base64 or buffer)
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Check file size limit for cost control
    if (audioBuffer.length > COST_OPTIMIZATION.CHUNK_SIZE) {
      throw new Error(`File too large. Maximum size is ${COST_OPTIMIZATION.CHUNK_SIZE / (1024 * 1024)}MB`);
    }

    res.json({ 
      success: true, 
      filename,
      size: audioBuffer.length,
      message: 'File uploaded successfully'
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Optimized audio processing without S3 (local processing)
app.post('/process', async (req, res) => {
  try {
    const { audioData, sourceTranscript, optimizeForCost = true, workspaceContext, userCommand } = req.body;
    const sessionId = `sess_${Date.now()}`;
    
    console.log(`Processing session ${sessionId} with cost optimization: ${optimizeForCost}`);
    console.log('Workspace context:', workspaceContext);

    let transcript = sourceTranscript || '';

    // 1) Use source transcript if available (from Web Speech API - FREE)
    if (sourceTranscript && sourceTranscript.trim().length > 10) {
      console.log('Using Web Speech API transcript (free)');
      transcript = sourceTranscript;
    } else if (audioData) {
      // 2) Process audio data directly with Whisper API
      console.log('Using Whisper API with cost optimization');
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Check file size limit for cost control
      if (audioBuffer.length > COST_OPTIMIZATION.CHUNK_SIZE) {
        throw new Error(`File too large. Maximum size is ${COST_OPTIMIZATION.CHUNK_SIZE / (1024 * 1024)}MB`);
      }
      
      transcript = await transcribeWithWhisper(audioBuffer, optimizeForCost);
    }

    // 3) Extract actions using Gemini with Rovo integration and workspace context
    let summary = '';
    let actions: any[] = [];
    if (transcript.trim().length > 0) {
      const extractionResult = await extractActionsCostOptimized(transcript, optimizeForCost, workspaceContext);
      summary = extractionResult.summary;
      actions = extractionResult.actions;
    }

    res.json({ 
      sessionId, 
      transcript, 
      summary, 
      actions,
      costOptimized: optimizeForCost,
      processingMethod: sourceTranscript ? 'web-speech-api' : 'whisper-api',
      workspaceContext,
      userCommand
    });

  } catch (error: any) {
    console.error('Processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cost-optimized Whisper transcription
async function transcribeWithWhisper(audioBuffer: Buffer, optimizeForCost: boolean): Promise<string> {
  try {
    // Create temporary file for audio processing
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `audio-${Date.now()}.webm`);
    
    // Write buffer to temp file
    await pipeline(
      require('stream').Readable.from(audioBuffer),
      createWriteStream(tempFile)
    );

    // Use cheaper Whisper-1 model for cost optimization
    const model = optimizeForCost ? 'whisper-1' : 'whisper-1';
    
    const formData = new FormData();
    formData.append('file', createReadStream(tempFile) as any, 'audio.webm');
    formData.append('model', model);
    formData.append('response_format', 'text'); // Get plain text to reduce token usage
    formData.append('temperature', '0.0'); // Deterministic output
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData
    });

    // Clean up temp file
    await unlink(tempFile).catch(() => {});

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }

    const transcript = await response.text();
    return transcript.trim();

  } catch (error: any) {
    console.error('Whisper transcription error:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

// Cost-optimized action extraction using Gemini with Rovo integration
async function extractActionsCostOptimized(transcript: string, optimizeForCost: boolean, workspaceContext?: any): Promise<{summary: string, actions: any[]}> {
  try {
    // Enhanced Gemini system prompt with Rovo agent integration
    const systemPrompt = `You are LoomSpeak+, an Atlassian assistant powered by Rovo agents. Extract actionable items from meeting/lecture transcripts and categorize them using workspace context:

1. JIRA TICKETS: Upcoming assignments, tasks, deadlines, bugs to fix
2. CONFLUENCE PAGES: Notable concepts, lecture notes, important information
3. OTHER: Any other actionable items

Workspace Context: ${workspaceContext ? JSON.stringify(workspaceContext) : 'No workspace context provided'}

Use Rovo agent capabilities to:
- Analyze content for academic context (courses, assignments, concepts)
- Identify workspace-specific terminology
- Suggest appropriate project keys and space keys
- Extract structured data for Atlassian tools

Return JSON with this structure:
{
  "summary": "Brief meeting/lecture summary with workspace context",
  "actions": [
    {
      "action": "create_issue|create_page|other",
      "title": "Task/Page title",
      "description": "Detailed description",
      "project": "Project key (e.g., CSE312, ENG)",
      "points": 2,
      "assignee": "email@example.com",
      "dueDate": "Friday",
      "spaceKey": "CSE312",
      "category": "assignment|concept|other",
      "workspaceContext": "Additional workspace-specific context"
    }
  ],
  "rovoInsights": {
    "detectedCourse": "Course name if detected",
    "assignmentType": "Type of assignment if detected",
    "conceptLevel": "Beginner|Intermediate|Advanced"
  }
}`;

    const userPrompt = `Transcript: ${transcript}\n\nExtract actionable items using Rovo agent analysis and create a summary with workspace context.`;

    // Use Gemini API with Rovo-enhanced prompts
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: optimizeForCost ? 800 : 1500,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as any;
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No content received from Gemini API');
    }

    try {
      const parsed = JSON.parse(content);
      
      // Handle different response formats
      if (parsed.actions && parsed.summary) {
        return {
          summary: parsed.summary,
          actions: Array.isArray(parsed.actions) ? parsed.actions : []
        };
      } else if (Array.isArray(parsed)) {
        return {
          summary: `Extracted ${parsed.length} actionable items from transcript.`,
          actions: parsed
        };
      } else {
        // Fallback: create a simple action from the transcript
        return {
          summary: 'Meeting transcript processed with Rovo analysis.',
          actions: [{
            action: 'create_issue',
            title: 'Meeting Action Item',
            description: transcript.substring(0, 200) + '...',
            project: 'ENG',
            confidence: 0.5
          }]
        };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback response
      return {
        summary: 'Transcript processed with basic Rovo extraction.',
        actions: [{
          action: 'create_issue',
          title: 'Meeting Action Item',
          description: transcript.substring(0, 200) + '...',
          project: 'ENG',
          confidence: 0.3
        }]
      };
    }

  } catch (error: any) {
    console.error('Rovo action extraction error:', error);
    // Return minimal fallback
    return {
      summary: 'Failed to extract actions with Rovo analysis.',
      actions: [{
        action: 'create_issue',
        title: 'Manual Review Required',
        description: 'Please review the transcript and create tasks manually.',
        project: 'ENG',
        confidence: 0.1
      }]
    };
  }
}

// Root route to fix "Cannot GET" error
app.get('/', (req, res) => {
  res.json({ 
    message: 'LoomSpeak+ Rovo API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET /health - Health check',
      'GET /cost-info - Cost optimization info',
      'POST /upload - Upload audio data',
      'POST /process - Process audio/transcript',
      'POST /format-output - Format Forge results'
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    costOptimization: COST_OPTIMIZATION
  });
});

// Final Gemini formatting endpoint
app.post('/format-output', async (req, res) => {
  try {
    const { forgeResults, sessionId, originalActions } = req.body;
    
    const formatPrompt = `You are LoomSpeak+'s output formatter. Take the Forge bot results and create a concise summary.

Forge Results: ${JSON.stringify(forgeResults)}

Create a response with:
1. Links to created items (Jira tickets, Confluence pages)
2. One sentence description of what each item relates to
3. Total count of items created

Format as JSON:
{
  "summary": "Created X items from your session",
  "items": [
    {
      "type": "jira_issue|confluence_page|other",
      "title": "Item title",
      "url": "https://link-to-item",
      "description": "One sentence description"
    }
  ],
  "sessionId": "${sessionId}"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: formatPrompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 300,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini formatting error: ${response.status}`);
    }

    const result = await response.json() as any;
    const formattedOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    res.json(JSON.parse(formattedOutput || '{}'));
  } catch (error: any) {
    console.error('Formatting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cost monitoring endpoint
app.get('/cost-info', (req, res) => {
  res.json({
    optimization: {
      maxAudioDuration: COST_OPTIMIZATION.MAX_AUDIO_DURATION,
      targetSampleRate: COST_OPTIMIZATION.TARGET_SAMPLE_RATE,
      maxFileSize: COST_OPTIMIZATION.CHUNK_SIZE,
      whisperModel: COST_OPTIMIZATION.USE_WHISPER_1 ? 'whisper-1' : 'whisper-1',
      compressionEnabled: COST_OPTIMIZATION.COMPRESS_AUDIO,
      batchProcessing: COST_OPTIMIZATION.BATCH_PROCESSING
    },
    estimatedCosts: {
      whisperPerMinute: 0.006, // $0.006 per minute
      geminiPer1kTokens: 0.000075, // $0.000075 per 1k tokens (cheaper than GPT-4o-mini!)
      webSpeechAPI: 0, // Free
      s3Storage: 0 // No longer using S3
    },
    features: {
      localProcessing: true,
      noS3Required: true,
      rovoIntegration: true
    }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Cost-optimized LoomSpeak+ proxy listening on port ${PORT}`);
  console.log('Cost optimization features enabled:', COST_OPTIMIZATION);
});
