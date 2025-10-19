// Load environment variables (ESM)
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

dotenv.config();

// __dirname replacement in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001; // Allow override via env

// Serve static files from src folder
app.use(express.static("src"));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./recordings/");
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    cb(null, `recording-${timestamp}.mp3`);
  },
});

const upload = multer({ storage: storage });

// Create recordings directory if it doesn't exist
if (!fs.existsSync("./recordings")) {
  fs.mkdirSync("./recordings");
}

// Endpoint to save MP3 file
app.post("/save-mp3", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log(`MP3 file saved: ${req.file.filename}`);
  res.json({
    success: true,
    filename: req.file.filename,
    message: `File saved as ${req.file.filename}`,
  });
});

// Endpoint to transcribe audio
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded" });
  }

  try {
    console.log(`Transcribing: ${req.file.filename}`);

    // Call the voice-to-text processor
    const transcript = await transcribeWithVoiceProcessor(req.file.path);

    res.json({
      success: true,
      transcript: transcript,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({
      error: error.message || "Transcription failed",
    });
  }
});

// Function to call the voice-to-text processor
async function transcribeWithVoiceProcessor(audioFilePath) {
  return new Promise((resolve, reject) => {
    // Use the local CLI processor
    const processorPath = path.join(__dirname, "transcribe-cli.js");

    // Check if processor exists
    if (!fs.existsSync(processorPath)) {
      reject(new Error("Voice-to-text processor not found"));
      return;
    }

    // Spawn Node.js process to run the processor
    const child = spawn("node", [processorPath, audioFilePath], {
      cwd: __dirname,
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        // Success - extract transcript from output
        const transcript = output.trim();
        if (transcript) {
          resolve(transcript);
        } else {
          reject(new Error("No transcription result received"));
        }
      } else {
        reject(
          new Error(`Transcription failed with code ${code}: ${errorOutput}`)
        );
      }
    });

    child.on("error", (error) => {
      reject(
        new Error(`Failed to start transcription process: ${error.message}`)
      );
    });
  });
}

// Serve recordings directory
app.use("/recordings", express.static("./recordings"));

// Endpoint to list saved recordings
app.get("/recordings", (req, res) => {
  try {
    const files = fs
      .readdirSync("./recordings")
      .filter((file) => file.endsWith(".mp3"))
      .map((file) => ({
        filename: file,
        path: `./recordings/${file}`,
        size: fs.statSync(`./recordings/${file}`).size,
      }));

    res.json({ recordings: files });
  } catch (error) {
    res.status(500).json({ error: "Failed to read recordings directory" });
  }
});

// Endpoint to delete a recording
app.delete("/recordings/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join("./recordings", filename);

    // Security check - ensure file is in recordings directory using resolved paths
    const resolvedPath = path.resolve(filePath);
    const recordingsDir = path.resolve("./recordings");
    if (!resolvedPath.startsWith(recordingsDir + path.sep)) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
      res.json({ success: true, message: `Deleted ${filename}` });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

app.listen(PORT, () => {
  console.log(
    `Mic-to-MP3 + Transcription server running at http://localhost:${PORT}`
  );
  console.log(`Recordings will be saved to: ${path.resolve("./recordings")}`);
  console.log(
    `Voice-to-text processor: ${path.resolve("../voice-to-text/processor.js")}`
  );
});
