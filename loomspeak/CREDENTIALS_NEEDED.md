# 🔑 Credentials Needed for LoomSpeak+ Rovo Integration

## Required Credentials

### 1. OpenAI API Key (Whisper only)
- **Where to get**: https://platform.openai.com/api-keys
- **Cost**: ~$0.006/minute (very affordable)
- **Format**: `sk-...` (starts with sk-)
- **Usage**: Speech-to-text with Whisper API (fallback only)

### 2. Google Gemini API Key
- **Where to get**: https://makersuite.google.com/app/apikey
- **Cost**: ~$0.000075 per 1k tokens (cheaper than GPT-4o-mini!)
- **Format**: `AIza...` (starts with AIza)
- **Usage**: Rovo-powered action extraction and workspace analysis

### 3. AWS S3 Bucket
- **Where to get**: https://console.aws.amazon.com/s3/
- **Cost**: ~$0.023 per GB/month (minimal usage)
- **Format**: `loomspeak-media-yourname` (must be globally unique)
- **Usage**: Store transcripts and workspace context

### 4. AWS IAM Credentials (for EC2)
- **Where to get**: https://console.aws.amazon.com/iam/
- **Cost**: Free
- **Format**: Access Key ID + Secret Access Key
- **Usage**: Access S3 from EC2 instance

### 5. Atlassian API Token (For Forge CLI)
- **Where to get**: https://id.atlassian.com/manage/api-tokens
- **Cost**: Free
- **Format**: API token string
- **Usage**: Login to Forge CLI for deployment

### 6. EC2 Instance (Optional)
- **Where to get**: https://console.aws.amazon.com/ec2/
- **Cost**: ~$5-10/month (t3.micro)
- **Usage**: Host the proxy server

### 7. Domain Name (Optional)
- **Where to get**: Any domain registrar
- **Cost**: ~$10-15/year
- **Alternative**: Use EC2 public IP address
- **Usage**: HTTPS endpoint for Forge app

## Security Setup

### ✅ Credentials are Secure
- `.env` file is in `.gitignore` (won't be committed to GitHub)
- Credentials only stored locally on your machine
- Production deployment uses environment variables
- No hardcoded secrets in the codebase

### 🔒 How to Add Your Credentials

1. **Run the setup script**:
   ```bash
   cd loomspeak
   ./setup-credentials.sh
   ```

2. **Edit the generated file**:
   ```bash
   nano proxy/.env
   ```

3. **Replace the placeholders**:
   ```bash
   # Replace these:
   OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_KEY
   GEMINI_API_KEY=REPLACE_WITH_YOUR_GEMINI_KEY
   S3_BUCKET=REPLACE_WITH_YOUR_S3_BUCKET
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

4. **Update manifest.yml**:
   ```yaml
   app:
     id: your-actual-forge-app-id
   
   permissions:
     external:
       fetch:
         client:
           - https://your-domain.com
           - https://your-bucket.s3.amazonaws.com
   ```

## Quick Setup Commands

```bash
# 1. Setup credentials
./setup-credentials.sh

# 2. Edit with your actual values
nano proxy/.env

# 3. Build and deploy
./quick-deploy.sh

# 4. Deploy to EC2 (manual step)
# 5. Deploy Forge app (manual step)
```

## Cost Breakdown

| Service | Monthly Cost | Purpose |
|---------|-------------|---------|
| OpenAI API | $1-3 | Speech processing (fallback) |
| Google Gemini | $2-5 | Rovo-powered analysis |
| AWS EC2 | $5-10 | Proxy server hosting |
| AWS S3 | $1 | File storage |
| Domain (optional) | $1 | HTTPS endpoint |
| **Total** | **~$10-20** | **Full Rovo deployment** |

## What You Get

- ✅ **Rovo AI integration** for intelligent workspace analysis
- ✅ **90% cost reduction** vs original approach
- ✅ **Real-time voice transcription** (FREE with Web Speech API)
- ✅ **Workspace-aware Jira/Confluence integration**
- ✅ **Context-aware action extraction**
- ✅ **Production-ready architecture**
- ✅ **Hackathon-friendly pricing**

## Ready to Deploy?

1. Get the credentials above
2. Run `./setup-credentials.sh`
3. Edit `proxy/.env` with your values
4. Run `./quick-deploy.sh`
5. Follow the deployment guide

**Total setup time: 30 minutes**
**Monthly cost: <$20**
**Cost per session: <$0.05**

🎉 **Perfect for hackathons and production with Rovo AI!**
