@echo off
echo 🚀 Setting up LoomSpeak Unified Server...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 14+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ⚠️  Please edit .env file and add your Atlassian client secret and OpenAI API key
)

REM Create recordings directory
echo 📁 Creating recordings directory...
if not exist mic-to-text\recordings mkdir mic-to-text\recordings

echo ✅ Setup complete!
echo.
echo 🔧 Next steps:
echo 1. Edit .env file and add your credentials:
echo    - ATLASSIAN_CLIENT_SECRET (from your Atlassian app)
echo    - OPENAI_API_KEY (for transcription)
echo.
echo 2. Start the server:
echo    npm start
echo.
echo 3. Open your browser to:
echo    http://localhost:8080
echo.
echo 🎤 The server will handle OAuth flow and then redirect to the speak-to-text interface!
pause
