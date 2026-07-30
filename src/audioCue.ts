import type { MockStage } from "./mockData";
import { MOCK_SESSION } from "./mockData";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function audioContextConstructor(): typeof AudioContext | null {
  return window.AudioContext ?? (window as AudioWindow).webkitAudioContext ?? null;
}

function toneFrequency(stressed: boolean): number {
  return stressed ? 415.3 : 277.18;
}

export async function playHummingCue(
  fade = false,
  onSegment?: (ordinal: number) => void,
): Promise<void> {
  const Context = audioContextConstructor();
  if (!Context) throw new Error("Local audio cues are unavailable in this browser.");
  const context = new Context();
  await context.resume();
  const segmentDuration = 0.56;
  const now = context.currentTime + 0.04;
  MOCK_SESSION.task.syllables.forEach((segment, index) => {
    const start = now + index * segmentDuration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = toneFrequency(segment.stressed);
    const baseGain = fade ? Math.max(0.05, 0.22 - index * 0.06) : 0.2;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(baseGain, start + 0.035);
    gain.gain.setValueAtTime(baseGain, start + 0.38);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.52);
    window.setTimeout(() => onSegment?.(index + 1), index * segmentDuration * 1000);
  });
  await new Promise((resolve) =>
    window.setTimeout(resolve, MOCK_SESSION.task.syllables.length * segmentDuration * 1000),
  );
  await context.close();
}

function speechText(stage: MockStage): string {
  return stage.cue === "question"
    ? MOCK_SESSION.task.questionText
    : MOCK_SESSION.task.targetSentence;
}

async function speak(text: string, volume: number): Promise<void> {
  if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
    throw new Error("Local speech synthesis is unavailable.");
  }
  window.speechSynthesis.cancel();
  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    utterance.pitch = 1.02;
    utterance.volume = volume;
    const timeout = window.setTimeout(resolve, 5_000);
    utterance.addEventListener("end", () => {
      window.clearTimeout(timeout);
      resolve();
    });
    utterance.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("The device voice could not play the cue."));
    });
    window.speechSynthesis.speak(utterance);
  });
}

export async function playStageCue(
  stage: MockStage,
  onSegment?: (ordinal: number) => void,
): Promise<void> {
  if (stage.cue === "humming") {
    await playHummingCue(false, onSegment);
    return;
  }
  let ordinal = 1;
  onSegment?.(ordinal);
  const animation = window.setInterval(() => {
    ordinal = Math.min(MOCK_SESSION.task.syllables.length, ordinal + 1);
    onSegment?.(ordinal);
  }, 650);
  try {
    await speak(speechText(stage), stage.key === "UNISON_FADE" ? 0.55 : 1);
  } catch {
    await playHummingCue(stage.key === "UNISON_FADE", onSegment);
  } finally {
    window.clearInterval(animation);
  }
}

export function stopStageCue(): void {
  window.speechSynthesis?.cancel();
}
