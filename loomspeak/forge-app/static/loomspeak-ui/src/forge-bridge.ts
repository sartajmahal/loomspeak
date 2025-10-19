// Forge Frontend Bridge Integration
// This file handles the communication between the frontend and Forge backend

declare global {
  interface Window {
    invoke: (functionKey: string, payload: any) => Promise<any>;
  }
}

// Forge function invocations
export const forgeInvoke = {
  // Create Jira issue
  createJiraIssue: async (payload: {
    projectKey: string;
    summary: string;
    description?: string;
    points?: number;
    assigneeAccountId?: string;
    issueTypeName?: string;
  }) => {
    return await window.invoke('createJiraIssue', payload);
  },

  // Create Confluence page
  createConfluencePage: async (payload: {
    spaceKey: string;
    title: string;
    bodyHtml: string;
    parentId?: string;
  }) => {
    return await window.invoke('createConfluencePage', payload);
  },

  // Save session links
  saveSessionLinks: async (payload: {
    sessionId: string;
    relatedIssues?: string[];
    relatedPages?: string[];
    meta?: any;
  }) => {
    return await window.invoke('saveSessionLinks', payload);
  }
};

// Error handling for Forge invocations
export const handleForgeError = (error: any) => {
  console.error('Forge invocation error:', error);
  
  if (error.message?.includes('permission')) {
    return 'Permission denied. Please check your app permissions.';
  }
  
  if (error.message?.includes('not found')) {
    return 'Resource not found. Please check your project/space configuration.';
  }
  
  if (error.message?.includes('validation')) {
    return 'Invalid data provided. Please check your input.';
  }
  
  return error.message || 'An error occurred while processing your request.';
};

// Check if Forge bridge is available
export const isForgeAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.invoke === 'function';
};
