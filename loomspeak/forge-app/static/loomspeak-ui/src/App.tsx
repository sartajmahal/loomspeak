import React, { useState } from 'react';
import CostEffectiveRecorder from './components/CostEffectiveRecorder';
import SmartUploader from './components/SmartUploader';
import { ActionsReview } from './components/ActionsReview';
import AtlassianOAuth from './components/AtlassianOAuth';
import WorkspaceSelector from './components/WorkspaceSelector';
import RovoCommandInput from './components/RovoCommandInput';
import { forgeInvoke, handleForgeError, isForgeAvailable } from './forge-bridge';

const PROXY_BASE = 'http://localhost:8080';

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
  workspaceContext?: string;
}

interface Workspace {
  id: string;
  key: string;
  name: string;
  type: 'jira' | 'confluence';
  description?: string;
}

export default function App() {
  console.log('LoomSpeak+ App component loaded');
  
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [actions, setActions] = useState<Action[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'record' | 'upload' | 'rovo'>('record');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [rovoCommand, setRovoCommand] = useState('');

  const uploadAudioDirectly = async (file: Blob) => {
    try {
      // Convert blob to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const response = await fetch(`${PROXY_BASE}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audioData: base64,
          filename: `recording-${Date.now()}.webm`
        })
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to upload audio');
    }
  };

  const processAudio = async (audioData?: string, sourceTranscript?: string, userCommand?: string) => {
    setIsProcessing(true);
    setError('');
    
    try {
      const response = await fetch(`${PROXY_BASE}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audioData, // Base64 audio data
          sourceTranscript, // Use Web Speech API transcript if available
          optimizeForCost: true, // Flag for cost optimization
          workspaceContext: selectedWorkspace,
          userCommand: userCommand || rovoCommand
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

  const handleBlob = async (blob: Blob, sourceTranscript?: string) => {
    try {
      // Convert blob to base64 for direct processing
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      await processAudio(base64, sourceTranscript, rovoCommand);
    } catch (err: any) {
      setError(err.message || 'Failed to process audio');
    }
  };

  const handleFile = async (file: File) => {
    try {
      // Convert file to base64 for direct processing
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      await processAudio(base64, undefined, rovoCommand);
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
    }
  };

  const handleTranscript = (newTranscript: string) => {
    setTranscript(newTranscript);
  };

  const handleRovoCommand = async (command: string) => {
    setRovoCommand(command);
    setIsProcessing(true);
    setError('');
    
    try {
      // Use Rovo agent to analyze the command and workspace context
      const rovoResult = await forgeInvoke.analyzeWithRovo({
        transcript: command,
        workspaceContext: selectedWorkspace,
        command: command
      });

      // Process the Rovo analysis result
      if (rovoResult.suggestedActions && rovoResult.suggestedActions.length > 0) {
        setActions(rovoResult.suggestedActions);
        setSummary(rovoResult.analysis);
      } else {
        // Fallback: create a simple action from the command
        setActions([{
          action: 'create_issue',
          title: `Rovo Command: ${command}`,
          description: `Command: ${command}\nWorkspace: ${selectedWorkspace?.name || 'No workspace selected'}`,
          project: selectedWorkspace?.type === 'jira' ? selectedWorkspace.key : 'ENG',
          spaceKey: selectedWorkspace?.type === 'confluence' ? selectedWorkspace.key : 'DOC',
          workspaceContext: selectedWorkspace?.name,
          confidence: 0.8
        }]);
        setSummary(`Processed Rovo command: "${command}"`);
      }
    } catch (err: any) {
      console.error('Rovo command error:', err);
      setError(err.message || 'Failed to process Rovo command');
    } finally {
      setIsProcessing(false);
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

      // Execute Forge bot commands with workspace context
      for (const action of acts) {
        try {
          if (action.action === 'create_issue') {
            const result = await forgeInvoke.createJiraIssue({
              projectKey: action.project || selectedWorkspace?.key || 'ENG',
              summary: action.title,
              description: action.description || `Created from LoomSpeak+ Rovo session: ${sessionId}`,
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
              spaceKey: action.spaceKey || selectedWorkspace?.key || 'DOC',
              title: action.title,
              bodyHtml: action.bodyHtml || `
                <h2>${action.title}</h2>
                <p>${action.description || ''}</p>
                <hr>
                <p><em>Created from LoomSpeak+ Rovo session: ${sessionId}</em></p>
                ${transcript ? `<h3>Transcript</h3><pre>${transcript}</pre>` : ''}
                ${rovoCommand ? `<h3>Rovo Command</h3><p>${rovoCommand}</p>` : ''}
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
          originalActions: acts,
          workspaceContext: selectedWorkspace
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
          geminiFormatted: true,
          rovoPowered: true,
          workspaceContext: selectedWorkspace?.name
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
    setRovoCommand('');
  };

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              {/* Atlassian Logo */}
              <div className="bg-blue-600 rounded-lg p-3">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">LoomSpeak+</h1>
                <p className="text-gray-600 mt-1">
                  Rovo-powered voice-to-work tool for Atlassian workspaces
                </p>
                <p className="text-sm text-green-600 mt-1">
                  ✅ Running locally on localhost:3000
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Authentication */}
            {!isAuthenticated ? (
              <AtlassianOAuth onAuthSuccess={handleAuthSuccess} />
            ) : (
              <>
                {/* User Info */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {user?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user?.name || 'User'}</p>
                      <p className="text-sm text-gray-500">{user?.email || 'user@example.com'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Connected to Atlassian</span>
                  </div>
                </div>

                {/* Workspace Selector */}
                <div className="mb-6">
                  <WorkspaceSelector 
                    onWorkspaceSelect={setSelectedWorkspace}
                    selectedWorkspace={selectedWorkspace}
                  />
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
                  <button
                    className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                      activeTab === 'record'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab('record')}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span>Record</span>
                    </div>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                      activeTab === 'upload'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab('upload')}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Upload</span>
                    </div>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                      activeTab === 'rovo'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab('rovo')}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Rovo AI</span>
                    </div>
                  </button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <p className="text-red-800 font-medium">{error}</p>
                    </div>
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
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <p className="text-blue-800 font-medium">Rovo AI is processing your request...</p>
                    </div>
                  </div>
                )}

                {/* Tab Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    {activeTab === 'record' && (
                      <CostEffectiveRecorder
                        onTranscript={handleTranscript}
                        onBlob={(blob) => handleBlob(blob, transcript)}
                        onError={setError}
                      />
                    )}

                    {activeTab === 'upload' && (
                      <SmartUploader
                        onFile={handleFile}
                        onError={setError}
                      />
                    )}

                    {activeTab === 'rovo' && (
                      <RovoCommandInput
                        onCommandSubmit={handleRovoCommand}
                        isLoading={isProcessing}
                        placeholder="Hey Rovo, summarize key points of my lecture and put into a confluence page located in my CSE 312 workspace"
                      />
                    )}
                  </div>

                  <div>
                    {/* Results Display */}
                    {summary && (
                      <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Rovo Analysis</span>
                        </h3>
                        <p className="text-gray-700">{summary}</p>
                      </div>
                    )}

                    {/* Actions Review */}
                    {actions.length > 0 && (
                      <div className="mb-6">
                        <ActionsReview
                          actions={actions}
                          onConfirm={confirmCreate}
                          onEdit={handleEditAction}
                        />
                      </div>
                    )}

                    {/* Session Info */}
                    {sessionId && (
                      <div className="p-4 bg-gray-50 rounded-lg border">
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
                  </div>
                </div>

                {/* Transcript Display */}
                {transcript && (
                  <details className="mt-6">
                    <summary className="cursor-pointer font-medium text-gray-900 hover:text-blue-600 flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>View Transcript</span>
                    </summary>
                    <pre className="mt-3 text-sm text-gray-600 bg-gray-50 p-4 rounded border overflow-auto max-h-40">
                      {transcript}
                    </pre>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
