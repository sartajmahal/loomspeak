import React, { useState } from 'react';
import CostEffectiveRecorder from './components/CostEffectiveRecorder';
import SmartUploader from './components/SmartUploader';
import CostEffectiveAssistant from './components/CostEffectiveAssistant';
import { ActionsReview } from './components/ActionsReview';
import AtlassianOAuth from './components/AtlassianOAuth';
import { forgeInvoke, handleForgeError, isForgeAvailable } from './forge-bridge';

const PROXY_BASE = 'https://your-proxy-domain.com';

interface Action {
  action: 'create_issue' | 'create_page';
  title: string;
  description?: string;
  project?: string;
  points?: number;
  assignee?: string;
  dueDate?: string;
  spaceKey?: string;
  pageParentId?: string;
  bodyHtml?: string;
  confidence?: number;
}

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [actions, setActions] = useState<Action[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'record' | 'upload' | 'assistant'>('record');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  const uploadToS3ViaProxy = async (file: Blob, filename: string) => {
    const pres = await fetch(`${PROXY_BASE}/s3/presign?filename=${encodeURIComponent(filename)}`).then(r => r.json());
    await fetch(pres.url, { method: 'PUT', headers: { 'Content-Type': pres.contentType }, body: file });
    return pres.publicUrl;
  };

  const processAudio = async (mediaUrl: string, sourceTranscript?: string) => {
    setIsProcessing(true);
    setError('');
    
    try {
      const response = await fetch(`${PROXY_BASE}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mediaUrl, 
          sourceTranscript, // Use Web Speech API transcript if available
          optimizeForCost: true // Flag for cost optimization
        })
      });
      
      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      setTranscript(result.transcript || sourceTranscript || '');
      setSummary(result.summary || '');
      setActions(result.actions || []);
      setSessionId(result.sessionId);
      
    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBlob = async (blob: Blob) => {
    try {
      const mediaUrl = await uploadToS3ViaProxy(blob, `recording-${Date.now()}.webm`);
      await processAudio(mediaUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and process audio');
    }
  };

  const handleFile = async (file: File) => {
    try {
      const mediaUrl = await uploadToS3ViaProxy(file, file.name);
      await processAudio(mediaUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and process file');
    }
  };

  const handleTranscript = (newTranscript: string) => {
    setTranscript(newTranscript);
  };

  const handleCommand = (command: string) => {
    try {
      const parsedCommand = JSON.parse(command);
      setActions(prev => [...prev, parsedCommand]);
    } catch (err) {
      console.error('Failed to parse command:', err);
      setError('Failed to parse voice command');
    }
  };

  const handleEditAction = (index: number, action: Action) => {
    setActions(prev => prev.map((a, i) => i === index ? action : a));
  };

  const confirmCreate = async (acts: Action[]) => {
    if (acts.length === 0) return;
    
    setIsProcessing(true);
    setError('');
    
    try {
      const createdItems = [];
      
      // Check if Forge is available
      if (!isForgeAvailable()) {
        throw new Error('Forge bridge not available. Please ensure you are running this app in an Atlassian environment.');
      }

      // Execute Forge bot commands
      for (const action of acts) {
        try {
          if (action.action === 'create_issue') {
            const result = await forgeInvoke.createJiraIssue({
              projectKey: action.project || 'ENG',
              summary: action.title,
              description: action.description || `Created from LoomSpeak+ session: ${sessionId}`,
              points: action.points,
              assigneeAccountId: action.assignee,
              issueTypeName: 'Task'
            });
            createdItems.push({ 
              type: 'jira_issue', 
              key: result.key, 
              id: result.id,
              url: result.self,
              title: action.title
            });
          } else if (action.action === 'create_page') {
            const result = await forgeInvoke.createConfluencePage({
              spaceKey: action.spaceKey || 'DOC',
              title: action.title,
              bodyHtml: action.bodyHtml || `
                <h2>${action.title}</h2>
                <p>${action.description || ''}</p>
                <hr>
                <p><em>Created from LoomSpeak+ session: ${sessionId}</em></p>
                ${transcript ? `<h3>Transcript</h3><pre>${transcript}</pre>` : ''}
              `,
              parentId: action.pageParentId
            });
            createdItems.push({ 
              type: 'confluence_page', 
              id: result.id,
              url: result._links?.webui,
              title: action.title
            });
          }
        } catch (error) {
          console.error(`Failed to create ${action.action}:`, error);
          throw new Error(handleForgeError(error));
        }
      }
      
      // Send Forge results to Gemini for final formatting
      const formattedOutput = await fetch(`${PROXY_BASE}/format-output`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forgeResults: createdItems,
          sessionId,
          originalActions: acts
        })
      }).then(r => r.json());
      
      // Save session links
      await forgeInvoke.saveSessionLinks({
        sessionId,
        relatedIssues: createdItems.filter(item => item.type === 'jira_issue').map(item => item.key || item.id),
        relatedPages: createdItems.filter(item => item.type === 'confluence_page').map(item => item.id),
        meta: { 
          transcriptLen: transcript.length,
          actionCount: acts.length,
          costOptimized: true,
          geminiFormatted: true
        }
      });
      
      // Display formatted results
      setSummary(formattedOutput.summary || `Successfully created ${createdItems.length} items!`);
      setActions([]);
      
    } catch (err: any) {
      console.error('Creation error:', err);
      setError(err.message || 'Failed to create items');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearSession = () => {
    setTranscript('');
    setSummary('');
    setActions([]);
    setSessionId('');
    setError('');
  };

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h1 className="text-3xl font-bold text-gray-900">LoomSpeak+</h1>
            <p className="text-gray-600 mt-2">
              Cost-effective voice-to-work tool powered by Web Speech API and optimized Whisper
            </p>
          </div>

          <div className="p-6">
            {/* Authentication */}
            {!isAuthenticated ? (
              <div className="mb-6">
                <AtlassianOAuth onAuthSuccess={handleAuthSuccess} onError={setError} />
              </div>
            ) : (
              <>
                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  activeTab === 'record'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('record')}
              >
                Record
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('upload')}
              >
                Upload
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  activeTab === 'assistant'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('assistant')}
              >
                Voice Assistant
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
                <button
                  className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
                  onClick={() => setError('')}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
                  <p className="text-blue-800">Processing audio and extracting actions...</p>
                </div>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'record' && (
              <CostEffectiveRecorder
                onTranscript={handleTranscript}
                onBlob={handleBlob}
                onError={setError}
              />
            )}

            {activeTab === 'upload' && (
              <SmartUploader
                onFile={handleFile}
                onError={setError}
              />
            )}

            {activeTab === 'assistant' && (
              <CostEffectiveAssistant
                onCommand={handleCommand}
                onError={setError}
              />
            )}

            {/* Results Display */}
            {summary && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                <p className="text-gray-700">{summary}</p>
              </div>
            )}

            {transcript && (
              <details className="mt-4">
                <summary className="cursor-pointer font-medium text-gray-900 hover:text-blue-600">
                  View Transcript
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded border overflow-auto max-h-40">
                  {transcript}
                </pre>
              </details>
            )}

            {/* Actions Review */}
            {actions.length > 0 && (
              <div className="mt-6">
                <ActionsReview
                  actions={actions}
                  onConfirm={confirmCreate}
                  onEdit={handleEditAction}
                />
              </div>
            )}

            {/* Session Info */}
            {sessionId && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Session ID</h4>
                    <p className="text-sm text-gray-600 font-mono">{sessionId}</p>
                  </div>
                  <button
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                    onClick={clearSession}
                  >
                    Clear Session
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
