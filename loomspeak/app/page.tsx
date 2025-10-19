'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import AudioHandler from '../src/components/AudioHandler';
import { processWithGemini } from '../utils/gemini';
import { executeAtlassianActions } from '../utils/atlassian';

export default function Home() {
  const { data: session } = useSession();
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const handleTranscription = async (text: string) => {
    setTranscription(text);
    setIsProcessing(true);

    try {
      // Process with Gemini
      const processed = await processWithGemini(text);
      
      // Execute Atlassian actions
      if (session?.accessToken) {
        const actionResults = await executeAtlassianActions(
          session.accessToken,
          processed.actions
        );
        setResults(prev => [...prev, ...actionResults]);
      }
    } catch (error) {
      console.error('Error processing transcription:', error);
      setResults(prev => [...prev, 'Error processing transcription']);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg space-y-6 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center text-gray-800">
            Welcome to LoomSpeak
          </h1>
          <p className="text-center text-gray-600">
            Transform your lectures into organized knowledge with Atlassian integration
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => signIn('atlassian')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2"
            >
              <span>Sign in with Atlassian</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">LoomSpeak Dashboard</h1>
          <button
            onClick={() => signOut()}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6">
            <div className="space-y-6">
              {/* Audio Recording Section */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Record or Upload Audio</h2>
                <AudioHandler onTranscriptionComplete={handleTranscription} />
              </div>

              {/* Transcription Section */}
              {transcription && (
                <div className="border-b border-gray-200 pb-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Transcription</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{transcription}</p>
                  </div>
                </div>
              )}

              {/* Results Section */}
              {results.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Actions Taken</h2>
                  <ul className="space-y-2">
                    {results.map((result, index) => (
                      <li
                        key={index}
                        className="bg-green-50 text-green-700 rounded-lg p-4"
                      >
                        {result}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Processing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}