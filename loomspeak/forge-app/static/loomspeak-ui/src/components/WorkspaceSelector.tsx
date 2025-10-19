import React, { useState, useEffect } from 'react';
import { forgeInvoke } from '../forge-bridge';

interface Workspace {
  id: string;
  key: string;
  name: string;
  type: 'jira' | 'confluence';
  description?: string;
}

interface WorkspaceSelectorProps {
  onWorkspaceSelect: (workspace: Workspace) => void;
  selectedWorkspace?: Workspace;
}

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ 
  onWorkspaceSelect, 
  selectedWorkspace 
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setIsLoading(true);
      const result = await forgeInvoke('getWorkspaces');
      
      const allWorkspaces: Workspace[] = [
        ...(result.jiraProjects || []).map((project: any) => ({
          id: project.id,
          key: project.key,
          name: project.name,
          type: 'jira' as const,
          description: project.description || `Jira project: ${project.key}`
        })),
        ...(result.confluenceSpaces || []).map((space: any) => ({
          id: space.id,
          key: space.key,
          name: space.name,
          type: 'confluence' as const,
          description: space.description || `Confluence space: ${space.key}`
        }))
      ];

      setWorkspaces(allWorkspaces);
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
      setError('Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workspace.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleWorkspaceClick = (workspace: Workspace) => {
    onWorkspaceSelect(workspace);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Select Workspace
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose the workspace where you want to create items
        </p>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchWorkspaces}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Workspace List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No workspaces found</p>
            <p className="text-sm">Try adjusting your search terms</p>
          </div>
        ) : (
          filteredWorkspaces.map((workspace) => (
            <div
              key={`${workspace.type}-${workspace.id}`}
              onClick={() => handleWorkspaceClick(workspace)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                selectedWorkspace?.id === workspace.id && selectedWorkspace?.type === workspace.type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Workspace Icon */}
                <div className={`p-2 rounded-lg ${
                  workspace.type === 'jira' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  {workspace.type === 'jira' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    </svg>
                  )}
                </div>

                {/* Workspace Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {workspace.name}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      workspace.type === 'jira'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {workspace.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {workspace.key}
                  </p>
                  {workspace.description && (
                    <p className="text-xs text-gray-400 truncate mt-1">
                      {workspace.description}
                    </p>
                  )}
                </div>

                {/* Selection Indicator */}
                {selectedWorkspace?.id === workspace.id && selectedWorkspace?.type === workspace.type && (
                  <div className="text-blue-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Workspace Summary */}
      {selectedWorkspace && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">
              Selected: {selectedWorkspace.name}
            </span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Items will be created in this {selectedWorkspace.type} workspace
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSelector;
