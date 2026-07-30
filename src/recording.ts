const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/webm",
] as const;

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

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
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
      channelCount: 1,
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
  private processedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private highPass: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private levelData: Float32Array<ArrayBuffer> | null = null;
  private startedAt = 0;
  private pausedAt: number | null = null;
  private pausedDuration = 0;
  private stopping: Promise<LocalRecordingResult> | null = null;
  private released = false;

  constructor(private readonly stream: MediaStream) {
    let recorderStream = stream;
    const Context =
      window.AudioContext ??
      (window as AudioWindow).webkitAudioContext ??
      null;

    if (Context) {
      try {
        const context = new Context();
        this.audioContext = context;
        const source = context.createMediaStreamSource(stream);
        const highPass = context.createBiquadFilter();
        const gain = context.createGain();
        const compressor = context.createDynamicsCompressor();
        const analyser = context.createAnalyser();
        const destination = context.createMediaStreamDestination();

        highPass.type = "highpass";
        highPass.frequency.value = 80;
        highPass.Q.value = 0.7;
        gain.gain.value = 2.1;
        compressor.threshold.value = -20;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.72;

        source.connect(highPass);
        highPass.connect(gain);
        gain.connect(compressor);
        compressor.connect(analyser);
        analyser.connect(destination);

        this.audioSource = source;
        this.highPass = highPass;
        this.gain = gain;
        this.compressor = compressor;
        this.analyser = analyser;
        this.levelData = new Float32Array(analyser.fftSize);
        this.processedStream = destination.stream;
        recorderStream = destination.stream;
      } catch {
        this.releaseProcessing();
      }
    }

    const mimeType = preferredMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(recorderStream, { mimeType })
        : new MediaRecorder(recorderStream);
    } catch {
      this.releaseProcessing();
      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch (error) {
        for (const track of stream.getTracks()) track.stop();
        throw error;
      }
    }
    this.recorder = recorder;
    this.recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
  }

  get state(): RecordingState {
    return this.recorder.state;
  }

  start(): void {
    this.startedAt = performance.now();
    const resume = this.audioContext?.resume();
    if (resume) void resume.catch(() => undefined);
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

  inputLevel(): number {
    if (!this.analyser || !this.levelData) return 0;
    this.analyser.getFloatTimeDomainData(this.levelData);
    let sumSquares = 0;
    for (const sample of this.levelData) sumSquares += sample * sample;
    const rms = Math.sqrt(sumSquares / this.levelData.length);
    if (rms <= 0.0001) return 0;
    const decibels = 20 * Math.log10(rms);
    return Math.min(1, Math.max(0, (decibels + 58) / 42));
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
    if (this.released) return;
    this.released = true;
    this.releaseProcessing();
    for (const track of this.stream.getTracks()) track.stop();
  }

  private releaseProcessing(): void {
    this.audioSource?.disconnect();
    this.highPass?.disconnect();
    this.gain?.disconnect();
    this.compressor?.disconnect();
    this.analyser?.disconnect();
    for (const track of this.processedStream?.getTracks() ?? []) track.stop();
    const context = this.audioContext;
    this.audioContext = null;
    this.audioSource = null;
    this.highPass = null;
    this.gain = null;
    this.compressor = null;
    this.analyser = null;
    this.levelData = null;
    this.processedStream = null;
    if (context?.state !== "closed") void context?.close();
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
