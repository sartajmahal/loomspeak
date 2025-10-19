import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { storage } from '@forge/api';

const resolver = new Resolver();

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

resolver.define('saveSessionLinks', async ({ payload }) => {
  const { sessionId, relatedIssues = [], relatedPages = [], meta = {} } = payload;
  await storage.set(`session:${sessionId}`, { relatedIssues, relatedPages, meta, updatedAt: new Date().toISOString() });
  return { ok: true };
});

export const run = resolver.getDefinitions();
