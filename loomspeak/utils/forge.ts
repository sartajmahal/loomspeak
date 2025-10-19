import axios from 'axios';

/**
 * Interface for Forge bot action parameters
 */
type ForgeAction = {
  type: 'jira' | 'confluence' | 'bitbucket';
  data: any;
};

/**
 * Creates a JIRA issue using Forge
 */
async function createJiraIssue(title: string, description: string) {
  // For demo, return mock result if endpoint is missing
  if (!window.location.pathname.startsWith('/api/forge')) {
    return { key: 'DEMO-1' };
  }
  // TODO: Wire real Forge API here if endpoint is present
  // Example:
  // ...existing code...
  return { key: 'REAL-1' };
}

/**
 * Creates a Confluence page using Forge
 */
async function createConfluencePage(title: string, content: string) {
  // For demo, return mock result if endpoint is missing
  if (!window.location.pathname.startsWith('/api/forge')) {
    return { id: 'DEMO-PAGE-1' };
  }
  // TODO: Wire real Forge API here if endpoint is present
  // Example:
  // ...existing code...
  return { id: 'REAL-PAGE-1' };
}

/**
 * Executes Forge bot actions based on Gemini output
 */
export async function executeForgeActions(actions: ForgeAction[]): Promise<string> {
  const results = [];

  for (const action of actions) {
    try {
      let result;
      switch (action.type) {
        case 'jira':
          result = await createJiraIssue(action.data.title, action.data.description);
          results.push(`Created JIRA issue: ${result.key}`);
          break;
        case 'confluence':
          result = await createConfluencePage(action.data.title, action.data.content);
          results.push(`Created Confluence page: ${result.id}`);
          break;
        // Add more cases for other Forge actions
      }
    } catch (error) {
      console.error(`Error executing ${action.type} action:`, error);
      results.push(`Failed to execute ${action.type} action`);
    }
  }

  return results.join('\n');
}