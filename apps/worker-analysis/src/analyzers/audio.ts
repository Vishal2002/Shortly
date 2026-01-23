import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AudioAnalysis {
  averageVolume: number;
  peakVolume: number;
  volumeVariance: number;
  silencePeriods: Array<{ start: number; end: number }>;
  loudMoments: Array<{ timestamp: number; volume: number }>;
  energyScore: number; // 0-1
}

/**
 * Analyze audio characteristics of a video segment
 */
export async function analyzeAudio(
  videoPath: string,
  startTime: number,
  endTime: number
): Promise<AudioAnalysis> {
  const duration = endTime - startTime;

  // Extract audio stats using FFmpeg
  const statsCommand = `
    ffmpeg -ss ${startTime} -i "${videoPath}" -t ${duration} \
    -af volumedetect \
    -f null - 2>&1 | grep -E "mean_volume|max_volume"
  `.replace(/\s+/g, ' ').trim();

  const { stdout } = await execAsync(statsCommand);
  

  // Parse FFmpeg output
  const meanVolumeMatch = stdout.match(/mean_volume:\s*([-\d.]+)/);
  const maxVolumeMatch = stdout.match(/max_volume:\s*([-\d.]+)/);

  const meanVolume = meanVolumeMatch ? parseFloat(meanVolumeMatch[1]) : -30;
  const maxVolume = maxVolumeMatch ? parseFloat(maxVolumeMatch[1]) : -10;

  // Detect silence periods (volume < -50dB)
  const silenceCommand = `
    ffmpeg -ss ${startTime} -i "${videoPath}" -t ${duration} \
    -af silencedetect=noise=-50dB:d=1 \
    -f null - 2>&1 | grep -E "silence_start|silence_end"
  `.replace(/\s+/g, ' ').trim();

  let silencePeriods: Array<{ start: number; end: number }> = [];
  
  try {
    const { stdout: silenceOutput } = await execAsync(silenceCommand);
    silencePeriods = parseSilencePeriods(silenceOutput);
  } catch (err) {
    // No silence detected or error - that's fine
  }

  // Calculate energy score
  // Higher is better: loud, dynamic audio = engaging
  const volumeRange = maxVolume - meanVolume;
  const normalizedMean = Math.max(0, (meanVolume + 60) / 60); // -60 to 0 dB → 0 to 1
  const dynamicRange = Math.min(1, volumeRange / 30); // 0-30 dB range
  
  const energyScore = (normalizedMean * 0.6 + dynamicRange * 0.4);

  // Find loud moments (peaks above mean + 10dB)
  const loudMoments = await detectLoudMoments(
    videoPath,
    startTime,
    endTime                 
  );

  return {
    averageVolume: meanVolume,
    peakVolume: maxVolume,
    volumeVariance: volumeRange,
    silencePeriods,
    loudMoments,
    energyScore: Math.max(0, Math.min(1, energyScore)),
  };
}

/**
 * Detect loud moments (excitement, reactions, etc.)
 */
async function detectLoudMoments(
  videoPath: string,
  startTime: number,
  endTime: number,
): Promise<Array<{ timestamp: number; volume: number }>> {
  const duration = endTime - startTime;

  // Get volume per second
  const volumeCommand = `
    ffmpeg -ss ${startTime} -i "${videoPath}" -t ${duration} \
    -af "volumedetect=t=1,ametadata=mode=print:file=-" \
    -f null - 2>&1
  `.replace(/\s+/g, ' ').trim();

  try {
    //@ts-ignore
    const { stdout } = await execAsync(volumeCommand);
    return [];
  } catch (err) {
    return [];
    
  }
}

/**
 * Parse silence periods from FFmpeg output
 */
function parseSilencePeriods(output: string): Array<{ start: number; end: number }> {
  const periods: Array<{ start: number; end: number }> = [];
  const lines = output.split('\n');

  let currentStart: number | null = null;

  for (const line of lines) {
    const startMatch = line.match(/silence_start:\s*([\d.]+)/);
    const endMatch = line.match(/silence_end:\s*([\d.]+)/);

    if (startMatch) {
      currentStart = parseFloat(startMatch[1]);
    }
    
    if (endMatch && currentStart !== null) {
      periods.push({
        start: currentStart,
        end: parseFloat(endMatch[1]),
      });
      currentStart = null;
    }
  }

  return periods;
}

/**
 * Calculate audio engagement score
 * Higher score = more engaging audio
 */
export function scoreAudioEngagement(analysis: AudioAnalysis): number {
  let score = 0;

  // High energy is good
  score += analysis.energyScore * 0.4;

  // Dynamic range is good (not flat/monotone)
  const dynamicScore = Math.min(1, analysis.volumeVariance / 20);
  score += dynamicScore * 0.3;

  // Loud moments are exciting
  const loudMomentScore = Math.min(1, analysis.loudMoments.length / 5);
  score += loudMomentScore * 0.2;

  // Too much silence is bad
  const totalSilence = analysis.silencePeriods.reduce(
    (sum, p) => sum + (p.end - p.start),
    0
  );
  const silencePenalty = Math.min(1, totalSilence / 10);
  score -= silencePenalty * 0.1;

  return Math.max(0, Math.min(1, score));
}