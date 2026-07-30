const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/webm",
] as const;

export type LocalRecordingResult = {
  blob: Blob;
  durationMs: number;
  mimeType: string;
};

export function microphoneSupport(): {
  supported: boolean;
  reason: string | null;
} {
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: "Microphone access requires HTTPS on a phone.",
    };
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    return {
      supported: false,
      reason: "This browser does not expose MediaRecorder microphone capture.",
    };
  }
  return { supported: true, reason: null };
}

export async function requestMicrophone(): Promise<MediaStream> {
  const support = microphoneSupport();
  if (!support.supported) {
    throw new DOMException(
      support.reason ?? "Microphone recording is unavailable.",
      "NotSupportedError",
    );
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
}

function preferredMimeType(): string {
  if (!window.MediaRecorder) return "";
  return (
    MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? ""
  );
}

export class LocalRecorder {
  private readonly recorder: MediaRecorder;
  private readonly chunks: BlobPart[] = [];
  private startedAt = 0;
  private pausedAt: number | null = null;
  private pausedDuration = 0;
  private stopping: Promise<LocalRecordingResult> | null = null;

  constructor(private readonly stream: MediaStream) {
    const mimeType = preferredMimeType();
    this.recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    this.recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
  }

  get state(): RecordingState {
    return this.recorder.state;
  }

  start(): void {
    this.startedAt = performance.now();
    this.recorder.start(250);
  }

  pause(): void {
    if (this.recorder.state !== "recording") return;
    this.pausedAt = performance.now();
    this.recorder.pause();
  }

  resume(): void {
    if (this.recorder.state !== "paused") return;
    const now = performance.now();
    if (this.pausedAt != null) {
      this.pausedDuration += Math.max(0, now - this.pausedAt);
    }
    this.pausedAt = null;
    this.recorder.resume();
  }

  elapsedMs(): number {
    if (!this.startedAt) return 0;
    const now = this.pausedAt ?? performance.now();
    return Math.max(0, now - this.startedAt - this.pausedDuration);
  }

  stop(): Promise<LocalRecordingResult> {
    if (this.stopping) return this.stopping;
    const durationMs = Math.round(this.elapsedMs());
    this.stopping = new Promise((resolve, reject) => {
      this.recorder.addEventListener(
        "stop",
        () => {
          const mimeType = this.recorder.mimeType || "audio/webm";
          const blob = new Blob(this.chunks, { type: mimeType });
          this.release();
          if (!blob.size) {
            reject(new Error("The microphone did not produce audio."));
            return;
          }
          resolve({ blob, durationMs, mimeType });
        },
        { once: true },
      );
      this.recorder.addEventListener(
        "error",
        () => {
          this.release();
          reject(new Error("The browser interrupted the recording."));
        },
        { once: true },
      );
      if (this.recorder.state === "inactive") {
        this.release();
        reject(new Error("The recording is no longer active."));
        return;
      }
      this.recorder.stop();
    });
    return this.stopping;
  }

  abort(): void {
    if (this.recorder.state !== "inactive") this.recorder.stop();
    this.release();
  }

  private release(): void {
    for (const track of this.stream.getTracks()) track.stop();
  }
}

export function recordingErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Microphone access was denied. Allow it in browser settings and try again.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No microphone was found on this device.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Recording could not start. Check microphone access and try again.";
}
