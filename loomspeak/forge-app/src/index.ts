import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { storage } from '@forge/api';

const resolver = new Resolver();

// Workspace Discovery Functions
resolver.define('getWorkspaces', async () => {
  try {
    // Get Jira projects
    const jiraRes = await api.asApp().requestJira(route`/rest/api/3/project`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const jiraProjects = await jiraRes.json();

    // Get Confluence spaces
    const confRes = await api.asApp().requestConfluence(route`/wiki/api/v2/spaces`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const confSpaces = await confRes.json();

    return {
      jiraProjects: jiraProjects.values || [],
      confluenceSpaces: confSpaces.results || []
    };
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return { jiraProjects: [], confluenceSpaces: [] };
  }
});

// Rovo Agent Integration Functions
resolver.define('analyzeWithRovo', async ({ payload }) => {
  const { transcript, workspaceContext, command } = payload;
  
  try {
    // Use Rovo's built-in agents for content analysis
    const rovoPrompt = `Analyze this transcript: "${transcript}"
    
Workspace Context: ${JSON.stringify(workspaceContext)}
User Command: ${command}

Extract actionable items and create appropriate Jira tickets and Confluence pages.`;

    // This would integrate with Rovo's API when available
    // For now, we'll return structured data that Gemini can process
    return {
      analysis: rovoPrompt,
      suggestedActions: [],
      workspaceRecommendations: workspaceContext
    };
  } catch (error) {
    console.error('Rovo analysis error:', error);
    throw new Error('Failed to analyze with Rovo');
  }
});

resolver.define('createJiraIssue', async ({ payload }) => {
  const { projectKey, summary, description, points, assigneeAccountId, issueTypeName = 'Task' } = payload;
  const body: any = {
    fields: {
      project: { key: projectKey },
      summary,
      description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ text: description || '', type: 'text' }] }] },
      issuetype: { name: issueTypeName },
    }
  };
  if (points !== undefined) body.fields['customfield_10004'] = points; // Adjust to your instance's Story Points custom field
  if (assigneeAccountId) body.fields['assignee'] = { id: assigneeAccountId };

  const res = await api.asApp().requestJira(route`/rest/api/3/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Jira create failed: ${JSON.stringify(data)}`);
  return data; // { id, key, self }
});

resolver.define('createConfluencePage', async ({ payload }) => {
  const { spaceKey, title, bodyHtml, parentId } = payload;
  const pageBody = {
    type: 'page',
    title,
    space: { key: spaceKey },
    body: {
      storage: { value: bodyHtml, representation: 'storage' }
    }
  };
  if (parentId) pageBody['ancestors'] = [{ id: parentId }];
  const res = await api.asApp().requestConfluence(route`/wiki/api/v2/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pageBody)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Confluence create failed: ${JSON.stringify(data)}`);
  return data;
});

resolver.define('searchWorkspaceContent', async ({ payload }) => {
  const { query, workspaceType, workspaceKey } = payload;
  
  try {
    if (workspaceType === 'jira') {
      // Search Jira issues in the project
      const res = await api.asApp().requestJira(route`/rest/api/3/search?jql=project=${workspaceKey} AND text ~ "${query}"`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return await res.json();
    } else if (workspaceType === 'confluence') {
      // Search Confluence content in the space
      const res = await api.asApp().requestConfluence(route`/wiki/api/v2/pages?spaceKey=${workspaceKey}&title=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return await res.json();
    }
  } catch (error) {
    console.error('Workspace search error:', error);
    return { results: [] };
  }
});

resolver.define('saveSessionLinks', async ({ payload }) => {
  const { sessionId, relatedIssues = [], relatedPages = [], meta = {} } = payload;
  await storage.set(`session:${sessionId}`, { relatedIssues, relatedPages, meta, updatedAt: new Date().toISOString() });
  return { ok: true };
});

export const run = resolver.getDefinitions();
