
// If GOOGLE_APPLICATION_CREDENTIALS is set, you can wire real Gemini API here
// Otherwise, use a mock output for demo

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
  // If GOOGLE_APPLICATION_CREDENTIALS is set, wire real Gemini API here
  // For demo, use a simple heuristic
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Mock: extract first assignment and concept
    const assignmentMatch = text.match(/assignment\s*(\d+)/i);
    const conceptMatch = text.match(/concept:\s*([\w\s]+)/i);
    const actions: ProcessedOutput['actions'] = [];
    if (assignmentMatch) {
      actions.push({
        type: 'jira',
        data: {
          title: `Assignment ${assignmentMatch[1]}`,
          description: 'Auto-extracted from transcript.'
        }
      });
    }
    if (conceptMatch) {
      actions.push({
        type: 'confluence',
        data: {
          title: conceptMatch[1].trim(),
          content: 'Auto-extracted from transcript.'
        }
      });
    }
    return { actions };
  }
  // TODO: Wire real Gemini API here if credentials are present
  // Example:
  // const genAI = new GoogleGenerativeAI(apiKeyOrToken);
  // ...
  // return parsedResult as ProcessedOutput;
  return { actions: [] };
}

/**
 * Formats Forge bot output into a user-friendly summary
 * @param forgeOutput - The output from Forge bot actions
 * @returns A concise summary of created resources
 */
export async function summarizeWithGemini(forgeOutput: string): Promise<string> {
  // For demo, just return a simple summary
  return `Created resources: ${forgeOutput}`;
}