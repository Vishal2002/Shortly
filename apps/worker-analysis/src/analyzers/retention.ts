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
 * Detect if segment has a strong "hook" (attention-grabbing opening)
 * Critical for Shorts/TikTok - first 3 seconds determine retention
 */
function detectHook(
    speech: SpeechAnalysis,
    audio: AudioAnalysis,
    position: number
  ): boolean {
    // Check for hook indicators in speech
    const earlyTranscripts = speech.transcripts.filter(t => t.startTime < 3);
    const hasQuestionHook = earlyTranscripts.some(t => 
      /\b(what|how|why|did you know|imagine|watch)\b/i.test(t.text)
    );
    
    const hasExcitementHook = earlyTranscripts.some(t =>
      /\b(wait|no way|crazy|insane|shocking|unbelievable)\b/i.test(t.text)
    );
  
    // Check for audio hook (loud opening, dramatic sound)
    const hasAudioHook = audio.loudMoments.some(m => m.timestamp < 3);
  
    // Bonus for segments early in video (original hooks)
    const isEarlyInVideo = position < 0.3;
  
    return (hasQuestionHook || hasExcitementHook || hasAudioHook) && isEarlyInVideo;
  }

/**
 * Calculate composite retention score from all analyses
 */
export function calculateRetentionScore(
    audioAnalysis: AudioAnalysis,
    sceneAnalysis: SceneAnalysis,
    speechAnalysis: SpeechAnalysis,
    segmentMetadata: {
      position: number;
      duration: number;
      totalDuration: number;
    }
  ): RetentionAnalysis {
    const audioScore = scoreAudioEngagement(audioAnalysis);
    const visualScore = scoreVisualEngagement(sceneAnalysis);
    let speechScore = speechAnalysis.speechScore;
  
    // NEW: Hook detection bonus (very powerful for retention)
    const hasStrongHook = detectHook(speechAnalysis, audioAnalysis, segmentMetadata.position);
    if (hasStrongHook) {
      speechScore = Math.min(1, speechScore + 0.25); // big boost if hook present
      console.log(`Strong hook detected → speech score boosted to ${speechScore.toFixed(2)}`);
    }
  
    // Weighted composite score
    let compositeScore =
      audioScore * 0.40 +
      speechScore * 0.35 +
      visualScore * 0.25;
  
    // Apply position & duration bonuses
    compositeScore = applyPositionBonus(compositeScore, segmentMetadata.position);
    compositeScore = applyDurationBonus(compositeScore, segmentMetadata.duration);
  
    const confidence = calculateConfidence(audioAnalysis, sceneAnalysis, speechAnalysis);
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
      reason: hasStrongHook
        ? `${reason} + strong opening hook detected!`
        : reason,
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
 * Rank segments by retention score with overlap removal
 * Returns top N segments that don't overlap
 */
export function rankSegments(
    analyses: Array<{ 
      analysis: RetentionAnalysis; 
      start: number; 
      end: number;
      audio: AudioAnalysis;
      scenes: SceneAnalysis;
      speech: SpeechAnalysis;
    }>,
    topN: number = 5
  ): Array<{ 
    analysis: RetentionAnalysis; 
    start: number; 
    end: number; 
    rank: number;
    adjustedStart?: number;
    adjustedEnd?: number;
  }> {
    // Sort by score
    const sorted = analyses.sort((a, b) => {
      if (b.analysis.compositeScore !== a.analysis.compositeScore) {
        return b.analysis.compositeScore - a.analysis.compositeScore;
      }
      return b.analysis.confidence - a.analysis.confidence;
    });
  
    // Select non-overlapping segments
    const selected: Array<{ 
      analysis: RetentionAnalysis; 
      start: number; 
      end: number; 
      rank: number;
      adjustedStart?: number;
      adjustedEnd?: number;
    }> = [];
  
    for (const candidate of sorted) {
      if (selected.length >= topN) break;
  
      // Check for overlap with already selected segments
      const hasOverlap = selected.some(s => 
        (candidate.start >= s.start && candidate.start < s.end) ||
        (candidate.end > s.start && candidate.end <= s.end) ||
        (candidate.start <= s.start && candidate.end >= s.end)
      );
  
      if (!hasOverlap) {
        // Adjust boundaries for better clips
        const adjusted = adjustSegmentBoundaries(
          candidate.start,
          candidate.end,
          candidate.scenes,
          candidate.speech
        );
  
        selected.push({
          ...candidate,
          adjustedStart: adjusted.start,
          adjustedEnd: adjusted.end,
          rank: selected.length + 1,
        });
      }
    }
  
    return selected;
  }

/**
 * Adjust segment boundaries to align with scene changes and speech
 * Ensures clips don't start/end awkwardly
 */
function adjustSegmentBoundaries(
    start: number,
    end: number,
    scenes: SceneAnalysis,
    speech: SpeechAnalysis
  ): { start: number; end: number } {
    let adjustedStart = start;
    let adjustedEnd = end;
  
    // Try to align start with scene boundary (within 3 seconds)
    const startSceneBoundary = findNearestSceneBoundary(
      scenes.sceneChanges,
      start,
      3
    );
    if (startSceneBoundary !== null) {
      adjustedStart = startSceneBoundary;
    }
  
    // Try to align end with scene boundary (within 3 seconds)
    const endSceneBoundary = findNearestSceneBoundary(
      scenes.sceneChanges,
      end,
      3
    );
    if (endSceneBoundary !== null) {
      adjustedEnd = endSceneBoundary;
    }
  
    // Add "hook buffer" - start 0.5s earlier to catch attention
    adjustedStart = Math.max(0, adjustedStart - 0.5);
  
    // Extend end if speech is cut off mid-sentence
    const lastTranscript = speech.transcripts
      .filter(t => t.endTime <= end + 2)
      .sort((a, b) => b.endTime - a.endTime)[0];
  
    if (lastTranscript && Math.abs(lastTranscript.endTime - adjustedEnd) < 2) {
      adjustedEnd = lastTranscript.endTime + 0.3; // Add breath after sentence
    }
  
    // Ensure minimum duration
    if (adjustedEnd - adjustedStart < 15) {
      adjustedEnd = adjustedStart + 15;
    }
  
    return {
      start: Math.floor(adjustedStart * 10) / 10, // Round to 1 decimal
      end: Math.floor(adjustedEnd * 10) / 10,
    };
  }

/**
 * Find the nearest scene boundary within maxDistance
 */
function findNearestSceneBoundary(
    sceneChanges: Array<{ timestamp: number; score: number }>,
    targetTime: number,
    maxDistance: number
  ): number | null {
    let nearest: number | null = null;
    let minDistance = Infinity;
  
    for (const change of sceneChanges) {
      const distance = Math.abs(change.timestamp - targetTime);
      
      if (distance < minDistance && distance <= maxDistance) {
        minDistance = distance;
        nearest = change.timestamp;
      }
    }
  
    return nearest;
  }
  