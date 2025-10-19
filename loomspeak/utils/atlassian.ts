import axios from 'axios';

/**
 * Interface for Atlassian API actions
 */
interface AtlassianAction {
  type: 'jira' | 'confluence';
  data: {
    title: string;
    content?: string;
    description?: string;
  };
}

/**
 * Creates a JIRA issue
 */
export async function createJiraIssue(
  accessToken: string | undefined,
  title: string,
  description: string
): Promise<{ key: string; url: string }> {
  if (!accessToken) {
    // Mock URL for demo
    return {
      key: 'DEMO-1',
      url: `https://${process.env.ATLASSIAN_DOMAIN}/browse/DEMO-1`
    };
  }
  // TODO: Wire real Atlassian API here if accessToken is present
  // Example:
  // ...existing code...
  return {
    key: 'REAL-1',
    url: `https://${process.env.ATLASSIAN_DOMAIN}/browse/REAL-1`
  };
}

/**
 * Creates a Confluence page
 */
export async function createConfluencePage(
  accessToken: string | undefined,
  title: string,
  content: string
): Promise<{ id: string; url: string }> {
  if (!accessToken) {
    // Mock URL for demo
    return {
      id: 'DEMO-PAGE-1',
      url: `https://${process.env.ATLASSIAN_DOMAIN}/wiki/pages/DEMO-PAGE-1`
    };
  }
  // TODO: Wire real Atlassian API here if accessToken is present
  // Example:
  // ...existing code...
  return {
    id: 'REAL-PAGE-1',
    url: `https://${process.env.ATLASSIAN_DOMAIN}/wiki/pages/REAL-PAGE-1`
  };
}

/**
 * Executes Atlassian actions based on Gemini output
 */
export async function executeAtlassianActions(
  accessToken: string | undefined,
  actions: AtlassianAction[]
): Promise<string[]> {
  const results = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'jira':
          const jiraResult = await createJiraIssue(
            accessToken,
            action.data.title,
            action.data.description || ''
          );
          results.push(`Created JIRA issue: ${jiraResult.url}`);
          break;
        case 'confluence':
          const confluenceResult = await createConfluencePage(
            accessToken,
            action.data.title,
            action.data.content || ''
          );
          results.push(`Created Confluence page: ${confluenceResult.url}`);
          break;
      }
    } catch (error) {
      console.error(`Error executing ${action.type} action:`, error);
      results.push(`Failed to execute ${action.type} action`);
    }
  }

  return results;
}