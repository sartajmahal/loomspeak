import React, { useRef, useState, useCallback } from 'react';

interface CostEffectiveRecorderProps {
  onTranscript: (transcript: string) => void;
  onBlob: (blob: Blob) => void;
  onError: (error: string) => void;
}

export default function CostEffectiveRecorder({ onTranscript, onBlob, onError }: CostEffectiveRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [useWebSpeech, setUseWebSpeech] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Web Speech API implementation (FREE)
  const startWebSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      onError('Web Speech API not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('Web Speech recognition started');
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

      const currentTranscript = transcript + finalTranscript;
      setTranscript(currentTranscript);
      onTranscript(currentTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      onError(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      console.log('Web Speech recognition ended');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [transcript, onTranscript, onError]);

  // Audio compression utility
  const compressAudio = useCallback(async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Convert to mono and reduce sample rate for cost savings
          const sampleRate = Math.min(audioBuffer.sampleRate, 16000); // Max 16kHz for Whisper
          const length = Math.floor(audioBuffer.length * sampleRate / audioBuffer.sampleRate);
          const monoBuffer = audioContext.createBuffer(1, length, sampleRate);
          
          const sourceData = audioBuffer.getChannelData(0);
          const targetData = monoBuffer.getChannelData(0);
          
          for (let i = 0; i < length; i++) {
            const sourceIndex = Math.floor(i * audioBuffer.sampleRate / sampleRate);
            targetData[i] = sourceData[sourceIndex];
          }
          
          // Convert back to blob with compression
          const wavBlob = await audioBufferToWav(monoBuffer);
          resolve(wavBlob);
        } catch (error) {
          console.error('Audio compression failed:', error);
          resolve(blob); // Fallback to original
        }
      };
      
      fileReader.readAsArrayBuffer(blob);
    });
  }, []);

  // Convert AudioBuffer to WAV blob
  const audioBufferToWav = async (audioBuffer: AudioBuffer): Promise<Blob> => {
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float32 to int16
    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Optimize for Whisper
          channelCount: 1,   // Mono for cost savings
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      
      if (useWebSpeech) {
        startWebSpeechRecognition();
      }
      
      // Also record for backup/processing
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const compressedBlob = await compressAudio(audioBlob);
        onBlob(compressedBlob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      onError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setRecording(false);
  };

  const clearTranscript = () => {
    setTranscript('');
    onTranscript('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useWebSpeech}
            onChange={(e) => setUseWebSpeech(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Use free Web Speech API (real-time)</span>
        </label>
      </div>

      <div className="flex gap-3">
        {!recording ? (
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium"
            onClick={startRecording}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Start Recording'}
          </button>
        ) : (
          <button 
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium"
            onClick={stopRecording}
          >
            Stop Recording
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
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Live Transcript:</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{transcript}</p>
        </div>
      )}
    </div>
  );
}
