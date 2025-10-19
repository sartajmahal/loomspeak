class MicToMP3Transcriber {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioContext = null;
        this.isRecording = false;
        this.currentMP3Blob = null;
        this.currentFilename = null;
        
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.transcribeBtn = document.getElementById('transcribeBtn');
        this.status = document.getElementById('status');
        this.downloadSection = document.getElementById('downloadSection');
        this.fileInfo = document.getElementById('fileInfo');
        this.transcriptionSection = document.getElementById('transcriptionSection');
        this.transcriptionResult = document.getElementById('transcriptionResult');
        
        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.transcribeUploadBtn = document.getElementById('transcribeUploadBtn');
        this.uploadedFile = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.transcribeBtn.addEventListener('click', () => this.transcribeAudio());
        
        // Upload event listeners
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.transcribeUploadBtn.addEventListener('click', () => this.transcribeUploadedFile());
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Copy button
        document.getElementById('copyBtn').addEventListener('click', () => this.copyTranscription());
    }
    
    async startRecording() {
        try {
            this.updateStatus('Requesting microphone access...', 'info');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 44100,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.convertToMP3();
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start(100);
            this.isRecording = true;
            
            this.updateUI(true);
            this.updateStatus('🎤 Recording... Click "Stop Recording" when done', 'recording');
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.updateStatus('❌ Error: Could not access microphone. Please check permissions.', 'error');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateUI(false);
            this.updateStatus('🔄 Processing audio...', 'processing');
        }
    }
    
    async convertToMP3() {
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const mp3Blob = await this.webmToMP3(audioBlob);
            
            this.currentMP3Blob = mp3Blob;
            await this.saveToServer(mp3Blob);
            
        } catch (error) {
            console.error('Error converting to MP3:', error);
            this.updateStatus('❌ Error converting audio to MP3', 'error');
        }
    }
    
    async saveToServer(mp3Blob) {
        try {
            this.updateStatus('💾 Saving MP3 file...', 'processing');
            
            const formData = new FormData();
            this.currentFilename = `recording-${Date.now()}.mp3`;
            formData.append('audio', mp3Blob, this.currentFilename);
            
            const response = await fetch('/save-mp3', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.updateStatus(`✅ Recording saved as: ${result.filename}`, 'success');
                this.showSavedFile(result.filename);
                this.transcribeBtn.disabled = false;
            } else {
                throw new Error('Failed to save file to server');
            }
            
        } catch (error) {
            console.error('Error saving to server:', error);
            this.updateStatus('❌ Error saving file. Using download fallback.', 'error');
            this.showDownloadFallback(mp3Blob);
        }
    }
    
    async transcribeAudio() {
        if (!this.currentMP3Blob) {
            this.updateStatus('❌ No audio file available for transcription', 'error');
            return;
        }
        
        try {
            this.updateStatus('🤖 Transcribing audio to text...', 'processing');
            this.transcribeBtn.disabled = true;
            this.transcribeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Transcribing...';
            
            const formData = new FormData();
            formData.append('audio', this.currentMP3Blob, this.currentFilename);
            
            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showTranscriptionResult(result.transcript);
                this.updateStatus('✅ Transcription complete!', 'success');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Transcription failed');
            }
            
        } catch (error) {
            console.error('Error transcribing audio:', error);
            this.updateStatus(`❌ Transcription error: ${error.message}`, 'error');
            this.showTranscriptionResult('Error: ' + error.message);
        } finally {
            this.transcribeBtn.disabled = false;
            this.transcribeBtn.innerHTML = '<i class="fas fa-file-text mr-2"></i>Transcribe to Text';
        }
    }
    
    showTranscriptionResult(transcript) {
        this.transcriptionResult.textContent = transcript || 'No transcription available';
        this.transcriptionSection.style.display = 'block';
        this.transcriptionSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    showSavedFile(filename) {
        this.fileInfo.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle text-green-600 mr-2"></i>
                <div>
                    <p class="font-medium">Recording saved successfully!</p>
                    <p class="text-sm opacity-75">File: ${filename}</p>
                    <p class="text-sm opacity-75">Location: ./recordings/ folder</p>
                </div>
            </div>
        `;
        this.downloadSection.style.display = 'block';
    }
    
    showDownloadFallback(mp3Blob) {
        const url = URL.createObjectURL(mp3Blob);
        this.fileInfo.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
                <div>
                    <p class="font-medium">Server save failed. Download your MP3:</p>
                    <a href="${url}" download="${this.currentFilename}" class="inline-block mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        <i class="fas fa-download mr-1"></i>Download MP3
                    </a>
                </div>
            </div>
        `;
        this.downloadSection.style.display = 'block';
    }
    
    // File upload methods
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processSelectedFile(file);
        }
    }
    
    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('border-primary-500', 'bg-primary-100');
    }
    
    handleDragLeave(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('border-primary-500', 'bg-primary-100');
    }
    
    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('border-primary-500', 'bg-primary-100');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processSelectedFile(files[0]);
        }
    }
    
    processSelectedFile(file) {
        // Validate file type
        if (!file.type.startsWith('audio/')) {
            this.updateStatus('❌ Please select an audio file', 'error');
            return;
        }
        
        // Validate file size (25MB limit)
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (file.size > maxSize) {
            this.updateStatus('❌ File too large. Maximum size is 25MB', 'error');
            return;
        }
        
        this.uploadedFile = file;
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
        
        this.updateStatus(`📁 File selected: ${file.name}`, 'success');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async transcribeUploadedFile() {
        if (!this.uploadedFile) {
            this.updateStatus('❌ No file selected for transcription', 'error');
            return;
        }
        
        try {
            this.updateStatus('🤖 Transcribing uploaded file...', 'processing');
            this.transcribeUploadBtn.disabled = true;
            this.transcribeUploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Transcribing...';
            
            const formData = new FormData();
            formData.append('audio', this.uploadedFile, this.uploadedFile.name);
            
            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showTranscriptionResult(result.transcript);
                this.updateStatus('✅ Transcription complete!', 'success');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Transcription failed');
            }
            
        } catch (error) {
            console.error('Error transcribing uploaded file:', error);
            this.updateStatus(`❌ Transcription error: ${error.message}`, 'error');
            this.showTranscriptionResult('Error: ' + error.message);
        } finally {
            this.transcribeUploadBtn.disabled = false;
            this.transcribeUploadBtn.innerHTML = '<i class="fas fa-file-text mr-2"></i>Transcribe File';
        }
    }
    
    async webmToMP3(audioBlob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const arrayBuffer = reader.result;
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    const mp3Blob = this.audioBufferToMP3(audioBuffer);
                    resolve(mp3Blob);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(audioBlob);
        });
    }
    
    audioBufferToMP3(audioBuffer) {
        const sampleRate = audioBuffer.sampleRate;
        const channels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        
        const audioData = new Float32Array(length);
        if (channels === 1) {
            audioData.set(audioBuffer.getChannelData(0));
        } else {
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            for (let i = 0; i < length; i++) {
                audioData[i] = (left[i] + right[i]) / 2;
            }
        }
        
        const int16Data = new Int16Array(length);
        for (let i = 0; i < length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
        }
        
        const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
        const mp3Data = [];
        
        const blockSize = 1152;
        for (let i = 0; i < int16Data.length; i += blockSize) {
            const sampleChunk = int16Data.subarray(i, i + blockSize);
            const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }
        
        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
        
        const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
        return mp3Blob;
    }
    
    updateUI(recording) {
        this.startBtn.disabled = recording;
        this.stopBtn.disabled = !recording;
        
        if (recording) {
            this.startBtn.innerHTML = '<i class="fas fa-microphone mr-2"></i>Recording...';
            this.startBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg';
            this.stopBtn.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Recording';
            this.stopBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg';
        } else {
            this.startBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Start Recording';
            this.startBtn.className = 'bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg';
            this.stopBtn.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Recording';
            this.stopBtn.className = 'bg-gray-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg cursor-not-allowed';
        }
    }
    
    updateStatus(message, type = 'info') {
        this.status.textContent = message;
        
        // Remove existing status classes
        this.status.className = 'text-gray-600';
        
        // Add appropriate styling based on type
        switch (type) {
            case 'recording':
                this.status.className = 'text-red-600 font-medium';
                break;
            case 'processing':
                this.status.className = 'text-blue-600 font-medium';
                break;
            case 'success':
                this.status.className = 'text-green-600 font-medium';
                break;
            case 'error':
                this.status.className = 'text-red-600 font-medium';
                break;
            default:
                this.status.className = 'text-gray-600';
        }
    }
    
    copyTranscription() {
        const text = this.transcriptionResult.textContent;
        if (text && text !== 'No transcription available') {
            navigator.clipboard.writeText(text).then(() => {
                const copyBtn = document.getElementById('copyBtn');
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check mr-1"></i>Copied!';
                copyBtn.className = 'bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors';
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.className = 'bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MicToMP3Transcriber();
});
