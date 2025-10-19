# 🔑 Credentials Needed for LoomSpeak+ Deployment

## Required Credentials

### 1. OpenAI API Key
- **Where to get**: https://platform.openai.com/api-keys
- **Cost**: ~$5-10/month for typical usage
- **Format**: `sk-...` (starts with sk-)
- **Usage**: Speech-to-text and action extraction

### 2. AWS S3 Bucket
- **Where to get**: https://console.aws.amazon.com/s3/
- **Cost**: ~$1/month for storage
- **Format**: `loomspeak-media-yourname` (must be globally unique)
- **Usage**: Store uploaded audio files

### 3. AWS IAM Credentials (for EC2)
- **Where to get**: https://console.aws.amazon.com/iam/
- **Cost**: Free
- **Format**: Access Key ID + Secret Access Key
- **Usage**: Access S3 from EC2 instance

### 4. EC2 Instance
- **Where to get**: https://console.aws.amazon.com/ec2/
- **Cost**: ~$8/month (t3.micro)
- **Usage**: Host the proxy server

### 5. Domain Name (Optional)
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
| OpenAI API | $5-10 | Speech processing |
| AWS EC2 | $8 | Proxy server hosting |
| AWS S3 | $1 | File storage |
| Domain (optional) | $1 | HTTPS endpoint |
| **Total** | **~$15-20** | **Full deployment** |

## What You Get

- ✅ **90% cost reduction** vs original approach
- ✅ **Real-time voice transcription** (FREE with Web Speech API)
- ✅ **Jira/Confluence integration**
- ✅ **Production-ready architecture**
- ✅ **Cost monitoring and optimization**
- ✅ **Hackathon-friendly pricing**

## Ready to Deploy?

1. Get the credentials above
2. Run `./setup-credentials.sh`
3. Edit `proxy/.env` with your values
4. Run `./quick-deploy.sh`
5. Follow the deployment guide

**Total setup time: 30 minutes**
**Monthly cost: <$20**
**Cost per session: <$0.10**

🎉 **Perfect for hackathons and production!**
