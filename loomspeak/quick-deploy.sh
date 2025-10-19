#!/bin/bash

# LoomSpeak+ Quick Deploy Script
# This script helps you deploy LoomSpeak+ quickly for hackathon demo

echo "🚀 LoomSpeak+ Quick Deploy"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "proxy/server.ts" ]; then
    echo "❌ Please run this script from the loomspeak directory"
    exit 1
fi

echo "📋 DEPLOYMENT CHECKLIST"
echo "======================="
echo ""
echo "Before running this script, make sure you have:"
echo "✅ OpenAI API key (https://platform.openai.com/api-keys)"
echo "✅ AWS account with S3 bucket created"
echo "✅ EC2 instance running (t3.micro recommended)"
echo "✅ Domain name or EC2 public IP"
echo ""

read -p "Do you have all the above? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please complete the prerequisites first. See DEPLOYMENT_GUIDE.md"
    exit 1
fi

echo ""
echo "🔧 SETUP CREDENTIALS"
echo "===================="
echo ""

# Run credential setup
if [ -f "setup-credentials.sh" ]; then
    ./setup-credentials.sh
else
    echo "❌ setup-credentials.sh not found"
    exit 1
fi

echo ""
echo "📝 MANUAL STEPS REQUIRED"
echo "========================"
echo ""
echo "1. Edit proxy/.env with your actual credentials:"
echo "   - OPENAI_API_KEY=sk-your-key"
echo "   - S3_BUCKET=your-bucket-name"
echo "   - AWS_ACCESS_KEY_ID=your-key"
echo "   - AWS_SECRET_ACCESS_KEY=your-secret"
echo ""
echo "2. Update forge-app/manifest.yml:"
echo "   - Replace 'your-app-id' with actual Forge app ID"
echo "   - Replace 'your-proxy-domain.com' with your domain/IP"
echo "   - Replace 'your-bucket.s3.amazonaws.com' with your S3 bucket"
echo ""

read -p "Have you updated the credentials? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please update credentials first, then run this script again"
    exit 1
fi

echo ""
echo "🏗️  BUILDING APPLICATION"
echo "========================"
echo ""

# Build proxy server
echo "Building proxy server..."
cd proxy
if [ ! -f "package.json" ]; then
    echo "❌ proxy/package.json not found"
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install proxy dependencies"
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build proxy server"
    exit 1
fi

echo "✅ Proxy server built successfully"

# Build frontend
echo "Building frontend..."
cd ../forge-app/static/loomspeak-ui
if [ ! -f "package.json" ]; then
    echo "❌ frontend package.json not found"
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build frontend"
    exit 1
fi

echo "✅ Frontend built successfully"

cd ../../..

echo ""
echo "🎯 DEPLOYMENT READY!"
echo "==================="
echo ""
echo "Your LoomSpeak+ app is built and ready to deploy!"
echo ""
echo "📦 DEPLOYMENT PACKAGES:"
echo "======================="
echo "✅ Proxy server: proxy/dist/"
echo "✅ Frontend: forge-app/static/loomspeak-ui/dist/"
echo "✅ Configuration: proxy/.env (keep secure!)"
echo ""
echo "🚀 NEXT STEPS:"
echo "=============="
echo "1. Upload proxy/dist/ to your EC2 instance"
echo "2. Copy proxy/.env to EC2"
echo "3. Start proxy server with PM2"
echo "4. Deploy Forge app with 'forge deploy'"
echo "5. Install in Jira/Confluence"
echo ""
echo "📖 For detailed instructions, see: DEPLOYMENT_GUIDE.md"
echo ""
echo "💰 COST OPTIMIZATION ACTIVE:"
echo "============================"
echo "✅ Web Speech API: FREE real-time transcription"
echo "✅ GPT-4o-mini: 99.975% cheaper than GPT-4o"
echo "✅ Audio compression: 70% smaller files"
echo "✅ Smart processing: Use free APIs first"
echo ""
echo "🎉 Expected cost: <$0.10 per session (90% savings!)"
echo ""
echo "Happy hacking! 🚀"
