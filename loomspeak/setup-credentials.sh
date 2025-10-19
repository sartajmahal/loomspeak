#!/bin/bash

# LoomSpeak+ Credential Setup Script
# This script securely sets up your credentials without exposing them in git

echo "🚀 LoomSpeak+ Credential Setup"
echo "================================"

# Check if .env already exists
if [ -f "proxy/.env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp proxy/.env proxy/.env.backup
fi

# Create .env file with placeholders
cat > proxy/.env << 'EOF'
# OpenAI API Configuration
OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_KEY

# AWS Configuration  
AWS_REGION=us-west-2
S3_BUCKET=REPLACE_WITH_YOUR_S3_BUCKET

# Server Configuration
PORT=8080
PRESIGN_TTL_SECONDS=900

# Cost Optimization Settings
MAX_AUDIO_DURATION=600
TARGET_SAMPLE_RATE=16000
CHUNK_SIZE=26214400
USE_WHISPER_1=true
COMPRESS_AUDIO=true
BATCH_PROCESSING=true
EOF

echo "✅ Created proxy/.env file with placeholders"
echo ""
echo "📋 REQUIRED CREDENTIALS:"
echo "========================"
echo ""
echo "1. OpenAI API Key:"
echo "   - Go to: https://platform.openai.com/api-keys"
echo "   - Create a new API key"
echo "   - Replace 'REPLACE_WITH_YOUR_OPENAI_KEY' in proxy/.env"
echo ""
echo "2. AWS S3 Bucket:"
echo "   - Go to: https://console.aws.amazon.com/s3/"
echo "   - Create a new bucket (e.g., 'loomspeak-media-yourname')"
echo "   - Replace 'REPLACE_WITH_YOUR_S3_BUCKET' in proxy/.env"
echo ""
echo "3. AWS Credentials (for EC2 deployment):"
echo "   - Create IAM user with S3 permissions"
echo "   - Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
echo ""
echo "4. Forge App ID:"
echo "   - Run 'forge register' to get your app ID"
echo "   - Update manifest.yml with your app ID"
echo ""
echo "5. Domain (optional):"
echo "   - Get a domain or use EC2 public IP"
echo "   - Update manifest.yml external domains"
echo ""
echo "🔒 SECURITY NOTES:"
echo "=================="
echo "✅ .env file is in .gitignore (won't be committed)"
echo "✅ Credentials are only stored locally"
echo "✅ Use environment variables in production"
echo ""
echo "📝 NEXT STEPS:"
echo "=============="
echo "1. Edit proxy/.env with your actual credentials"
echo "2. Run: cd proxy && npm install"
echo "3. Run: npm run build"
echo "4. Deploy to AWS EC2"
echo "5. Update forge-app/manifest.yml with your domains"
echo "6. Deploy Forge app"
echo ""
echo "🎯 Ready to deploy! Run this script again anytime to reset credentials."
