import { AudioAnalysis, scoreAudioEngagement } from './audio';
import { SceneAnalysis, scoreVisualEngagement } from './scene';
import { SpeechAnalysis } from './speech';

export interface RetentionAnalysis {
  compositeScore: number; 
  audioScore: number;
  visualScore: number;
  speechScore: number;
  confidence: number; 
  signals: {
    audio: number;
    visual: number;
    speech: number;
    engagement: number;
  };
  reason: string; 
}

/**
 * Calculate composite retention score from all analyses
 */
export function calculateRetentionScore(
  audioAnalysis: AudioAnalysis,
  sceneAnalysis: SceneAnalysis,
  speechAnalysis: SpeechAnalysis,
  segmentMetadata: {
    position: number; // 0-1, where in video
    duration: number;
    totalDuration: number;
  }
): RetentionAnalysis {
  // Individual scores
  const audioScore = scoreAudioEngagement(audioAnalysis);
  const visualScore = scoreVisualEngagement(sceneAnalysis);
  const speechScore = speechAnalysis.speechScore;

  // Weighted composite score
  // Audio is most important (40%), then speech (35%), then visual (25%)
  let compositeScore = 
    audioScore * 0.40 +
    speechScore * 0.35 +
    visualScore * 0.25;

  // Position-based adjustments
  compositeScore = applyPositionBonus(compositeScore, segmentMetadata.position);

  // Duration-based adjustments
  compositeScore = applyDurationBonus(compositeScore, segmentMetadata.duration);

  // Calculate confidence (how much data we have)
  const confidence = calculateConfidence(audioAnalysis, sceneAnalysis, speechAnalysis);

  // Generate human-readable reason
  const reason = generateReason(audioScore, visualScore, speechScore, compositeScore);

  return {
    compositeScore: Math.max(0, Math.min(1, compositeScore)),
    audioScore,
    visualScore,
    speechScore,
    confidence,
    signals: {
      audio: audioScore,
      visual: visualScore,
      speech: speechScore,
      engagement: compositeScore,
    },
    reason,
  };
}

/**
 * Apply position bonus
 * Middle segments typically perform better
 */
function applyPositionBonus(score: number, position: number): number {
  // Slight boost for middle segments (0.3 - 0.7)
  if (position >= 0.3 && position <= 0.7) {
    return score * 1.05; // 5% boost
  }
  
  // Slight penalty for very early or very late
  if (position < 0.15 || position > 0.85) {
    return score * 0.95; // 5% penalty
  }
  
  return score;
}

/**
 * Apply duration bonus
 * Segments in the sweet spot (30-45s) get a bonus
 */
function applyDurationBonus(score: number, duration: number): number {
  if (duration >= 30 && duration <= 45) {
    return score * 1.03; // 3% boost for ideal duration
  }
  
  if (duration < 15 || duration > 60) {
    return score * 0.95; // 5% penalty for too short/long
  }
  
  return score;
}

/**
 * Calculate confidence in our score
 * More data = higher confidence
 */
function calculateConfidence(
  audio: AudioAnalysis,
  scene: SceneAnalysis,
  speech: SpeechAnalysis
): number {
  let confidence = 0.5; // Base confidence

  // Audio data available
  if (audio.loudMoments.length > 0) confidence += 0.15;
  if (audio.silencePeriods.length >= 0) confidence += 0.1;

  // Scene data available
  if (scene.sceneChanges.length > 0) confidence += 0.15;

  // Speech data available (most valuable)
  if (speech.totalWords > 0) confidence += 0.2;
  if (speech.viralTriggers.length > 0) confidence += 0.1;

  return Math.min(1, confidence);
}

/**
 * Generate human-readable explanation
 */
function generateReason(
  audioScore: number,
  visualScore: number,
  speechScore: number,
  compositeScore: number
): string {
  // Find dominant factor
  const scores = {
    audio: audioScore,
    visual: visualScore,
    speech: speechScore,
  };

  const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const factor = dominant[0];         

  // Generate reason based on composite score
  if (compositeScore >= 0.95) {
    return `Peak engagement detected - ${factor} signals are exceptional 🔥`;
  }
  
  if (compositeScore >= 0.9) {
    return `High retention moment - strong ${factor} performance ⚡`;
  }
  
  if (compositeScore >= 0.85) {
    return `Elevated engagement - ${factor} indicators are very good ✨`;
  }
  
  if (compositeScore >= 0.8) {
    return `Above-average retention - good ${factor} signals 📈`;
  }
  
  if (compositeScore >= 0.75) {
    return `Solid engagement - ${factor} shows promise 💡`;
  }
  
  if (compositeScore >= 0.7) {
    return `Moderate retention - adequate ${factor} 👍`;
  }
  
  return `Standard segment - baseline ${factor} 📊`;
}

/**
 * Rank segments by retention score
 * Returns top N segments
 */
export function rankSegments(
  analyses: Array<{ analysis: RetentionAnalysis; start: number; end: number }>,
  topN: number = 5
): Array<{ analysis: RetentionAnalysis; start: number; end: number; rank: number }> {
  return analyses
    .sort((a, b) => {
      // Primary: composite score
      if (b.analysis.compositeScore !== a.analysis.compositeScore) {
        return b.analysis.compositeScore - a.analysis.compositeScore;
      }
      
      // Secondary: confidence
      return b.analysis.confidence - a.analysis.confidence;
    })
    .slice(0, topN)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}