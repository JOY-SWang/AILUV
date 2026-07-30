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

export type CuePlaybackMode = "demo" | "recording";

let activeAudio: HTMLAudioElement | null = null;
let activeFrame: number | null = null;
let activeStop: (() => void) | null = null;

function audioUrl(stage: MockStage): string | null {
  if (stage.number === 1) return HUMMING_AUDIO_URL;
  if (stage.number === 2 || stage.number === 3) return SENTENCE_AUDIO_URL;
  if (stage.number === 5) return QUESTION_AUDIO_URL;
  return null;
}

export function stageHasAudio(stage: MockStage): boolean {
  return audioUrl(stage) != null;
}

function cueVolume(
  stage: MockStage,
  currentTime: number,
  duration: number,
  mode: CuePlaybackMode,
): number {
  if (stage.key !== "UNISON_FADE" || mode === "demo") return 1;
  const progress = Math.min(1, Math.max(0, currentTime / duration));
  return 0.5 * (1 - progress);
}

export async function playStageCue(
  stage: MockStage,
  onSegment?: (ordinal: number) => void,
  mode: CuePlaybackMode = "demo",
): Promise<void> {
  stopStageCue();
  const url = audioUrl(stage);
  if (!url) return;

  await new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
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
      const duration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : stage.autoStopMs / 1_000;
      audio.volume = cueVolume(stage, audio.currentTime, duration, mode);
      activeFrame = window.requestAnimationFrame(updateTimeline);
    };

    function handleEnded(): void {
      if (stage.key === "UNISON_FADE" && mode === "recording") {
        audio.volume = 0;
      }
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
    audio.volume = cueVolume(
      stage,
      0,
      stage.autoStopMs / 1_000,
      mode,
    );
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
