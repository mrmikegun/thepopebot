import { AssemblyAI } from 'assemblyai';
import { getConfig } from '../config.js';

function isAssemblyAIEnabled() {
  return Boolean(getConfig('ASSEMBLYAI_API_KEY'));
}

async function transcribeAudio(audioBuffer) {
  const client = new AssemblyAI({ apiKey: getConfig('ASSEMBLYAI_API_KEY') });
  const transcript = await client.transcripts.transcribe({ audio: audioBuffer });
  if (transcript.status === 'error') {
    throw new Error(`AssemblyAI error: ${transcript.error}`);
  }
  return transcript.text;
}

export { isAssemblyAIEnabled, transcribeAudio };
