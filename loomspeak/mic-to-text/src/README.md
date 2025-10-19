# LoomSpeak Frontend Source

This directory contains the frontend source code for the LoomSpeak Mic-to-Text application.

## Files

- `index.html` - Main HTML file with Tailwind CSS styling
- `script.js` - JavaScript functionality for recording, transcription, and file uploads
- `README.md` - This documentation file

## Features

- 🎤 **Microphone Recording** - Real-time audio capture
- 🎵 **MP3 Conversion** - Client-side audio format conversion
- 📁 **File Upload** - Drag & drop audio file support
- 📝 **AI Transcription** - OpenAI Whisper integration
- 🎨 **Modern UI** - Beautiful Tailwind CSS design
- 📱 **Responsive** - Works on desktop and mobile

## Dependencies

- Tailwind CSS (CDN)
- Font Awesome (CDN)
- LameJS (CDN) - For MP3 encoding
- Web Audio API - For audio processing
- MediaRecorder API - For microphone recording

## Browser Support

- Chrome/Edge 47+
- Firefox 25+
- Safari 14+
- Mobile browsers with Web Audio API support

## Usage

The frontend is served by the Express server in the parent directory. Simply run:

```bash
npm start
```

Then open `http://localhost:3001` in your browser.
