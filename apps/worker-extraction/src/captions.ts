import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import OpenAI from 'openai';

const execAsync = promisify(exec);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000,
});

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface CaptionSegment {
  text: string;
  start: number;
  end: number;
  words: WordTimestamp[];
  style: 'normal' | 'emphasis' | 'hook' | 'punchline';
  emoji?: string;
}

/**
 * Main function: Generate viral-style captions with timestamps
 */
export async function generateViralCaptions(
  videoPath: string,
  startTime: number,
  endTime: number
): Promise<CaptionSegment[]> {
  const duration = endTime - startTime;
  const tempDir = `/tmp/captions-${Date.now()}`;

  try {
    await fs.mkdir(tempDir, { recursive: true });
    const audioPath = path.join(tempDir, 'audio.mp3');

    console.log('🎤 Extracting audio segment...');
    await extractAudio(videoPath, startTime, duration, audioPath);

    console.log('🔤 Transcribing with Whisper (word-level timestamps)...');
    const wordTimestamps = await transcribeWithWhisper(audioPath);

    if (wordTimestamps.length === 0) {
      console.warn('No words transcribed → returning empty captions');
      return [];
    }

    console.log(`Transcribed ${wordTimestamps.length} words`);

    const analysis = analyzeTranscript(wordTimestamps, duration);
    const rawSegments = groupIntoSegments(analysis.words);
    const styledSegments = applyViralStyling(rawSegments);

    return styledSegments;

  } catch (error: any) {
    console.error('Caption generation failed:', error.message);
    return [];
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Extract audio segment from video
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
 * Transcribe audio with word-level timestamps using Whisper
 */
async function transcribeWithWhisper(audioPath: string): Promise<WordTimestamp[]> {
  try {
    const fileBuffer = await fs.readFile(audioPath);
    const file = new File([fileBuffer], 'audio.mp3', { type: 'audio/mpeg' });

    console.log('Sending audio to Whisper API...');
    const result = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
      language: 'en', // change if needed
      temperature: 0,
    }) as any;

    if (result.words && result.words.length > 0) {
      console.log(`Whisper returned ${result.words.length} word timestamps`);
      return result.words.map((w: any) => ({
        word: w.word.trim(),
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      }));
    }

    // Fallback: split text evenly
    console.warn('No word timestamps → falling back to text split');
    const words = result.text.split(/\s+/);
    const avgDuration = (result.duration || 30) / words.length;

    return words.map((word: string, i: number) => ({
      word,
      start: i * avgDuration,
      end: (i + 1) * avgDuration,
    }));

  } catch (error: any) {
    console.error('Whisper transcription failed:', error.message);
    return [];
  }
}

/**
 * Analyze transcript (basic metrics)
 */
function analyzeTranscript(words: WordTimestamp[], duration: number) {
  return {
    words: words.map(w => ({
      word: w.word.trim(),
      start: w.start,
      end: w.end,
    })),
    totalWords: words.length,
    speechDensity: duration > 0 ? words.length / duration : 0,
  };
}

/**
 * Group words into readable caption segments (2-5 words)
 */
function groupIntoSegments(words: WordTimestamp[]): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  let currentGroup: WordTimestamp[] = [];
  const TARGET_WORDS = 3;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentGroup.push(word);

    const shouldBreak =
      currentGroup.length >= TARGET_WORDS &&
      ( /[,;.!?]/.test(word.word) ||
        (i < words.length - 1 && words[i + 1].start - word.end > 0.3) ||
        currentGroup.length >= 5 );

    if (shouldBreak || i === words.length - 1) {
      segments.push({
        text: currentGroup.map(w => w.word).join(' ').trim(),
        start: currentGroup[0].start,
        end: currentGroup[currentGroup.length - 1].end,
        words: [...currentGroup],
        style: 'normal',
      });
      currentGroup = [];
    }
  }

  return segments;
}

/**
 * Apply viral styling (hooks, emphasis, emojis)
 */
function applyViralStyling(segments: CaptionSegment[]): CaptionSegment[] {
  return segments.map((seg, index) => {
    const text = seg.text.toLowerCase();

    if (index === 0 && /\b(what|how|why|watch|wait|imagine)\b/i.test(text)) {
      return { ...seg, style: 'hook', emoji: '👀' };
    }

    if (/\b(amazing|crazy|insane|unbelievable|shocking|incredible)\b/i.test(text)) {
      return { ...seg, style: 'emphasis', emoji: '🔥' };
    }

    if (/[!]|but |however /i.test(text)) {
      return { ...seg, style: 'punchline', emoji: '💥' };
    }

    if (/\b\d+\b/.test(text)) {
      return { ...seg, style: 'emphasis', emoji: '✨' };
    }

    return seg;
  });
}

/**
 * Generate SRT file (simple, reliable for fallback)
 */
export function generateSRT(segments: CaptionSegment[]): string {
  return segments.map((seg, index) => {
    const start = formatSRTTime(seg.start);
    const end = formatSRTTime(seg.end);
    const text = seg.emoji ? `${seg.emoji} ${seg.text}` : seg.text;

    return `${index + 1}\n${start} --> ${end}\n${text}\n`;
  }).join('\n');
}

/**
 * Generate ASS file with styling (better for custom looks)
 */
export function generateASS(segments: CaptionSegment[]): string {
  const header = `[Script Info]
Title: Viral Captions
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Normal,Arial Black,70,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,10,10,60,1
Style: Emphasis,Arial Black,80,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,110,110,0,0,1,4,2,2,10,10,60,1
Style: Hook,Arial Black,85,&H0000FF00,&H000000FF,&H00000000,&H80000000,-1,0,0,0,115,115,0,0,1,4,2,2,10,10,60,1
Style: Punchline,Arial Black,75,&H000080FF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,105,105,0,0,1,4,2,2,10,10,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = segments.map(seg => {
    const start = formatASSTime(seg.start);
    const end = formatASSTime(seg.end);
    const style = seg.style.charAt(0).toUpperCase() + seg.style.slice(1);
    const text = seg.emoji ? `${seg.emoji} ${seg.text}` : seg.text;

    return `Dialogue: 0,${start},${end},${style},,0,0,0,,${text}`;
  }).join('\n');

  return header + events;
}

/**
 * Burn subtitles into video (ASS preferred, SRT fallback)
 * Based on: https://trac.ffmpeg.org/wiki/HowToBurnSubtitlesIntoVideo
 */
export async function burnCaptions(
  videoPath: string,
  captionsPath: string,
  outputPath: string,
  format: 'srt' | 'ass' = 'ass'
): Promise<void> {
  console.log(`\n🔥 Starting caption burn (${format.toUpperCase()})`);
  console.log('  Input:', videoPath);
  console.log('  Subtitles:', captionsPath);
  console.log('  Output:', outputPath);

  // Verify input files exist
  if (!(await fs.stat(videoPath).catch(() => false))) throw new Error('Video file not found');
  if (!(await fs.stat(captionsPath).catch(() => false))) throw new Error('Subtitle file not found');

  let command: string;

  if (format === 'ass') {
    const escapedAss = captionsPath.replace(/'/g, "'\\''");
    command = `
      ffmpeg -i "${videoPath.replace(/"/g, '\\"')}" \
      -vf "ass=${escapedAss}" \
      -c:v libx264 -preset medium -crf 23 \
      -c:a copy -y "${outputPath.replace(/"/g, '\\"')}"
    `.replace(/\s+/g, ' ').trim();
  } else {
    const style = "FontName=Arial,FontSize=28,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,Outline=2,Shadow=1,Bold=1,Alignment=2,MarginV=40";
    command = `
      ffmpeg -i "${videoPath.replace(/"/g, '\\"')}" \
      -vf "subtitles=${captionsPath.replace(/'/g, "'\\''")}:force_style='${style}'" \
      -c:v libx264 -preset medium -crf 23 \
      -c:a copy -y "${outputPath.replace(/"/g, '\\"')}"
    `.replace(/\s+/g, ' ').trim();
  }

  console.log('FFmpeg command:', command);

  try {
    const { stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 5 });

    if (stderr) {
      console.warn('FFmpeg warnings/errors:', stderr.slice(0, 2000));
    }

    const stat = await fs.stat(outputPath);
    console.log(`Burn complete → output size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
  } catch (err: any) {
    console.error('FFmpeg burn FAILED:', err.message);
    if (err.stderr) console.error('Stderr:', err.stderr);
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────
// Time formatting helpers
// ──────────────────────────────────────────────────────────────

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function formatASSTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

function pad(num: number, length: number = 2): string {
  return num.toString().padStart(length, '0');
}