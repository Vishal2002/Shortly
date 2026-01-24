import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import OpenAI from 'openai';

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
 * Generate viral-style captions with word-level timestamps
 * Perfect for TikTok/Reels/Shorts
 */
export async function generateViralCaptions(
  videoPath: string,
  startTime: number,
  endTime: number
): Promise<CaptionSegment[]> {
  const duration = endTime - startTime;

  // Extract audio
  const tempDir = `/tmp/captions-${Date.now()}`;
  await execAsync(`mkdir -p ${tempDir}`);
  const audioPath = path.join(tempDir, 'audio.mp3');

  try {
    await extractAudio(videoPath, startTime, duration, audioPath);

    // Get word-level transcription from Whisper
    const wordTimestamps = await transcribeWithWordTimestamps(audioPath);

    // Group words into caption segments (2-5 words per screen)
    const captionSegments = groupIntoSegments(wordTimestamps);

    // Enhance with styling and emojis
    const styledSegments = applyViralStyling(captionSegments);

    // Cleanup
    await execAsync(`rm -rf ${tempDir}`);

    return styledSegments;

  } catch (error: any) {
    console.error('Caption generation failed:', error.message);
    await execAsync(`rm -rf ${tempDir}`).catch(() => {});
    return [];
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
 * Transcribe with word-level timestamps using Whisper
 */
async function transcribeWithWordTimestamps(
  audioPath: string
): Promise<WordTimestamp[]> {
  try {
    // Use Whisper with word timestamps
    const response = await openai.audio.transcriptions.create({
      file: await fs.readFile(audioPath).then(buf => 
        new File([buf], 'audio.mp3', { type: 'audio/mpeg' })
      ),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    }) as any;

    if (response.words) {
      return response.words.map((w: any) => ({
        word: w.word.trim(),
        start: w.start,
        end: w.end,
      }));
    }

    // Fallback: split by spaces
    const words = response.text.split(/\s+/);
    const avgDuration = response.duration / words.length;

    return words.map((word: string, i: number) => ({
      word,
      start: i * avgDuration,
      end: (i + 1) * avgDuration,
    }));

  } catch (error) {
    console.error('Whisper word timestamps failed:', error);
    return [];
  }
}

/**
 * Group words into caption segments
 * Strategy: 2-4 words per segment, break at natural pauses
 */
function groupIntoSegments(words: WordTimestamp[]): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  let currentGroup: WordTimestamp[] = [];
  const TARGET_WORDS = 3; // Optimal for readability

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentGroup.push(word);

    // Decide if we should break here
    const shouldBreak = 
      currentGroup.length >= TARGET_WORDS && (
        // Natural pause (punctuation detected)
        /[,;.!?]/.test(word.word) ||
        // Long pause before next word
        (i < words.length - 1 && words[i + 1].start - word.end > 0.3) ||
        // Force break at max length
        currentGroup.length >= 5
      );

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
 * Apply viral styling: emojis, emphasis, hooks
 */
function applyViralStyling(segments: CaptionSegment[]): CaptionSegment[] {
  return segments.map((seg, index) => {
    const text = seg.text.toLowerCase();

    // Detect hooks (first segment with question/excitement)
    if (index === 0) {
      if (/\b(what|how|why|watch|wait|imagine)\b/i.test(text)) {
        return { ...seg, style: 'hook', emoji: '👀' };
      }
    }

    // Detect emphasis words
    if (/\b(amazing|crazy|insane|unbelievable|shocking|incredible)\b/i.test(text)) {
      return { ...seg, style: 'emphasis', emoji: '🔥' };
    }

    // Detect punchlines (exclamation marks, "but", "however")
    if (/[!]|but |however /i.test(text)) {
      return { ...seg, style: 'punchline', emoji: '💥' };
    }

    // Detect numbers (lists perform well)
    if (/\b\d+\b/.test(text)) {
      return { ...seg, style: 'emphasis', emoji: '✨' };
    }

    return seg;
  });
}

/**
 * Generate SRT subtitle file
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
 * Generate ASS subtitle file with styling
 * This enables custom fonts, colors, animations
 */
export function generateASS(segments: CaptionSegment[]): string {
  const header = `[Script Info]
Title: Viral Captions
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Normal,Arial Black,80,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,10,10,80,1
Style: Emphasis,Arial Black,90,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,110,110,0,0,1,5,3,2,10,10,80,1
Style: Hook,Arial Black,95,&H0000FF00,&H000000FF,&H00000000,&H80000000,-1,0,0,0,115,115,0,0,1,5,3,2,10,10,80,1
Style: Punchline,Arial Black,85,&H000080FF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,105,105,0,0,1,5,3,2,10,10,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = segments.map(seg => {
    const start = formatASSTime(seg.start);
    const end = formatASSTime(seg.end);
    const style = seg.style === 'normal' ? 'Normal' :
                  seg.style === 'emphasis' ? 'Emphasis' :
                  seg.style === 'hook' ? 'Hook' : 'Punchline';
    const text = seg.emoji ? `${seg.emoji} ${seg.text}` : seg.text;

    return `Dialogue: 0,${start},${end},${style},,0,0,0,,${text}`;
  }).join('\n');

  return header + events;
}

/**
 * Burn captions into video using FFmpeg
 */
/**
 * Burn captions into video using FFmpeg - IMPROVED VERSION
 */
export async function burnCaptions(
  videoPath: string,
  captionsPath: string,
  outputPath: string,
  format: 'srt' | 'ass' = 'srt' // Default to SRT for better compatibility
): Promise<void> {
  let command: string;

  if (format === 'srt') {
    // Use subtitles filter with force_style for SRT
    // This is more reliable than ASS in many cases
    const style = [
      "FontName=Arial Black",
      "FontSize=28",
      "PrimaryColour=&HFFFFFF",
      "OutlineColour=&H000000",
      "BorderStyle=3",
      "Outline=3",
      "Shadow=2",
      "Bold=1",
      "Alignment=2" // Bottom center
    ].join(',');

    command = `
      ffmpeg -i "${videoPath}" \
      -vf "subtitles='${captionsPath}':force_style='${style}'" \
      -c:v libx264 -preset medium -crf 23 \
      -c:a copy -movflags +faststart \
      -y "${outputPath}"
    `.replace(/\s+/g, ' ').trim();
  } else {
    // ASS format - requires proper path escaping
    const escapedPath = captionsPath.replace(/\\/g, '/').replace(/'/g, "'\\''");
    
    command = `
      ffmpeg -i "${videoPath}" \
      -vf "ass='${escapedPath}'" \
      -c:v libx264 -preset medium -crf 23 \
      -c:a copy -movflags +faststart \
      -y "${outputPath}"
    `.replace(/\s+/g, ' ').trim();
  }

  console.log(`🔥 Burning ${format.toUpperCase()} captions into video...`);
  console.log(`Command: ${command.substring(0, 150)}...`);
  
  try {
    const {  stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    if (stderr && !stderr.includes('frame=')) {
      console.warn('FFmpeg warnings:', stderr.substring(0, 500));
    }
    
    console.log('✅ Captions burned successfully');
  } catch (error: any) {
    console.error('❌ Caption burning failed:', error.message);
    console.error('Full command:', command);
    throw new Error(`Failed to burn captions: ${error.message}`);
  }
}

// Helper functions

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

