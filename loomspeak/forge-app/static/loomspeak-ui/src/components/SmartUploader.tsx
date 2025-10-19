import React, { useRef, useState, useCallback } from 'react';

interface SmartUploaderProps {
  onFile: (file: File) => void;
  onError: (error: string) => void;
}

export default function SmartUploader({ onFile, onError }: SmartUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio compression for uploaded files
  const compressAudioFile = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Optimize for Whisper API (16kHz, mono)
          const targetSampleRate = Math.min(audioBuffer.sampleRate, 16000);
          const length = Math.floor(audioBuffer.length * targetSampleRate / audioBuffer.sampleRate);
          const monoBuffer = audioContext.createBuffer(1, length, targetSampleRate);
          
          const sourceData = audioBuffer.getChannelData(0);
          const targetData = monoBuffer.getChannelData(0);
          
          for (let i = 0; i < length; i++) {
            const sourceIndex = Math.floor(i * audioBuffer.sampleRate / targetSampleRate);
            targetData[i] = sourceData[sourceIndex];
          }
          
          // Convert to compressed WAV
          const wavBlob = await audioBufferToWav(monoBuffer);
          const compressedFile = new File([wavBlob], file.name.replace(/\.[^/.]+$/, '.wav'), {
            type: 'audio/wav'
          });
          
          resolve(compressedFile);
        } catch (error) {
          console.error('Audio compression failed:', error);
          resolve(file); // Fallback to original
        }
      };
      
      fileReader.onerror = () => reject(new Error('Failed to read file'));
      fileReader.readAsArrayBuffer(file);
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

  // Video to audio extraction
  const extractAudioFromVideo = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      video.onloadedmetadata = () => {
        video.currentTime = 0;
      };
      
      video.oncanplay = () => {
        // Create audio context and extract audio
        const source = audioContext.createMediaElementSource(video);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        // For simplicity, we'll just return the original file
        // In a production app, you'd use Web Audio API to extract audio
        resolve(file);
      };
      
      video.onerror = () => reject(new Error('Failed to process video'));
      video.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Validate file type and size
      const maxSize = 25 * 1024 * 1024; // 25MB limit
      if (file.size > maxSize) {
        onError('File too large. Maximum size is 25MB.');
        return;
      }
      
      const supportedTypes = ['audio/', 'video/'];
      const isSupported = supportedTypes.some(type => file.type.startsWith(type));
      
      if (!isSupported) {
        onError('Unsupported file type. Please upload audio or video files.');
        return;
      }
      
      let processedFile = file;
      
      // Compress audio files
      if (file.type.startsWith('audio/')) {
        processedFile = await compressAudioFile(file);
      }
      
      // Extract audio from video files
      if (file.type.startsWith('video/')) {
        processedFile = await extractAudioFromVideo(file);
      }
      
      onFile(processedFile);
      
    } catch (error) {
      console.error('File processing error:', error);
      onError('Failed to process file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isProcessing ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-600">Processing file...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-gray-600">
              Drag and drop audio/video files here, or{' '}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500 font-medium"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500">Supports MP3, WAV, MP4, WebM (max 25MB)</p>
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
