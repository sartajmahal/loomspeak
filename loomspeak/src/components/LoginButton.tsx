'use client';

import { useState } from 'react';
import { ATLASSIAN_SCOPES, getAtlassianAuthUrl } from '@/utils/auth';

export default function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Request all scopes
    const allScopes = Object.values(ATLASSIAN_SCOPES).join(' ');
    const authUrl = getAtlassianAuthUrl(allScopes);
    window.location.href = authUrl;
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 disabled:opacity-50"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            />
          </svg>
          <span>Sign in with Atlassian</span>
        </>
      )}
    </button>
  );
}