import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface Transcript {
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface SpeechAnalysis {
  transcripts: Transcript[];
  totalWords: number;
  speechDensity: number; // words per second
  keyPhrases: string[];
  viralTriggers: Array<{ phrase: string; timestamp: number; score: number }>;
  speechScore: number;
}

/**
 * Analyze speech content using Whisper API (OpenAI)
 * Note: Requires OPENAI_API_KEY environment variable
 */
export async function analyzeSpeech(
  videoPath: string,
  startTime: number,
  endTime: number
): Promise<SpeechAnalysis> {
  const duration = endTime - startTime;

  // Extract audio for Whisper
  const tempDir = `/tmp/speech-${Date.now()}`;
  await execAsync(`mkdir -p ${tempDir}`);
  
  const audioPath = path.join(tempDir, 'audio.mp3');

  try {
    // Extract audio segment
    await extractAudio(videoPath, startTime, duration, audioPath);

    // Transcribe with Whisper
    const transcripts = await transcribeWithWhisper(audioPath);

    // Analyze transcript
    const analysis = analyzeTranscript(transcripts, duration);

    // Cleanup
    await execAsync(`rm -rf ${tempDir}`);

    return analysis;

  } catch (error: any) {
    // Cleanup on error
    await execAsync(`rm -rf ${tempDir}`).catch(() => {});
    
    console.warn('Speech analysis failed:', error.message);
    
    // Return empty analysis
    return {
      transcripts: [],
      totalWords: 0,
      speechDensity: 0,
      keyPhrases: [],
      viralTriggers: [],
      speechScore: 0.5, // Neutral score
    };
  }
}

/**
 * Extract audio from video segment
 */
async function extractAudio(
  videoPath: string,
  startTime: number,
  duration: number,
  outputPath: string
): Promise<void> {
  const command = `
    ffmpeg -ss ${startTime} -i "${videoPath}" -t ${duration} \
    -vn -acodec libmp3lame -b:a 128k -y "${outputPath}"
  `.replace(/\s+/g, ' ').trim();

  await execAsync(command);
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithWhisper(audioPath: string): Promise<Transcript[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('OPENAI_API_KEY not set, skipping speech analysis');
    return [];
  }

  // Use Whisper API (or local Whisper model)
  // For now, this is a placeholder - you'd implement actual API call
  
  // Example with OpenAI SDK (install with: pnpm add openai)
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath));
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities', 'segment');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    const data = await response.json() as any;

    // Parse Whisper response
    return data.segments?.map((seg: any) => ({
      text: seg.text,
      startTime: seg.start,
      endTime: seg.end,
      confidence: seg.confidence || 1,
    })) || [];

  } catch (error) {
    console.error('Whisper API error:', error);
    return [];
  }
}

/**
 * Analyze transcript for engagement signals
 */
function analyzeTranscript(
  transcripts: Transcript[],
  duration: number
): SpeechAnalysis {
  // Combine all text
  const fullText = transcripts.map(t => t.text).join(' ');
  const words = fullText.split(/\s+/).filter(w => w.length > 0);

  // Calculate speech density
  const speechDensity = words.length / duration;

  // Find key phrases (viral triggers)
  const viralTriggers = detectViralPhrases(transcripts);

  // Extract important phrases
  const keyPhrases = extractKeyPhrases(fullText);

  // Calculate speech engagement score
  const speechScore = calculateSpeechScore({
    wordCount: words.length,
    speechDensity,
    viralTriggerCount: viralTriggers.length,
    keyPhraseCount: keyPhrases.length,
  });

  return {
    transcripts,
    totalWords: words.length,
    speechDensity,
    keyPhrases,
    viralTriggers,
    speechScore,
  };
}

/**
 * Detect viral trigger phrases
 * These are words/phrases that indicate engaging content
 */
function detectViralPhrases(
  transcripts: Transcript[]
): Array<{ phrase: string; timestamp: number; score: number }> {
  const triggers: Array<{ phrase: string; timestamp: number; score: number }> = [];

  // Viral keywords (update based on your niche)
  const viralKeywords = [
    // Questions (high engagement)
    { pattern: /\b(what|how|why|when|where)\b/i, score: 0.8 },
    
    // Excitement
    { pattern: /\b(amazing|incredible|insane|crazy|wow|unbelievable)\b/i, score: 0.9 },
    
    // Controversy
    { pattern: /\b(secret|truth|exposed|reveal|hidden)\b/i, score: 0.85 },
    
    // Action words
    { pattern: /\b(watch|look|see|check|discover)\b/i, score: 0.7 },
    
    // Numbers (lists perform well)
    { pattern: /\b(\d+\s+(ways|tips|tricks|secrets|things|reasons))\b/i, score: 0.8 },
    
    // Call to action
    { pattern: /\b(subscribe|like|comment|share|follow)\b/i, score: 0.6 },
  ];

  for (const transcript of transcripts) {
    for (const { pattern, score } of viralKeywords) {
      const matches = transcript.text.match(pattern);
      if (matches) {
        triggers.push({
          phrase: matches[0],
          timestamp: transcript.startTime,
          score,
        });
      }
    }
  }

  return triggers.sort((a, b) => b.score - a.score);
}

/**
 * Extract key phrases from text
 */
function extractKeyPhrases(text: string): string[] {
  // Simple extraction - in production, use NLP library
  const words = text.toLowerCase().split(/\s+/);
  const phrases = new Set<string>();

  // Find 2-3 word phrases
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = words.slice(i, i + 3).join(' ');
    if (phrase.length > 10) {
      phrases.add(phrase);
    }
  }

  return Array.from(phrases).slice(0, 10);
}

/**
 * Calculate speech engagement score
 */
function calculateSpeechScore(metrics: {
  wordCount: number;
  speechDensity: number;
  viralTriggerCount: number;
  keyPhraseCount: number;
}): number {
  let score = 0;

  // Good speech density (2-4 words/second is ideal)
  const idealDensity = 3;
  const densityDiff = Math.abs(metrics.speechDensity - idealDensity);
  const densityScore = Math.max(0, 1 - (densityDiff / idealDensity));
  score += densityScore * 0.4;

  // Viral triggers present
  const triggerScore = Math.min(1, metrics.viralTriggerCount / 3);
  score += triggerScore * 0.4;

  // Has content (not silence)
  const hasContent = metrics.wordCount > 10 ? 0.2 : 0;
  score += hasContent;

  return Math.max(0, Math.min(1, score));
}