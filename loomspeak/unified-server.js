// Load environment variables
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './mic-to-text/recordings/');
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `recording-${timestamp}.mp3`);
  }
});

const upload = multer({ storage: storage });

// Create recordings directory if it doesn't exist
const recordingsDir = path.join(__dirname, 'mic-to-text/recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// OAuth Configuration
const CLIENT_ID = process.env.ATLASSIAN_CLIENT_ID || '7VHXeIMHZGsgezYQa2peL0JVfEnfi2gJ';
const CLIENT_SECRET = process.env.ATLASSIAN_CLIENT_SECRET || 'your-client-secret-here';
const REDIRECT_URI = 'http://localhost:8080/oauth/callback';

// Log OAuth configuration
console.log(`🔐 OAuth Configuration:`);
console.log(`   Client ID: ${CLIENT_ID}`);
console.log(`   Client Secret: ${CLIENT_SECRET ? '***configured***' : 'NOT SET'}`);
console.log(`   Redirect URI: ${REDIRECT_URI}`);

// OAuth token exchange endpoint
app.post('/oauth/token', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange code for token
    const tokenResponse = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    res.json({
      access_token,
      refresh_token,
      expires_in,
      token_type: 'Bearer'
    });

  } catch (error) {
    console.error('OAuth token exchange error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to exchange authorization code for token',
      details: error.response?.data || error.message
    });
  }
});

// OAuth login route
app.get('/oauth/login', (req, res) => {
  const SCOPES = [
    'read:jira-work',
    'write:jira-work',
    'read:me',
    'read:account',
    'write:confluence-content',
    'read:confluence-content.summary',
    'read:confluence-space.summary'
  ].join(' ');

  const AUTH_URL = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${Date.now()}&response_type=code&prompt=consent`;
  
  res.redirect(AUTH_URL);
});

// OAuth callback route
app.get('/oauth/callback', (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Authentication Error</h1>
          <p>No authorization code received. Please try again.</p>
          <a href="/oauth/login" style="background: #0052CC; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Try Again</a>
        </body>
      </html>
    `);
  }

  // Store the code in session/cookie and redirect to main app
  res.cookie('oauth_code', code, { httpOnly: true, secure: false });
  res.redirect('/app');
});

// Main app route - serve the speak-to-text interface after OAuth
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'mic-to-text/src/index.html'));
});

// Serve static files from mic-to-text src folder for the app route
app.use('/app', express.static(path.join(__dirname, 'mic-to-text/src')));

// Serve specific static files from root for the app
app.get('/script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'mic-to-text/src/script.js'));
});

// Root route - redirect to OAuth login
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LoomSpeak - Voice to Work</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Domine:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --warm-cream: #faf8f5;
                --soft-beige: #f5f1eb;
                --warm-gray: #8b7355;
                --sage-green: #9caf88;
                --deep-brown: #5d4e37;
                --warm-white: #fefcf9;
                --muted-blue: #6b7280;
                --muted-blue-light: #f3f4f6;
            }
            
            body {
                background: var(--warm-cream);
                font-family: 'Domine', serif;
                color: var(--deep-brown);
                line-height: 1.7;
                margin: 0;
                padding: 30px;
                font-weight: 400;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: var(--warm-white);
                border: 1px solid var(--sage-green);
                border-radius: 12px;
                padding: 50px;
                box-shadow: 0 4px 16px rgba(93, 78, 55, 0.08);
                text-align: center;
            }
            
            h1 {
                font-size: 2.6em;
                margin-bottom: 20px;
                color: var(--deep-brown);
                font-weight: 500;
            }
            
            h1::before {
                content: '';
                display: block;
                width: 60px;
                height: 2px;
                background: var(--muted-blue);
                margin: 0 auto 20px;
                border-radius: 1px;
            }
            
            p {
                font-size: 1.1em;
                margin-bottom: 30px;
                color: var(--warm-gray);
            }
            
            .login-btn {
                display: inline-block;
                padding: 15px 30px;
                background: var(--muted-blue);
                color: var(--warm-white);
                text-decoration: none;
                border-radius: 8px;
                font-size: 1.1em;
                font-weight: 500;
                transition: all 0.2s ease;
                border: none;
                cursor: pointer;
            }
            
            .login-btn:hover {
                background: var(--deep-brown);
                transform: translateY(-1px);
            }
            
            .features {
                margin-top: 40px;
                text-align: left;
            }
            
            .feature {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                font-size: 1em;
            }
            
            .feature::before {
                content: '🎤';
                margin-right: 10px;
                font-size: 1.2em;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>LoomSpeak</h1>
            <p>Transform your voice into actionable work items with AI-powered transcription and Atlassian integration.</p>
            
            <a href="/oauth/login" class="login-btn">Connect with Atlassian</a>
            
            <div class="features">
                <div class="feature">Record and transcribe voice notes</div>
                <div class="feature">Create Jira issues from transcriptions</div>
                <div class="feature">Generate Confluence pages</div>
                <div class="feature">Seamless Atlassian workspace integration</div>
            </div>
        </div>
    </body>
    </html>
  `);
});

// Mic-to-text endpoints (from the original server.js)
app.post('/save-mp3', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log(`MP3 file saved: ${req.file.filename}`);
  res.json({ 
    success: true, 
    filename: req.file.filename,
    message: `File saved as ${req.file.filename}`
  });
});

// Endpoint to transcribe audio
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }
  
  try {
    console.log(`Transcribing: ${req.file.filename}`);
    
    // Call the voice-to-text processor
    const transcript = await transcribeWithVoiceProcessor(req.file.path);
    
    res.json({ 
      success: true, 
      transcript: transcript,
      filename: req.file.filename
    });
    
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ 
      error: error.message || 'Transcription failed' 
    });
  }
});

// Function to call the voice-to-text processor
async function transcribeWithVoiceProcessor(audioFilePath) {
  return new Promise((resolve, reject) => {
    // Use the local CLI processor
    const processorPath = path.join(__dirname, 'mic-to-text/transcribe-cli.js');
    
    // Check if processor exists
    if (!fs.existsSync(processorPath)) {
      reject(new Error('Voice-to-text processor not found'));
      return;
    }
    
    // Convert absolute path to relative path for the transcribe-cli.js
    const relativePath = path.relative(path.join(__dirname, 'mic-to-text'), audioFilePath);
    
    console.log(`Transcription paths:`);
    console.log(`  Absolute path: ${audioFilePath}`);
    console.log(`  Relative path: ${relativePath}`);
    console.log(`  Working directory: ${path.join(__dirname, 'mic-to-text')}`);
    
    // Spawn Node.js process to run the processor
    const child = spawn('node', [processorPath, relativePath], {
      cwd: path.join(__dirname, 'mic-to-text')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        // Success - extract transcript from output
        const transcript = output.trim();
        if (transcript) {
          resolve(transcript);
        } else {
          reject(new Error('No transcription result received'));
        }
      } else {
        reject(new Error(`Transcription failed with code ${code}: ${errorOutput}`));
      }
    });
    
    child.on('error', (error) => {
      reject(new Error(`Failed to start transcription process: ${error.message}`));
    });
  });
}

// Serve recordings directory
app.use('/recordings', express.static(recordingsDir));

// Endpoint to list saved recordings
app.get('/recordings', (req, res) => {
  try {
    const files = fs.readdirSync(recordingsDir)
      .filter(file => file.endsWith('.mp3'))
      .map(file => ({
        filename: file,
        path: `./recordings/${file}`,
        size: fs.statSync(path.join(recordingsDir, file)).size
      }));
    
    res.json({ recordings: files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read recordings directory' });
  }
});

// Endpoint to delete a recording
app.delete('/recordings/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(recordingsDir, filename);
    
    // Security check - ensure file is in recordings directory
    if (!filePath.startsWith(path.resolve(recordingsDir))) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: `Deleted ${filename}` });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      oauth: 'available',
      transcription: 'available',
      recordings: 'available'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Unified LoomSpeak server running at http://localhost:${PORT}`);
  console.log(`📁 Recordings will be saved to: ${path.resolve(recordingsDir)}`);
  console.log(`🔐 OAuth redirect URI: ${REDIRECT_URI}`);
  console.log(`🎤 Voice-to-text processor: ${path.resolve('mic-to-text/transcribe-cli.js')}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /              - OAuth login interface`);
  console.log(`   GET  /oauth/login   - Start OAuth flow`);
  console.log(`   GET  /oauth/callback - OAuth callback handler`);
  console.log(`   GET  /app           - Speak-to-text interface (after OAuth)`);
  console.log(`   POST /oauth/token   - OAuth token exchange`);
  console.log(`   POST /save-mp3      - Save recorded audio`);
  console.log(`   POST /transcribe    - Transcribe audio to text`);
  console.log(`   GET  /recordings    - List saved recordings`);
  console.log(`   GET  /health        - Health check`);
});
