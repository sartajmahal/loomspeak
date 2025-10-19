import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CostEffectiveAssistantProps {
  onCommand: (command: string) => void;
  onError: (error: string) => void;
}

export default function CostEffectiveAssistant({ onCommand, onError }: CostEffectiveAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Initialize Web Speech API
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      onError('Web Speech API not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Voice assistant started listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(prev => prev + finalTranscript);
      
      if (finalTranscript) {
        processCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        onError('No speech detected. Please try again.');
      } else if (event.error === 'audio-capture') {
        onError('Microphone not accessible. Please check permissions.');
      } else {
        onError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [onError]);

  // Process voice commands using local logic (no API calls)
  const processCommand = useCallback(async (command: string) => {
    setIsProcessing(true);
    setLastCommand(command);
    
    try {
      // Simple command parsing without expensive LLM calls
      const lowerCommand = command.toLowerCase();
      
      // Extract basic information using regex patterns
      const patterns = {
        createTask: /(?:create|add|make)\s+(?:a\s+)?(?:task|issue|ticket)\s+(?:called\s+)?["']?([^"']+)["']?/i,
        assignTo: /(?:assign|give)\s+(?:to\s+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        points: /(?:(\d+)\s+points?|points?\s+(\d+))/i,
        dueDate: /(?:due|deadline)\s+(?:on\s+)?(?:friday|monday|tuesday|wednesday|thursday|saturday|sunday|tomorrow|next week)/i,
        project: /(?:in\s+)?(?:project\s+)?([A-Z]{2,})/i
      };
      
      const extracted = {
        title: '',
        assignee: '',
        points: undefined as number | undefined,
        dueDate: '',
        project: 'ENG' // Default project
      };
      
      // Extract title
      const titleMatch = command.match(patterns.createTask);
      if (titleMatch) {
        extracted.title = titleMatch[1];
      } else {
        // Fallback: use the whole command as title
        extracted.title = command;
      }
      
      // Extract assignee
      const assigneeMatch = command.match(patterns.assignTo);
      if (assigneeMatch) {
        extracted.assignee = assigneeMatch[1];
      }
      
      // Extract story points
      const pointsMatch = command.match(patterns.points);
      if (pointsMatch) {
        extracted.points = parseInt(pointsMatch[1] || pointsMatch[2]);
      }
      
      // Extract due date
      const dueMatch = command.match(patterns.dueDate);
      if (dueMatch) {
        extracted.dueDate = dueMatch[1];
      }
      
      // Extract project
      const projectMatch = command.match(patterns.project);
      if (projectMatch) {
        extracted.project = projectMatch[1];
      }
      
      // Create structured command
      const structuredCommand = {
        action: 'create_issue',
        title: extracted.title,
        description: `Created from voice command: "${command}"`,
        project: extracted.project,
        points: extracted.points,
        assignee: extracted.assignee,
        dueDate: extracted.dueDate,
        confidence: 0.8 // High confidence for simple patterns
      };
      
      onCommand(JSON.stringify(structuredCommand));
      
    } catch (error) {
      console.error('Command processing error:', error);
      onError('Failed to process command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [onCommand, onError]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setLastCommand('');
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold">Voice Assistant (Free)</h3>
      
      <div className="flex gap-3">
        {!isListening ? (
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium"
            onClick={startListening}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Start Listening'}
          </button>
        ) : (
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium"
            onClick={stopListening}
          >
            Stop Listening
          </button>
        )}
        
        {transcript && (
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
            onClick={clearTranscript}
          >
            Clear
          </button>
        )}
      </div>

      {transcript && (
        <div className="space-y-2">
          <h4 className="font-medium">Live Transcript:</h4>
          <p className="text-sm text-gray-700 bg-white p-2 rounded border">
            {transcript}
          </p>
        </div>
      )}

      {lastCommand && (
        <div className="space-y-2">
          <h4 className="font-medium">Last Command:</h4>
          <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded border">
            {lastCommand}
          </p>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p><strong>Supported commands:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>"Create a task called Fix login bug"</li>
          <li>"Add issue Update documentation, 3 points"</li>
          <li>"Make task Assign to john@example.com"</li>
          <li>"Create task in ENG project, due Friday"</li>
        </ul>
      </div>
    </div>
  );
}
