import React, { useState, useEffect } from 'react';

interface AtlassianOAuthProps {
  onAuthSuccess: (user: any) => void;
  onError: (error: string) => void;
}

export default function AtlassianOAuth({ onAuthSuccess, onError }: AtlassianOAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // OAuth configuration
  const CLIENT_ID = '7VHXeIMHZGsgezYQa2peL0JVfEnfi2gJ';
  const REDIRECT_URI = 'http://localhost:8080'; // Update for production
  const SCOPES = [
    'read:jira-work',
    'write:jira-work',
    'read:me',
    'read:account',
    'write:confluence-content',
    'read:confluence-content.summary',
    'read:confluence-space.summary'
  ].join(' ');

  const AUTH_URL = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${Date.now()}&response_type=code&prompt=consent`;

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthStatus();
    
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if we have stored auth token
      const token = localStorage.getItem('atlassian_token');
      if (token) {
        // Verify token is still valid
        const userInfo = await fetchUserInfo(token);
        if (userInfo) {
          setUser(userInfo);
          setIsAuthenticated(true);
          onAuthSuccess(userInfo);
        } else {
          // Token expired, clear it
          localStorage.removeItem('atlassian_token');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    setIsLoading(true);
    try {
      // Exchange code for token
      const tokenResponse = await fetch(`${process.env.REACT_APP_PROXY_URL || 'http://localhost:8080'}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const { access_token, refresh_token } = await tokenResponse.json();
      
      // Store tokens
      localStorage.setItem('atlassian_token', access_token);
      localStorage.setItem('atlassian_refresh_token', refresh_token);

      // Get user info
      const userInfo = await fetchUserInfo(access_token);
      setUser(userInfo);
      setIsAuthenticated(true);
      onAuthSuccess(userInfo);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

    } catch (error: any) {
      console.error('OAuth callback error:', error);
      onError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch('https://api.atlassian.com/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Fetch user info error:', error);
      return null;
    }
  };

  const handleLogin = () => {
    window.location.href = AUTH_URL;
  };

  const handleLogout = () => {
    localStorage.removeItem('atlassian_token');
    localStorage.removeItem('atlassian_refresh_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        <p className="text-gray-600">Authenticating with Atlassian...</p>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-semibold">
                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-green-800">
                Welcome, {user.name || user.email}!
              </h3>
              <p className="text-sm text-green-600">
                Connected to Atlassian
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Connect to Atlassian
        </h3>
        <p className="text-blue-600 mb-4">
          Sign in with your Atlassian account to create Jira tickets and Confluence pages
        </p>
        <button
          onClick={handleLogin}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-medium transition-colors"
        >
          Sign in with Atlassian
        </button>
        <div className="mt-4 text-xs text-blue-500">
          <p>Required permissions:</p>
          <ul className="list-disc list-inside mt-1">
            <li>Read & write Jira work items</li>
            <li>Read & write Confluence content</li>
            <li>Read your profile information</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
