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
  try {
    const response = await axios.post('/api/forge/jira/create', {
      summary: title,
      description: description,
      type: 'Task'
    });
    return response.data;
  } catch (error) {
    console.error('Error creating JIRA issue:', error);
    throw error;
  }
}

/**
 * Creates a Confluence page using Forge
 */
async function createConfluencePage(title: string, content: string) {
  try {
    const response = await axios.post('/api/forge/confluence/create', {
      title,
      content
    });
    return response.data;
  } catch (error) {
    console.error('Error creating Confluence page:', error);
    throw error;
  }
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