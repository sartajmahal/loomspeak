# LoomSpeak Unified Server

A unified server that combines OAuth authentication with speak-to-text functionality on port 8080.

## Features

- 🔐 **OAuth Integration**: Atlassian OAuth flow for authentication
- 🎤 **Voice Recording**: Record audio directly in the browser
- 📝 **Speech-to-Text**: Transcribe audio using OpenAI Whisper
- 📁 **File Upload**: Upload existing audio files for transcription
- 💾 **File Management**: Save and manage recorded audio files

## Quick Start

### 1. Setup

Run the setup script:

**Windows:**
```bash
setup-unified.bat
```

**Linux/Mac:**
```bash
./setup-unified.sh
```

### 2. Configure Environment

Edit the `.env` file and add your credentials:

```env
# Atlassian OAuth Configuration
ATLASSIAN_CLIENT_SECRET=your-client-secret-here

# OpenAI API Key (for transcription)
OPENAI_API_KEY=your-openai-api-key-here

# Server Configuration
PORT=8080
NODE_ENV=development
```

### 3. Start the Server

```bash
npm start
```

### 4. Access the Application

Open your browser to: `http://localhost:8080`

## How It Works

1. **Initial Access**: When you visit `http://localhost:8080`, you'll see the speak-to-text interface
2. **OAuth Flow**: The OAuth component handles Atlassian authentication in the background
3. **Recording**: Use the microphone to record audio or upload existing files
4. **Transcription**: Audio is processed and transcribed to text using OpenAI Whisper
5. **File Management**: Recorded files are saved and can be managed through the interface

## API Endpoints

- `GET /` - Main speak-to-text interface
- `POST /oauth/token` - OAuth token exchange
- `POST /save-mp3` - Save recorded audio
- `POST /transcribe` - Transcribe audio to text
- `GET /recordings` - List saved recordings
- `DELETE /recordings/:filename` - Delete a recording
- `GET /health` - Health check

## OAuth Configuration

The OAuth flow is configured to work with Atlassian Connect apps:

- **Client ID**: `7VHXeIMHZGsgezYQa2peL0JVfEnfi2gJ`
- **Redirect URI**: `http://localhost:8080`
- **Scopes**: Jira work, Confluence content, user profile

## File Structure

```
loomspeak/
├── unified-server.js          # Main server file
├── package.json               # Dependencies
├── env.example               # Environment template
├── setup-unified.bat         # Windows setup script
├── setup-unified.sh          # Linux/Mac setup script
├── mic-to-text/              # Speak-to-text functionality
│   ├── src/                  # Frontend files
│   ├── recordings/           # Saved audio files
│   └── transcribe-cli.js     # Transcription processor
└── forge-app/                # Original OAuth components
```

## Troubleshooting

### OAuth Issues
- Ensure your Atlassian app is configured with the correct redirect URI
- Check that the client secret is correctly set in the `.env` file
- Verify the OAuth scopes are properly configured

### Transcription Issues
- Ensure OpenAI API key is valid and has sufficient credits
- Check that audio files are in supported formats (MP3, WAV, M4A, OGG)
- Verify the transcribe-cli.js file exists and is executable

### File Upload Issues
- Check that the recordings directory exists and is writable
- Ensure file size is under 25MB limit
- Verify audio file format is supported

## Development

To run in development mode with auto-restart:

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2
3. Configure proper logging and monitoring
4. Set up SSL/TLS for secure OAuth flow
5. Update OAuth redirect URIs to your production domain
