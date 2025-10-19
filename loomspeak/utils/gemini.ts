import { GoogleGenerativeAI } from '@google/generative-ai';

import { GoogleAuth } from 'google-auth-library';

// Initialize auth client
const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAccessToken } from './google-auth';

let genAI: GoogleGenerativeAI;

async function initializeGenAI() {
  const accessToken = await getAccessToken();
  genAI = new GoogleGenerativeAI(accessToken);
}

type ProcessedOutput = {
  actions: Array<{
    type: 'jira' | 'confluence';
    data: {
      title: string;
      content?: string;
      description?: string;
    };
  }>;
};

/**
 * Processes transcribed text using Google's Gemini API
 * @param text - The transcribed text to process
 * @returns Structured output for Forge bot actions
 */
export async function processWithGemini(text: string): Promise<ProcessedOutput> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze the following lecture transcript and identify:
    1. Upcoming assignments or tasks (format as JIRA tickets)
    2. Notable concepts or topics (format as Confluence pages)
    3. Any other relevant actions

    Transcript:
    ${text}

    Please format the output as structured JSON with the following keys:
    {
      "jiraTickets": [],
      "confluencePages": [],
      "otherActions": []
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResult = response.text();
    
    // Parse the JSON response
    const parsedResult = JSON.parse(textResult);
    return parsedResult as ProcessedOutput;
  } catch (error) {
    console.error('Error processing with Gemini:', error);
    throw error;
  }
}

/**
 * Formats Forge bot output into a user-friendly summary
 * @param forgeOutput - The output from Forge bot actions
 * @returns A concise summary of created resources
 */
export async function summarizeWithGemini(forgeOutput: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Summarize the following Forge bot output into a single sentence that describes
    the created resources and their purposes. Keep it concise and informative.

    Output:
    ${forgeOutput}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error summarizing with Gemini:', error);
    throw error;
  }
}