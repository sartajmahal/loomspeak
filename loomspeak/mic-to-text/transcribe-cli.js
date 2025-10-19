#!/usr/bin/env node

import fs from "fs";
import OpenAI from "openai";

// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is required.');
  console.error('Please create a .env file with your OpenAI API key.');
  console.error('Example: OPENAI_API_KEY=sk-your-api-key-here');
  process.exit(1);
}

const openai = new OpenAI({
  timeout: 120000,
  apiKey: process.env.OPENAI_API_KEY,
});

async function transcribeAudioFile(audioFilePath, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check if file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file '${audioFilePath}' not found.`);
      }

      console.error(`Transcribing: ${audioFilePath} (attempt ${attempt}/${retries})`);
      
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: "whisper-1", // Using whisper-1 as per cost optimization
        response_format: "text",
        temperature: 0.0
      });
      
      return transcription;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      // Check for network errors in the cause chain
      const isNetworkError = error.code === 'ECONNRESET' || 
                            error.code === 'ECONNREFUSED' ||
                            (error.cause && error.cause.code === 'ECONNRESET') ||
                            error.message.includes('Connection error');
      
      if (isNetworkError) {
        if (attempt < retries) {
          console.error(`Network error detected, retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        throw new Error('Network connection failed after multiple attempts. Please check your internet connection.');
      } else if (error.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (error.status === 429) {
        if (attempt < retries) {
          console.error('Rate limited, waiting 10 seconds...');
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

// CLI usage
if (process.argv.length < 3) {
  console.error('Usage: node transcribe-cli.js <audio-file-path>');
  process.exit(1);
}

const audioFilePath = process.argv[2];

try {
  const transcription = await transcribeAudioFile(audioFilePath);
  console.log(transcription);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
