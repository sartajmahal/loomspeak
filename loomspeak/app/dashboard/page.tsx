import AudioHandler from '@/components/AudioHandler';
import { processWithGemini } from '@/utils/gemini';
import { executeForgeActions } from '@/utils/forge';
import { useState } from 'react';

export default function Dashboard() {
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const handleTranscription = async (text: string) => {
    setTranscription(text);
    setIsProcessing(true);

    try {
      // Process with Gemini
      const processed = await processWithGemini(text);
      
      // Convert Gemini output to Forge actions
      const forgeActions = [
        ...processed.jiraTickets?.map(ticket => ({
          type: 'jira',
          data: {
            title: ticket,
            description: 'Created from lecture transcription'
          }
        })) || [],
        ...processed.confluencePages?.map(page => ({
          type: 'confluence',
          data: {
            title: page,
            content: 'Created from lecture transcription'
          }
        })) || []
      ];

      // Execute Forge actions
      const forgeResult = await executeForgeActions(forgeActions);
      setResults(prev => [...prev, forgeResult]);
    } catch (error) {
      console.error('Error processing transcription:', error);
      setResults(prev => [...prev, 'Error processing transcription']);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">LoomSpeak Dashboard</h1>
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