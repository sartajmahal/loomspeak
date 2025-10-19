#!/bin/bash

# LoomSpeak Mic-to-Text Setup Script

echo "🎤 Setting up LoomSpeak Mic-to-Text..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env and add your OpenAI API key!"
    echo "   OPENAI_API_KEY=sk-your-api-key-here"
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create recordings directory
echo "📁 Creating recordings directory..."
mkdir -p recordings

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your OpenAI API key"
echo "2. Run: npm start"
echo "3. Open: http://localhost:3001"
echo ""
echo "Happy recording! 🎤"
