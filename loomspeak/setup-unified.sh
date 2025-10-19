#!/bin/bash

echo "🚀 Setting up LoomSpeak Unified Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version 14+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file and add your Atlassian client secret and OpenAI API key"
fi

# Create recordings directory
echo "📁 Creating recordings directory..."
mkdir -p mic-to-text/recordings

echo "✅ Setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit .env file and add your credentials:"
echo "   - ATLASSIAN_CLIENT_SECRET (from your Atlassian app)"
echo "   - OPENAI_API_KEY (for transcription)"
echo ""
echo "2. Start the server:"
echo "   npm start"
echo ""
echo "3. Open your browser to:"
echo "   http://localhost:8080"
echo ""
echo "🎤 The server will handle OAuth flow and then redirect to the speak-to-text interface!"
