// Forge Frontend Bridge Integration
// This file handles the communication between the frontend and Forge backend

declare global {
  interface Window {
    invoke: (functionKey: string, payload: any) => Promise<any>;
  }
}

// Mock Forge functions for local development
const mockForgeInvoke = {
  createJiraIssue: async (payload: any) => {
    console.log('Mock createJiraIssue:', payload);
    return {
      id: 'mock-issue-id',
      key: 'MOCK-123',
      self: 'https://mock.atlassian.net/rest/api/3/issue/mock-issue-id'
    };
  },
  
  createConfluencePage: async (payload: any) => {
    console.log('Mock createConfluencePage:', payload);
    return {
      id: 'mock-page-id',
      _links: {
        webui: 'https://mock.atlassian.net/wiki/spaces/MOCK/pages/mock-page-id'
      }
    };
  },
  
  saveSessionLinks: async (payload: any) => {
    console.log('Mock saveSessionLinks:', payload);
    return { ok: true };
  },
  
  getWorkspaces: async () => {
    console.log('Mock getWorkspaces');
    return {
      jiraProjects: [
        { id: '1', key: 'MOCK', name: 'Mock Project', description: 'Mock project for testing' }
      ],
      confluenceSpaces: [
        { id: '1', key: 'MOCK', name: 'Mock Space', description: 'Mock space for testing' }
      ]
    };
  },
  
  analyzeWithRovo: async (payload: any) => {
    console.log('Mock analyzeWithRovo:', payload);
    return {
      analysis: `Mock Rovo analysis for: "${payload.transcript}"`,
      suggestedActions: [
        {
          action: 'create_issue',
          title: `Mock Task: ${payload.command}`,
          description: `Mock description for: ${payload.transcript}`,
          project: 'MOCK',
          confidence: 0.9
        }
      ],
      workspaceRecommendations: payload.workspaceContext
    };
  },
  
  searchWorkspaceContent: async (payload: any) => {
    console.log('Mock searchWorkspaceContent:', payload);
    return { results: [] };
  }
};

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
    if (isForgeAvailable()) {
      return await window.invoke('createJiraIssue', payload);
    } else {
      return await mockForgeInvoke.createJiraIssue(payload);
    }
  },

  // Create Confluence page
  createConfluencePage: async (payload: {
    spaceKey: string;
    title: string;
    bodyHtml: string;
    parentId?: string;
  }) => {
    if (isForgeAvailable()) {
      return await window.invoke('createConfluencePage', payload);
    } else {
      return await mockForgeInvoke.createConfluencePage(payload);
    }
  },

  // Save session links
  saveSessionLinks: async (payload: {
    sessionId: string;
    relatedIssues?: string[];
    relatedPages?: string[];
    meta?: any;
  }) => {
    if (isForgeAvailable()) {
      return await window.invoke('saveSessionLinks', payload);
    } else {
      return await mockForgeInvoke.saveSessionLinks(payload);
    }
  },

  // Get workspaces
  getWorkspaces: async () => {
    if (isForgeAvailable()) {
      return await window.invoke('getWorkspaces');
    } else {
      return await mockForgeInvoke.getWorkspaces();
    }
  },

  // Analyze with Rovo
  analyzeWithRovo: async (payload: {
    transcript: string;
    workspaceContext: any;
    command: string;
  }) => {
    if (isForgeAvailable()) {
      return await window.invoke('analyzeWithRovo', payload);
    } else {
      return await mockForgeInvoke.analyzeWithRovo(payload);
    }
  },

  // Search workspace content
  searchWorkspaceContent: async (payload: {
    query: string;
    workspaceType: string;
    workspaceKey: string;
  }) => {
    if (isForgeAvailable()) {
      return await window.invoke('searchWorkspaceContent', payload);
    } else {
      return await mockForgeInvoke.searchWorkspaceContent(payload);
    }
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
