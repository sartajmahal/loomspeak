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
  accessToken: string,
  title: string,
  description: string
): Promise<{ key: string; url: string }> {
  const response = await axios.post(
    `https://api.atlassian.com/ex/jira/${process.env.ATLASSIAN_DOMAIN}/rest/api/3/issue`,
    {
      fields: {
        project: {
          key: 'MAIN', // You'll need to specify your project key
        },
        summary: title,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: description }],
            },
          ],
        },
        issuetype: {
          name: 'Task',
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    key: response.data.key,
    url: `https://${process.env.ATLASSIAN_DOMAIN}/browse/${response.data.key}`,
  };
}

/**
 * Creates a Confluence page
 */
export async function createConfluencePage(
  accessToken: string,
  title: string,
  content: string
): Promise<{ id: string; url: string }> {
  const response = await axios.post(
    `https://api.atlassian.com/ex/confluence/${process.env.ATLASSIAN_DOMAIN}/rest/api/content`,
    {
      type: 'page',
      title,
      space: {
        key: 'MAIN', // You'll need to specify your space key
      },
      body: {
        storage: {
          value: content,
          representation: 'storage',
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    id: response.data.id,
    url: response.data._links.base + response.data._links.webui,
  };
}

/**
 * Executes Atlassian actions based on Gemini output
 */
export async function executeAtlassianActions(
  accessToken: string,
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
      results.push(`Failed to execute ${action.type} action: ${error.message}`);
    }
  }

  return results;
}