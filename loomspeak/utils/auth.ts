/**
 * Interface defining the structure of Atlassian OAuth scopes
 */
interface AtlassianScopes {
  PERSONAL_DATA: string;
  USER_IDENTITY: string;
  CONFLUENCE: string;
  JIRA: string;
  COMPASS: string;
}

/**
 * Generates an Atlassian OAuth URL with the specified scope
 * @param scope - The OAuth scope(s) to request
 * @returns The complete OAuth URL
 */
export const getAtlassianAuthUrl = (scope: string): string => {
  const baseUrl = 'https://auth.atlassian.com/authorize';
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: process.env.ATLASSIAN_CLIENT_ID || '',
    scope: scope,
    redirect_uri: 'http://localhost:8080',
    response_type: 'code',
    prompt: 'consent',
    state: Math.random().toString(36).substring(7), // Generate random state
  });

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Available Atlassian OAuth scopes
 */
export const ATLASSIAN_SCOPES: AtlassianScopes = {
  PERSONAL_DATA: 'report:personal-data',
  USER_IDENTITY: 'read:me read:account',
  CONFLUENCE: 'write:confluence-content read:confluence-space.summary write:confluence-space write:confluence-file read:confluence-props write:confluence-props manage:confluence-configuration read:confluence-content.all read:confluence-content.summary search:confluence read:confluence-content.permission read:confluence-user read:confluence-groups write:confluence-groups readonly:content.attachment:confluence',
  JIRA: 'read:jira-work manage:jira-project manage:jira-configuration read:jira-user write:jira-work manage:jira-webhook manage:jira-data-provider',
  COMPASS: 'write:component:compass read:scorecard:compass write:scorecard:compass read:component:compass read:event:compass write:event:compass read:metric:compass write:metric:compass'
};