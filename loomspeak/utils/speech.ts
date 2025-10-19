import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { getGoogleAuth } from './google-auth';

const auth = getGoogleAuth();

// Initialize the Speech-to-Text client with application credentials
const speechClient = new SpeechClient({
  auth,
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

// Initialize Google Cloud Storage client
const storage = new Storage({
  auth,
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const bucketName = 'loomspeak-audio-files'; // You'll need to create this bucket in GCP

/**
 * Transcribes audio using Google Cloud Speech-to-Text API
 * @param audioFile - The audio file to transcribe
 * @returns The transcribed text
 */
export async function transcribeAudio(audioFile: File): Promise<string> {
  try {
    // Upload file to Cloud Storage first (for long audio files)
    const bucket = storage.bucket(bucketName);
    const filename = `${uuidv4()}-${audioFile.name}`;
    const file = bucket.file(filename);

    // Create a write stream and pipe the audio file
    const stream = file.createWriteStream({
      metadata: {
        contentType: audioFile.type,
      },
    });

    const buffer = await audioFile.arrayBuffer();
    stream.end(Buffer.from(buffer));

    // Wait for the upload to complete
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Create the audio configuration
    const audio = {
      uri: `gs://${bucketName}/${filename}`,
    };

    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_long', // Use the enhanced model for better accuracy
    };

    const request = {
      audio,
      config,
    };

    // Perform the transcription
    const [operation] = await speechClient.longRunningRecognize(request);
    const [response] = await operation.promise();

    // Delete the temporary file from Cloud Storage
    await file.delete();

    // Combine all transcriptions
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join(' ');

    return transcription;
  } catch (error) {
    console.error('Error in transcription:', error);
    throw error;
  }
}