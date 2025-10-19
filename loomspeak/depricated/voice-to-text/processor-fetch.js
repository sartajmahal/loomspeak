import fs from "fs";

// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is required.');
  console.error('Please create a .env file with your OpenAI API key.');
  console.error('Example: OPENAI_API_KEY=sk-your-api-key-here');
  process.exit(1);
}

export async function transcribeAudioFetch(audioFilePath, retries = 3) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check if file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      console.log(`Transcribing with fetch: ${audioFilePath} (attempt ${attempt}/${retries})`);
      
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(audioFilePath);
      const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });
      formData.append('file', blob, 'audio.mp3');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');
      formData.append('temperature', '0.0');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const transcription = await response.text();
      return transcription.trim();
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      // Check for network errors
      const isNetworkError = error.code === 'ECONNRESET' || 
                            error.code === 'ECONNREFUSED' ||
                            error.message.includes('fetch failed') ||
                            error.message.includes('timeout');
      
      if (isNetworkError) {
        if (attempt < retries) {
          console.log(`Network error detected, retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        throw new Error('Network connection failed after multiple attempts. Please check your internet connection.');
      } else if (error.message.includes('401')) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (error.message.includes('429')) {
        if (attempt < retries) {
          console.log('Rate limited, waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }
        throw new Error('Rate limit exceeded. Please wait and try again later.');
      }
      
      // For other errors, don't retry
      throw error;
    }
  }
}
