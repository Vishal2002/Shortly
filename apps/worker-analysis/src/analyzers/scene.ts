import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SceneChange {
  timestamp: number;
  score: number; // 0-1, how dramatic the change is
}

export interface SceneAnalysis {
  scenes: Array<{ start: number; end: number }>;
  sceneChanges: SceneChange[];
  averageSceneLength: number;
  sceneChangeRate: number; // changes per minute
}

/**
 * Detect scene changes using FFmpeg's scene detection filter
 */
export async function detectScenes(
  videoPath: string,
  startTime: number,
  endTime: number,
  threshold: number = 0.3 // 0-1, higher = only dramatic changes
): Promise<SceneAnalysis> {
  const duration = endTime - startTime;

  // FFmpeg scene detection
  // This outputs timestamps where scenes change
  const sceneCommand = `
    ffmpeg -ss ${startTime} -i "${videoPath}" -t ${duration} \
    -vf "select='gt(scene,${threshold})',showinfo" \
    -f null - 2>&1 | grep -E "pts_time"
  `.replace(/\s+/g, ' ').trim();

  let sceneChanges: SceneChange[] = [];

  try {
    const { stdout } = await execAsync(sceneCommand);
    sceneChanges = parseSceneChanges(stdout, startTime);
  } catch (err) {
    console.warn('Scene detection failed, using defaults');
  }

  // Build scene segments
  const scenes = buildSceneSegments(sceneChanges, startTime, endTime);

  // Calculate stats
  const averageSceneLength = scenes.length > 0
    ? scenes.reduce((sum, s) => sum + (s.end - s.start), 0) / scenes.length
    : duration;

  const sceneChangeRate = (sceneChanges.length / duration) * 60; // per minute

  return {
    scenes,
    sceneChanges,
    averageSceneLength,
    sceneChangeRate,
  };
}

/**
 * Parse scene change timestamps from FFmpeg output
 */
function parseSceneChanges(output: string, offset: number): SceneChange[] {
  const changes: SceneChange[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/pts_time:([\d.]+)/);
    if (match) {
      const timestamp = parseFloat(match[1]) + offset;
      changes.push({
        timestamp,
        score: 0.5, // Default score, could be extracted from scene score
      });
    }
  }

  return changes.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Build scene segments from change points
 */
function buildSceneSegments(
  changes: SceneChange[],
  startTime: number,
  endTime: number
): Array<{ start: number; end: number }> {
  if (changes.length === 0) {
    return [{ start: startTime, end: endTime }];
  }

  const scenes: Array<{ start: number; end: number }> = [];

  // First scene
  scenes.push({
    start: startTime,
    end: changes[0].timestamp,
  });

  // Middle scenes
  for (let i = 0; i < changes.length - 1; i++) {
    scenes.push({
      start: changes[i].timestamp,
      end: changes[i + 1].timestamp,
    });
  }

  // Last scene
  scenes.push({
    start: changes[changes.length - 1].timestamp,
    end: endTime,
  });

  return scenes;
}

/**
 * Find the best scene boundary near a target timestamp
 * Useful for deciding where to cut clips
 */
export function findNearestSceneBoundary(
  sceneChanges: SceneChange[],
  targetTime: number,
  maxDistance: number = 5 // seconds
): number | null {
  let nearest: SceneChange | null = null;
  let minDistance = Infinity;

  for (const change of sceneChanges) {
    const distance = Math.abs(change.timestamp - targetTime);
    
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      nearest = change;
    }
  }

  return nearest ? nearest.timestamp : null;
}

/**
 * Score visual engagement based on scene changes
 * More dynamic = higher score (but not too chaotic)
 */
export function scoreVisualEngagement(analysis: SceneAnalysis): number {
  let score = 0;

  // Moderate scene change rate is good (not too slow, not too fast)
  const idealRate = 8; // changes per minute
  const rateDiff = Math.abs(analysis.sceneChangeRate - idealRate);
  const rateScore = Math.max(0, 1 - (rateDiff / idealRate));
  score += rateScore * 0.6;

  // Varied scene lengths = dynamic content
  const hasVariety = analysis.scenes.length > 1;
  score += hasVariety ? 0.4 : 0;

  return Math.max(0, Math.min(1, score));
}