import React, { useState, useEffect } from 'react';
import { forgeInvoke } from '../forge-bridge';

interface AtlassianOAuthProps {
  onAuthSuccess: (user: any) => void;
}

const AtlassianOAuth: React.FC<AtlassianOAuthProps> = ({ onAuthSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unified OAuth URL with all required scopes
  const getOAuthUrl = () => {
    const clientId = '7VHXeIMHZGsgezYQa2peL0JVfEnfi2gJ';
    const redirectUri = encodeURIComponent('http://localhost:8080');
    const state = `loomspeak_${Date.now()}`;
    
    // Combined scopes for all Atlassian services
    const scopes = [
      'report:personal-data',
      'read:me',
      'read:account',
      'write:confluence-content',
      'read:confluence-space.summary',
      'write:confluence-space',
      'write:confluence-file',
      'read:confluence-props',
      'write:confluence-props',
      'manage:confluence-configuration',
      'read:confluence-content.all',
      'read:confluence-content.summary',
      'search:confluence',
      'read:confluence-content.permission',
      'read:confluence-user',
      'read:confluence-groups',
      'write:confluence-groups',
      'readonly:content.attachment:confluence',
      'read:jira-work',
      'manage:jira-project',
      'manage:jira-configuration',
      'read:jira-user',
      'write:jira-work',
      'manage:jira-webhook',
      'manage:jira-data-provider',
      'write:component:compass',
      'read:scorecard:compass',
      'write:scorecard:compass',
      'read:component:compass',
      'read:event:compass',
      'write:event:compass',
      'read:metric:compass',
      'write:metric:compass'
    ].join(' ');

    return `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${redirectUri}&state=${state}&response_type=code&prompt=consent`;
  };

  const handleOAuthLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Store state for verification
      const state = `loomspeak_${Date.now()}`;
      localStorage.setItem('oauth_state', state);
      
      // Redirect to OAuth
      window.location.href = getOAuthUrl();
    } catch (err) {
      setError('Failed to initiate OAuth login');
      setIsLoading(false);
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('oauth_state');

    if (code && state && storedState === state) {
      handleOAuthCallback(code);
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, you'd exchange the code for tokens
      // For now, we'll simulate successful authentication
      const mockUser = {
        id: 'user_123',
        email: 'user@example.com',
        name: 'LoomSpeak User',
        avatarUrl: 'https://via.placeholder.com/40',
        authenticated: true
      };

      // Clear OAuth state
      localStorage.removeItem('oauth_state');
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      onAuthSuccess(mockUser);
    } catch (err) {
      setError('Failed to complete authentication');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
        {/* Atlassian Logo */}
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 rounded-lg p-3">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to LoomSpeak+
          </h1>
          <p className="text-gray-600">
            Connect your Atlassian workspace to get started
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleOAuthLogin}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Connect with Atlassian</span>
            </>
          )}
        </button>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By connecting, you agree to LoomSpeak+'s terms of service
          </p>
        </div>

        {/* Feature highlights */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Access Jira projects and Confluence spaces</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Create tickets and pages from voice commands</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Powered by Rovo AI agents</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtlassianOAuth;