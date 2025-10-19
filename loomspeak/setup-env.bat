@echo off
echo Setting up environment file for LoomSpeak...

REM Create .env file
echo # Atlassian OAuth Configuration > .env
echo ATLASSIAN_CLIENT_ID=your-actual-client-id-here >> .env
echo ATLASSIAN_CLIENT_SECRET=ATOAKuLzdwSa_bT6CmbOF6FzRbtFfNg-HeeLJZ_9oTktR-P7xu7hfONp4dYivn6EdJOu21665A52 >> .env
echo. >> .env
echo # OpenAI API Key (for transcription) >> .env
echo OPENAI_API_KEY=your-openai-api-key-here >> .env
echo. >> .env
echo # Server Configuration >> .env
echo PORT=8080 >> .env
echo NODE_ENV=development >> .env

echo.
echo ✅ .env file created!
echo.
echo 🔧 Next steps:
echo 1. Edit the .env file and replace "your-actual-client-id-here" with your Atlassian app's Client ID
echo 2. Replace "your-openai-api-key-here" with your OpenAI API key (if you want transcription)
echo 3. Make sure your Atlassian app has the redirect URI: http://localhost:8080/oauth/callback
echo.
echo 📝 Your Atlassian app should be configured with:
echo    - Redirect URI: http://localhost:8080/oauth/callback
echo    - Scopes: read:jira-work, write:jira-work, read:me, read:account, write:confluence-content, read:confluence-content.summary, read:confluence-space.summary
echo.
pause
