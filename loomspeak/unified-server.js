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
    // If an original filename exists (uploads), preserve it; otherwise create a recording filename
    if (file && typeof file.originalname === 'string' && file.originalname.trim().length > 0) {
      cb(null, file.originalname);
      return;
    }
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

// Serve Model Output static files and friendly route
app.use('/model-output', express.static(path.join(__dirname, 'model-output')));
app.get('/model-output', (req, res) => {
  res.sendFile(path.join(__dirname, 'model-output/index.html'));
});

// Serve specific static files from root for the app
app.get('/script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'mic-to-text/src/script.js'));
});

// Logout route - clear auth cookie and return to OAuth landing
app.get('/logout', (req, res) => {
  try {
    res.clearCookie('oauth_code');
  } catch (_) {}
  res.redirect('/');
});

// Root route - redirect to OAuth login
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>LoomSpeak - Voice to Work</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        /* Subtle white background with blue-toned grid */
        .bg-grid {
          background-image: linear-gradient(to right, rgba(0,82,204,.06) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0,82,204,.06) 1px, transparent 1px);
          background-size: 22px 22px;
        }
        /* Soft blue radial accents that keep background white */
        .radial-fade {
          background:
            radial-gradient(700px 320px at 85% -10%, rgba(0,82,204,0.10), transparent 60%),
            radial-gradient(600px 280px at 15% 110%, rgba(14,165,233,0.08), transparent 60%),
            radial-gradient(500px 240px at 50% -5%, rgba(2,132,199,0.06), transparent 60%);
        }
      </style>
    </head>
    <body class="min-h-screen bg-white text-slate-800 bg-grid radial-fade">
      <div class="max-w-5xl mx-auto px-6 py-14">
        <!-- Hero header -->
        <div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="absolute inset-0 pointer-events-none" aria-hidden="true" style="background:
              radial-gradient(800px 350px at 20% -10%, rgba(0,82,204,0.10), transparent 60%),
              radial-gradient(700px 300px at 100% 120%, rgba(14,165,233,0.10), transparent 60%)"></div>
          <div class="relative px-10 py-16 text-center">
            <div class="text-6xl md:text-7xl font-extrabold tracking-tight text-[#0052CC] select-none">LoomSpeak</div>
            <p class="mt-5 text-slate-600 max-w-2xl mx-auto text-lg md:text-xl">Transform your voice into actionable work with AI-powered transcription and seamless Atlassian integration.</p>
            <div class="mt-9">
              <a href="/oauth/login" class="inline-flex items-center gap-2 rounded-lg bg-[#0052CC] px-7 py-3.5 text-white text-lg font-semibold shadow hover:bg-[#0747A6] transition">
                Connect with Atlassian
              </a>
            </div>
          </div>
        </div>

        <!-- Feature grid -->
        <div class="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="rounded-lg border border-slate-200 p-4">
                <div class="text-slate-900 font-medium">Record and transcribe voice notes</div>
                <div class="text-slate-500 text-sm mt-1">High-quality, cost-effective transcription</div>
                <div class="mt-3 h-1 w-16 bg-[#0052CC]/70 rounded"></div>
              </div>
              <div class="rounded-lg border border-slate-200 p-4">
                <div class="text-slate-900 font-medium">Create Jira issues</div>
                <div class="text-slate-500 text-sm mt-1">Turn actions into tickets in seconds</div>
                <div class="mt-3 h-1 w-16 bg-sky-500/70 rounded"></div>
              </div>
              <div class="rounded-lg border border-slate-200 p-4">
                <div class="text-slate-900 font-medium">Generate Confluence pages</div>
                <div class="text-slate-500 text-sm mt-1">Summaries, notes, and more</div>
                <div class="mt-3 h-1 w-16 bg-cyan-500/70 rounded"></div>
              </div>
              <div class="rounded-lg border border-slate-200 p-4">
                <div class="text-slate-900 font-medium">Seamless workspace integration</div>
                <div class="text-slate-500 text-sm mt-1">Use across your Atlassian tools</div>
                <div class="mt-3 h-1 w-16 bg-blue-400/70 rounded"></div>
              </div>
            </div>
          </div>
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
  
  console.log(`File saved: ${req.file.filename}`);
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

// Atlassian API endpoints
app.post('/api/create-jira-issue', async (req, res) => {
  try {
    const { title, description, projectKey = 'ENG' } = req.body;
    const token = process.env.ATLASSIAN_TOKEN;
    const cloudId = process.env.ATLASSIAN_CLOUD_ID;
    
    if (!token || !cloudId) {
      return res.status(500).json({ error: 'Atlassian configuration missing' });
    }

    const response = await axios.post(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`, {
      fields: {
        project: { key: projectKey },
        summary: title,
        description: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: description || ''
            }]
          }]
        },
        issuetype: { name: 'Task' }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Jira creation error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }
});

app.post('/api/create-confluence-page', async (req, res) => {
  try {
    const { title, content, spaceId = 'DOC' } = req.body;
    const token = process.env.ATLASSIAN_TOKEN;
    const cloudId = process.env.ATLASSIAN_CLOUD_ID;
    
    if (!token || !cloudId) {
      return res.status(500).json({ error: 'Atlassian configuration missing' });
    }

    const response = await axios.post(`https://api.atlassian.com/ex/confluence/${cloudId}/wiki/api/v2/pages`, {
      spaceId: spaceId,
      title: title,
      body: {
        representation: 'storage',
        value: `<h2>${title}</h2><p>${content || ''}</p>`
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Confluence creation error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
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
      recordings: 'available',
      atlassian: 'available'
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
