# Mic to MP3 + Transcription

An enhanced web application that captures microphone input, saves MP3 files, and automatically transcribes them to text using OpenAI's Whisper API.

## Features

- 🎤 **Microphone Recording** - Capture audio from your microphone
- 🎵 **MP3 Conversion** - Automatically converts recordings to MP3 format
- 💾 **Auto-Save** - Files are automatically saved to the `./recordings/` folder
- 📝 **Text Transcription** - Convert recorded audio to text using OpenAI Whisper
- 🌐 **Web Interface** - Clean, responsive web UI with transcription display
- 📁 **File Management** - View, play, download, and delete recordings

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Install CLI Dependencies**
   ```bash
   cp package-cli.json package.json
   npm install
   cp package.json package-cli.json
   ```

3. **Set OpenAI API Key** (Required)
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env and add your OpenAI API key
   # OPENAI_API_KEY=sk-your-api-key-here
   ```

4. **Start the Server**
   ```bash
   npm start
   ```

5. **Open in Browser**
   - Go to `http://localhost:3001`
   - Allow microphone access when prompted
   - Start recording and transcribing!

## Usage

1. **Record Audio**
   - Click "Start Recording"
   - Speak into your microphone
   - Click "Stop Recording" when done
   - The MP3 file will be automatically saved

2. **Transcribe to Text**
   - After recording, click "Transcribe to Text"
   - Wait for the transcription to complete
   - View the transcribed text in the results section

3. **Manage Recordings**
   - Click "View All Recordings" to see saved files
   - Play, download, or delete recordings
   - Files are saved in the `./recordings/` folder

## File Structure

```
temp/
├── index.html              # Main recording + transcription interface
├── script.js              # Frontend JavaScript
├── server.js              # Express server with transcription
├── transcribe-cli.js      # CLI transcription processor
├── package.json           # Main dependencies
├── package-cli.json       # CLI dependencies
├── README.md              # This file
└── recordings/            # Auto-created folder for MP3 files
```

## API Endpoints

- `POST /save-mp3` - Save MP3 file to server
- `POST /transcribe` - Transcribe audio file to text
- `GET /recordings` - List all recordings
- `DELETE /recordings/:filename` - Delete a recording
- `GET /recordings/:filename` - Download/play a recording

## Technical Details

- **Audio Format**: MP3 (128kbps, 44.1kHz)
- **Transcription**: OpenAI Whisper-1 API
- **Browser Support**: Modern browsers with Web Audio API
- **Server**: Express.js with multer for file uploads
- **MP3 Encoding**: lamejs library for client-side conversion
- **Error Handling**: Retry logic for network issues and rate limits

## Troubleshooting

- **Microphone Access**: Make sure to allow microphone permissions
- **Transcription Errors**: Check your OpenAI API key and quota in the `.env` file
- **Missing API Key**: Make sure you've created a `.env` file with your OpenAI API key
- **File Save Issues**: Check that the server has write permissions to the recordings folder
- **Browser Compatibility**: Requires modern browser with Web Audio API support

## Cost Optimization

- Uses Whisper-1 model for cost-effective transcription
- Implements retry logic for network issues
- Handles rate limiting gracefully
- Optimized audio processing for smaller file sizes
