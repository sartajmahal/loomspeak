'use client';

import { useState, useRef } from 'react';
import { transcribeAudio } from '@/utils/whisper';

interface AudioHandlerProps {
  onTranscriptionComplete: (text: string) => void;
}

export default function AudioHandler({ onTranscriptionComplete }: AudioHandlerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleAudioData(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleAudioData(file);
    }
  };

  const handleAudioData = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type });
      const transcription = await transcribeAudio(audioFile);
      onTranscriptionComplete(transcription);
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Error processing audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded-lg font-medium ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          disabled={isProcessing}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <div className="relative">
          <input
            type="file"
            onChange={handleFileUpload}
            accept="audio/*"
            className="hidden"
            id="audio-upload"
            disabled={isProcessing || isRecording}
          />
          <label
            htmlFor="audio-upload"
            className={`cursor-pointer px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white ${
              (isProcessing || isRecording) && 'opacity-50 cursor-not-allowed'
            }`}
          >
            Upload Audio
          </label>
        </div>
      </div>
      {isProcessing && (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Processing audio...</span>
        </div>
      )}
    </div>
  );
}