import type { MockStage } from "./mockData";
import { MOCK_SESSION } from "./mockData";

const HUMMING_AUDIO_URL = new URL(
  "../audio/humming_Patsy.wav",
  import.meta.url,
).href;
const SENTENCE_AUDIO_URL = new URL(
  "../audio/i_want_water_Patsy.wav",
  import.meta.url,
).href;
const QUESTION_AUDIO_URL = new URL(
  "../audio/Q_doyouwannaDrink.mp3",
  import.meta.url,
).href;

const SYLLABLE_SECONDS = 1;

let activeAudio: HTMLAudioElement | null = null;
let activeFrame: number | null = null;
let activeStop: (() => void) | null = null;

function audioUrl(stage: MockStage): string {
  if (stage.number === 1) return HUMMING_AUDIO_URL;
  if (stage.number === 2 || stage.number === 3) return SENTENCE_AUDIO_URL;
  return QUESTION_AUDIO_URL;
}

function cueVolume(stage: MockStage, currentTime: number): number {
  if (stage.key !== "UNISON_FADE") return 1;
  const volumes = [1, 0.72, 0.42, 0.18] as const;
  const segmentIndex = Math.min(
    volumes.length - 1,
    Math.floor(currentTime / SYLLABLE_SECONDS),
  );
  return volumes[segmentIndex] ?? 0.18;
}

export async function playStageCue(
  stage: MockStage,
  onSegment?: (ordinal: number) => void,
): Promise<void> {
  stopStageCue();

  await new Promise<void>((resolve, reject) => {
    const audio = new Audio(audioUrl(stage));
    let finished = false;
    let lastOrdinal = 0;

    const cleanup = (): void => {
      if (activeFrame != null) {
        window.cancelAnimationFrame(activeFrame);
        activeFrame = null;
      }
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      if (activeAudio === audio) activeAudio = null;
      if (activeStop === handleStop) activeStop = null;
    };

    const finish = (error?: Error): void => {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };

    const updateTimeline = (): void => {
      if (finished || activeAudio !== audio) return;
      const ordinal = Math.min(
        MOCK_SESSION.task.syllables.length,
        Math.floor(audio.currentTime / SYLLABLE_SECONDS) + 1,
      );
      if (ordinal !== lastOrdinal) {
        lastOrdinal = ordinal;
        onSegment?.(ordinal);
      }
      audio.volume = cueVolume(stage, audio.currentTime);
      activeFrame = window.requestAnimationFrame(updateTimeline);
    };

    function handleEnded(): void {
      onSegment?.(MOCK_SESSION.task.syllables.length);
      finish();
    }

    function handleError(): void {
      finish(new Error("The bundled reference audio could not be played."));
    }

    function handleStop(): void {
      audio.pause();
      finish();
    }

    audio.preload = "auto";
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    activeAudio = audio;
    activeStop = handleStop;
    onSegment?.(1);

    void audio
      .play()
      .then(updateTimeline)
      .catch(() => {
        finish(
          new Error(
            "The browser blocked audio playback. Tap the play button and try again.",
          ),
        );
      });
  });
}

export function stopStageCue(): void {
  const stop = activeStop;
  activeStop = null;
  stop?.();
}
