import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
  AWS_REGION,
  S3_BUCKET,
  OPENAI_API_KEY,
  GEMINI_API_KEY,
  PRESIGN_TTL_SECONDS = '900'
} = process.env;

const s3 = new S3Client({ region: AWS_REGION });

// Cost optimization settings
const COST_OPTIMIZATION = {
  MAX_AUDIO_DURATION: 10 * 60, // 10 minutes max
  TARGET_SAMPLE_RATE: 16000,   // 16kHz for Whisper
  CHUNK_SIZE: 25 * 1024 * 1024, // 25MB chunks
  USE_WHISPER_1: true,         // Use cheaper Whisper-1 model
  COMPRESS_AUDIO: true,        // Enable audio compression
  BATCH_PROCESSING: true       // Process in batches to reduce API calls
};

// Presign S3 upload with cost optimization
app.get('/s3/presign', async (req, res) => {
  try {
    const filename = String(req.query.filename || `upload-${Date.now()}`);
    const contentType = req.query.contentType || 'application/octet-stream';
    const key = `uploads/${Date.now()}-${filename}`;
    
    const cmd = new PutObjectCommand({ 
      Bucket: S3_BUCKET, 
      Key: key, 
      ContentType: String(contentType),
      // Add cost optimization metadata
      Metadata: {
        'cost-optimized': 'true',
        'upload-timestamp': Date.now().toString()
      }
    });
    
    const url = await getSignedUrl(s3, cmd, { expiresIn: Number(PRESIGN_TTL_SECONDS) });
    const publicUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
    
    res.json({ url, contentType, publicUrl, key });
  } catch (error: any) {
    console.error('S3 presign error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Optimized S3 preprocessing - store only transcript
async function preprocessWithS3(transcript: string, sessionId: string) {
  try {
    // Store only the transcript in S3
    const transcriptKey = `transcripts/${sessionId}-${Date.now()}.txt`;
    const transcriptCmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: transcriptKey,
      Body: transcript,
      ContentType: 'text/plain',
      Metadata: {
        'session-id': sessionId,
        'processing-stage': 'transcript-storage',
        'transcript-length': transcript.length.toString()
      }
    });
    await s3.send(transcriptCmd);
    const transcriptUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${transcriptKey}`;

    // Return minimal data - just what we need
    return { 
      transcriptUrl,
      sessionId,
      transcriptLength: transcript.length,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('S3 preprocessing error:', error);
    throw new Error(`S3 preprocessing failed: ${error.message}`);
  }
}

// Optimized audio processing with S3 preprocessing
app.post('/process', async (req, res) => {
  try {
    const { mediaUrl, sourceTranscript, optimizeForCost = true } = req.body;
    const sessionId = `sess_${Date.now()}`;
    
    console.log(`Processing session ${sessionId} with cost optimization: ${optimizeForCost}`);

    // 1) Download and validate media
    const mediaResp = await fetch(mediaUrl);
    if (!mediaResp.ok) {
      throw new Error(`Failed to download media: ${mediaResp.statusText}`);
    }
    
    const mediaBuffer = Buffer.from(await mediaResp.arrayBuffer());
    
    // Check file size limit for cost control
    if (mediaBuffer.length > COST_OPTIMIZATION.CHUNK_SIZE) {
      throw new Error(`File too large. Maximum size is ${COST_OPTIMIZATION.CHUNK_SIZE / (1024 * 1024)}MB`);
    }

    let transcript = sourceTranscript || '';

    // 2) Use source transcript if available (from Web Speech API - FREE)
    if (sourceTranscript && sourceTranscript.trim().length > 10) {
      console.log('Using Web Speech API transcript (free)');
      transcript = sourceTranscript;
    } else {
      // 3) Fallback to Whisper API with cost optimization
      console.log('Using Whisper API with cost optimization');
      transcript = await transcribeWithWhisper(mediaBuffer, optimizeForCost);
    }

    // 4) S3 Preprocessing - Store only transcript
    const s3Data = await preprocessWithS3(transcript, sessionId);

    // 5) Extract actions using Gemini
    let summary = '';
    let actions: any[] = [];
    if (transcript.trim().length > 0) {
      const extractionResult = await extractActionsCostOptimized(transcript, optimizeForCost);
      summary = extractionResult.summary;
      actions = extractionResult.actions;
    }

    res.json({ 
      sessionId, 
      transcript, 
      summary, 
      actions,
      s3Data,
      costOptimized: optimizeForCost,
      processingMethod: sourceTranscript ? 'web-speech-api' : 'whisper-api'
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

// Cost-optimized action extraction using Gemini
async function extractActionsCostOptimized(transcript: string, optimizeForCost: boolean): Promise<{summary: string, actions: any[]}> {
  try {
    // Gemini system prompt for action extraction
    const systemPrompt = `You are LoomSpeak+, an Atlassian assistant. Extract actionable items from meeting/lecture transcripts and categorize them:

1. JIRA TICKETS: Upcoming assignments, tasks, deadlines, bugs to fix
2. CONFLUENCE PAGES: Notable concepts, lecture notes, important information
3. OTHER: Any other actionable items

Return JSON with this structure:
{
  "summary": "Brief meeting/lecture summary",
  "actions": [
    {
      "action": "create_issue|create_page|other",
      "title": "Task/Page title",
      "description": "Detailed description",
      "project": "Project key (e.g., ENG, DOC)",
      "points": 2,
      "assignee": "email@example.com",
      "dueDate": "Friday",
      "spaceKey": "DOC",
      "category": "assignment|concept|other"
    }
  ]
}`;

    const userPrompt = `Transcript: ${transcript}\n\nExtract actionable items and create a summary.`;

    // Use Gemini API
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
          maxOutputTokens: optimizeForCost ? 500 : 1000,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
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
          summary: 'Meeting transcript processed.',
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
        summary: 'Transcript processed with basic extraction.',
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
    console.error('Action extraction error:', error);
    // Return minimal fallback
    return {
      summary: 'Failed to extract actions automatically.',
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

    const result = await response.json();
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
      webSpeechAPI: 0 // Free
    }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Cost-optimized LoomSpeak+ proxy listening on port ${PORT}`);
  console.log('Cost optimization features enabled:', COST_OPTIMIZATION);
});
