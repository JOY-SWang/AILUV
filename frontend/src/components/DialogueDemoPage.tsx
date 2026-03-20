import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type StepConfig = {
  id: number;
  stage: string;
  task: string;
  volume: number;
  mode: "auto" | "record";
  cueText: string;
  audio: string[];
};

type ScoreResult = {
  score: number;
  similarity: number;
  keywordHit: number;
  transcript: string;
};

const steps: StepConfig[] = [
  { id: 1, stage: "Listening", task: "Listen demo only", volume: 1.0, mode: "auto", cueText: "Jen-ny", audio: ["/audio/hum2.mp3"] },
  { id: 2, stage: "Listening", task: "Listen demo only", volume: 1.0, mode: "auto", cueText: "Jen-ny", audio: ["/audio/hum2.mp3"] },
  { id: 3, stage: "Unison 1", task: "Chant in unison with full cue", volume: 1.0, mode: "record", cueText: "Jen-ny", audio: ["/audio/hum2.mp3"] },
  { id: 4, stage: "Unison 1", task: "Chant in unison with full cue", volume: 1.0, mode: "record", cueText: "Jen-ny", audio: ["/audio/hum2.mp3"] },
  { id: 5, stage: "Unison 2", task: "Chant in unison with weak cue", volume: 0.5, mode: "record", cueText: "Jen-ny", audio: ["/audio/hum2.mp3"] },
  { id: 6, stage: "Unison 2", task: "Chant in unison with weak cue", volume: 0.5, mode: "record", cueText: "Jen-ny", audio: ["/audio/hum2.mp3"] },
  { id: 7, stage: "Repetition", task: "Repeat independently after demo", volume: 0.0, mode: "record", cueText: "Jen-ny", audio: [] },
  { id: 8, stage: "Repetition", task: "Repeat independently after demo", volume: 0.0, mode: "record", cueText: "Jen-ny", audio: [] },
  { id: 9, stage: "Answer Learning", task: "Listen answer learning cue", volume: 1.0, mode: "auto", cueText: "Jen-ny", audio: ["/audio/Jenny.mp3"] },
  { id: 10, stage: "Answer Learning", task: "Listen answer learning cue", volume: 1.0, mode: "auto", cueText: "Jen-ny", audio: ["/audio/Jenny.mp3"] },
  { id: 11, stage: "Answer Learning", task: "Chant answer in unison", volume: 1.0, mode: "record", cueText: "Jen-ny", audio: ["/audio/Jenny.mp3"] },
  { id: 12, stage: "Answer Learning", task: "Chant answer in unison", volume: 1.0, mode: "record", cueText: "Jen-ny", audio: ["/audio/Jenny.mp3"] },
  { id: 13, stage: "Answer Learning", task: "Chant answer with weak cue", volume: 0.5, mode: "record", cueText: "Jen-ny", audio: ["/audio/Jenny.mp3"] },
  { id: 14, stage: "Answer Learning", task: "Chant answer with weak cue", volume: 0.5, mode: "record", cueText: "Jen-ny", audio: ["/audio/Jenny.mp3"] },
  { id: 15, stage: "Answer Learning", task: "Repeat answer independently", volume: 0.0, mode: "record", cueText: "Jen-ny", audio: [] },
  { id: 16, stage: "Answer Learning", task: "Repeat answer independently", volume: 0.0, mode: "record", cueText: "Jen-ny", audio: [] },
  {
    id: 17,
    stage: "Q&A Strong",
    task: "Listen question and answer with strong cue",
    volume: 1.0,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 18,
    stage: "Q&A Strong",
    task: "Listen question and answer with strong cue",
    volume: 1.0,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 19,
    stage: "Q&A Strong",
    task: "Listen question and answer with strong cue",
    volume: 1.0,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 20,
    stage: "Q&A Strong",
    task: "Listen question and answer with strong cue",
    volume: 1.0,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 21,
    stage: "Q&A Strong",
    task: "Listen question and answer with strong cue",
    volume: 1.0,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 22,
    stage: "Q&A Strong",
    task: "Listen question and answer with strong cue",
    volume: 1.0,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 23,
    stage: "Q&A Weak",
    task: "Listen question and answer with weak cue",
    volume: 0.5,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 24,
    stage: "Q&A Weak",
    task: "Listen question and answer with weak cue",
    volume: 0.5,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 25,
    stage: "Q&A Weak",
    task: "Listen question and answer with weak cue",
    volume: 0.5,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 26,
    stage: "Q&A Weak",
    task: "Listen question and answer with weak cue",
    volume: 0.5,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 27,
    stage: "Q&A Weak",
    task: "Listen question and answer with weak cue",
    volume: 0.5,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  {
    id: 28,
    stage: "Q&A Weak",
    task: "Listen question and answer with weak cue",
    volume: 0.5,
    mode: "record",
    cueText: "Jen-ny",
    audio: ["/audio/whatsurName.mp3", "/audio/Jenny.mp3"],
  },
  { id: 29, stage: "Independent", task: "Listen question only, answer independently", volume: 1.0, mode: "record", cueText: "Jen-ny", audio: ["/audio/whatsurName.mp3"] },
  { id: 30, stage: "Independent", task: "Listen question only, answer independently", volume: 1.0, mode: "record", cueText: "Jen-ny", audio: ["/audio/whatsurName.mp3"] },
];

const EXCLUDED_AUTO_RECORD_STEPS = new Set([1, 2, 9, 10]);
const MAX_RECORD_MS = 10000;

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

function splitCue(cueText: string): string[] {
  if (cueText.toLowerCase() === "jen-ny") return ["Jen", "-", "ny"];
  return cueText.split(/(\s+|-)/).filter(Boolean);
}

function normalizeText(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function levenshteinDistance(a: string, b: string): number {
  const s = normalizeText(a);
  const t = normalizeText(b);
  const rows = s.length + 1;
  const cols = t.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[rows - 1][cols - 1];
}

function scoreTranscript(transcript: string, target: string): Omit<ScoreResult, "transcript"> {
  const t1 = normalizeText(transcript);
  const t2 = normalizeText(target);
  const maxLen = Math.max(1, Math.max(t1.length, t2.length));
  const distance = levenshteinDistance(t1, t2);
  const similarity = 1 - distance / maxLen;

  const keywordHit = t1.includes("jenny") || (t1.includes("jen") && t1.includes("ny")) ? 1 : 0;
  const combined = 0.7 * similarity + 0.3 * keywordHit;

  let score = 0;
  if (combined >= 0.78 && keywordHit > 0) score = 2;
  else if (combined >= 0.45 || keywordHit > 0) score = 1;

  return { score, similarity, keywordHit };
}

function getTargetTextForStep(step: StepConfig): string {
  return step.cueText.replace(/-/g, "");
}

function shouldAutoRecordOnDemo(step: StepConfig): boolean {
  if (EXCLUDED_AUTO_RECORD_STEPS.has(step.id)) return false;
  return step.audio.some((u) => u.includes("hum2.mp3") || u.includes("Jenny.mp3"));
}

export function DialogueDemoPage() {
  const [showStartModal, setShowStartModal] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeSyllable, setActiveSyllable] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [waitingCaregiver, setWaitingCaregiver] = useState(false);
  const [micEnabled, setMicEnabledState] = useState(false);
  const [recordStateText, setRecordStateText] = useState("Ready to record");
  const [lastScore, setLastScore] = useState<ScoreResult | null>(null);
  const [questionVisible, setQuestionVisible] = useState(false);
  const [toast, setToast] = useState("");

  const flashTimerRef = useRef<number | null>(null);
  const runTokenRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordMaxTimerRef = useRef<number | null>(null);
  const patientAudioUrlRef = useRef<string | null>(null);
  const recordingsByStepRef = useRef<Record<number, { blob: Blob; url: string; at: number }>>({});
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef("");
  const recognitionEndPromiseRef = useRef<Promise<string> | null>(null);
  const resolveRecognitionEndRef = useRef<((text: string) => void) | null>(null);
  const pendingPatientPlaybackRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  const autoRecordTriggeredForStepRef = useRef(false);

  const currentStep = useMemo(() => steps[stepIndex] || steps[0], [stepIndex]);
  const tokens = useMemo(() => splitCue(currentStep.cueText), [currentStep.cueText]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 1800);
  }, []);

  const stopFlash = useCallback(() => {
    if (flashTimerRef.current !== null) {
      window.clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    setActiveSyllable(0);
  }, []);

  const startFlash = useCallback(() => {
    stopFlash();
    setActiveSyllable(0);
    const count = Math.max(tokens.length, 1);
    flashTimerRef.current = window.setInterval(() => {
      setActiveSyllable((prev) => (prev + 1) % count);
    }, 700);
  }, [stopFlash, tokens.length]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    stopFlash();
    setQuestionVisible(false);
  }, [stopFlash]);

  const cleanupRecorderTimer = useCallback(() => {
    if (recordMaxTimerRef.current !== null) {
      window.clearTimeout(recordMaxTimerRef.current);
      recordMaxTimerRef.current = null;
    }
  }, []);

  const stopSpeechRecognition = useCallback(async (): Promise<string> => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // no-op
      }
      recognitionRef.current = null;
    }

    if (!recognitionEndPromiseRef.current) return transcriptRef.current || "";
    const timeoutPromise = new Promise<string>((resolve) => {
      window.setTimeout(() => resolve(transcriptRef.current || ""), 600);
    });
    const transcript = await Promise.race([recognitionEndPromiseRef.current, timeoutPromise]);
    recognitionEndPromiseRef.current = null;
    resolveRecognitionEndRef.current = null;
    return transcript;
  }, []);

  const setMicEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (enabled) {
        if (micEnabled && micStreamRef.current) return true;
        try {
          micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicEnabledState(true);
          return true;
        } catch {
          setMicEnabledState(false);
          setRecordStateText("Microphone permission denied.");
          return false;
        }
      }

      if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      setMicEnabledState(false);
      return true;
    },
    [isRecording, micEnabled]
  );

  const startSpeechRecognition = useCallback(() => {
    const maybeWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const RecognitionCtor = maybeWindow.SpeechRecognition || maybeWindow.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      recognitionEndPromiseRef.current = Promise.resolve(transcriptRef.current || "");
      return;
    }

    recognitionEndPromiseRef.current = new Promise((resolve) => {
      resolveRecognitionEndRef.current = resolve;
    });

    try {
      const recognition = new RecognitionCtor();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      transcriptRef.current = "";

      recognition.onresult = (event) => {
        let merged = "";
        for (let i = 0; i < event.results.length; i += 1) {
          merged += `${event.results[i][0].transcript} `;
        }
        transcriptRef.current = merged.trim();
      };

      recognition.onerror = () => {
        if (resolveRecognitionEndRef.current) {
          resolveRecognitionEndRef.current(transcriptRef.current || "");
          resolveRecognitionEndRef.current = null;
        }
      };

      recognition.onend = () => {
        if (resolveRecognitionEndRef.current) {
          resolveRecognitionEndRef.current(transcriptRef.current || "");
          resolveRecognitionEndRef.current = null;
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      recognitionRef.current = null;
      if (resolveRecognitionEndRef.current) {
        resolveRecognitionEndRef.current(transcriptRef.current || "");
        resolveRecognitionEndRef.current = null;
      }
    }
  }, []);

  const playPatientRecording = useCallback(() => {
    const stepRecording = recordingsByStepRef.current[currentStep.id];
    const audioUrl = stepRecording?.url || patientAudioUrlRef.current;
    if (!audioUrl) {
      setRecordStateText("No patient recording yet.");
      return;
    }
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {
      setRecordStateText("Cannot play patient recording.");
    });
  }, [currentStep.id]);

  const handleAutoScore = useCallback(
    (transcript: string, step: StepConfig) => {
      const heardRaw = String(transcript || "").trim();
      const result = scoreTranscript(heardRaw, getTargetTextForStep(step));
      const payload: ScoreResult = {
        ...result,
        transcript: heardRaw || "-",
      };
      setLastScore(payload);

      if (result.score === 2) showToast("Great!");
      else if (result.score === 1) showToast("Good, keep going");
      else showToast("Let's try again-slow down");
    },
    [showToast]
  );

  const stopRecording = useCallback(
    (manual: boolean) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
      mediaRecorderRef.current.stop();
      setRecordStateText(manual ? "Recording ended manually." : "Recording stopped (max 10s).");
    },
    []
  );

  const startRecording = useCallback(
    async (autoTriggered = false): Promise<boolean> => {
      const step = currentStep;
      if (step.mode !== "record" || waitingCaregiver || isRecording) return false;

      const ok = await setMicEnabled(true);
      if (!ok || !micStreamRef.current || typeof MediaRecorder === "undefined") {
        setRecordStateText("Recording not supported.");
        return false;
      }

      cleanupRecorderTimer();
      recordChunksRef.current = [];
      transcriptRef.current = "";
      const recorder = new MediaRecorder(micStreamRef.current);
      mediaRecorderRef.current = recorder;
      startSpeechRecognition();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) recordChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        cleanupRecorderTimer();
        const heardText = await stopSpeechRecognition();
        setIsRecording(false);
        setWaitingCaregiver(true);

        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) {
          if (patientAudioUrlRef.current) URL.revokeObjectURL(patientAudioUrlRef.current);
          patientAudioUrlRef.current = URL.createObjectURL(blob);

          const prev = recordingsByStepRef.current[step.id];
          if (prev?.url) URL.revokeObjectURL(prev.url);
          recordingsByStepRef.current[step.id] = {
            blob,
            url: patientAudioUrlRef.current,
            at: Date.now(),
          };
        }

        handleAutoScore(heardText, step);
        if (isPlaying) pendingPatientPlaybackRef.current = true;
        else playPatientRecording();
      };

      recorder.start();
      setIsRecording(true);
      setWaitingCaregiver(false);
      recordMaxTimerRef.current = window.setTimeout(() => stopRecording(false), MAX_RECORD_MS);
      if (autoTriggered) setRecordStateText("Auto recording started with demo.");
      return true;
    },
    [
      cleanupRecorderTimer,
      currentStep,
      handleAutoScore,
      isPlaying,
      isRecording,
      playPatientRecording,
      setMicEnabled,
      startSpeechRecognition,
      stopRecording,
      stopSpeechRecognition,
      waitingCaregiver,
    ]
  );

  const playAudioSequence = useCallback(
    async (urls: string[], volume: number, token: number) => {
      if (!urls.length || volume <= 0) return;
      setIsPlaying(true);
      startFlash();

      try {
        for (const url of urls) {
          if (token !== runTokenRef.current) break;
          setQuestionVisible(url.includes("whatsurName.mp3"));
          await new Promise<void>((resolve, reject) => {
            const audio = new Audio(url);
            audio.volume = volume;
            audioRef.current = audio;
            audio.onended = () => resolve();
            audio.onerror = () => reject(new Error(`Failed: ${url}`));
            audio.play().catch(reject);
          });
        }
      } catch {
        setRecordStateText("Audio play failed.");
      } finally {
        if (token === runTokenRef.current) {
          stopAudio();
          if (pendingPatientPlaybackRef.current) {
            pendingPatientPlaybackRef.current = false;
            playPatientRecording();
          }
        }
      }
    },
    [playPatientRecording, startFlash, stopAudio]
  );

  const runCurrentStepDemo = useCallback(
    async (token: number, step: StepConfig) => {
      const shouldAutoStart =
        shouldAutoRecordOnDemo(step) && !autoRecordTriggeredForStepRef.current && !isRecording && !waitingCaregiver;
      if (shouldAutoStart) {
        autoRecordTriggeredForStepRef.current = true;
        await startRecording(true);
      }
      await playAudioSequence(step.audio, step.volume, token);
    },
    [isRecording, playAudioSequence, startRecording, waitingCaregiver]
  );

  const goToNextStep = useCallback(() => {
    setStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
  }, []);

  const resetCurrentPairStart = useCallback(() => {
    const pairStartId = currentStep.id % 2 === 0 ? currentStep.id - 1 : currentStep.id;
    setStepIndex(Math.max(0, pairStartId - 1));
  }, [currentStep.id]);

  useEffect(() => {
    if (isRecording) {
      setRecordStateText("Recording... (max 10s)");
      return;
    }
    if (waitingCaregiver) {
      setRecordStateText("Recorded. Waiting caregiver feedback.");
      return;
    }
    if (isPlaying) {
      setRecordStateText("Playing demo...");
      return;
    }
    if (!micEnabled) {
      setRecordStateText("Mic is OFF. Click mic button to enable.");
      return;
    }
    setRecordStateText("Ready to record");
  }, [isPlaying, isRecording, micEnabled, waitingCaregiver]);

  useEffect(() => {
    if (showStartModal) return;

    const token = ++runTokenRef.current;
    setWaitingCaregiver(false);
    pendingPatientPlaybackRef.current = false;
    autoRecordTriggeredForStepRef.current = false;

    const run = async () => {
      const step = steps[stepIndex] || steps[0];
      await runCurrentStepDemo(token, step);
      if (token !== runTokenRef.current) return;
      if (step.mode === "auto") {
        setStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
      }
    };

    run();
    // Intentionally only react to step changes and modal dismissal.
    // Including runCurrentStepDemo would cause re-entry on recording state changes.
  }, [stepIndex, showStartModal]);

  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
      stopAudio();
      stopFlash();
      cleanupRecorderTimer();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // no-op
        }
      }

      if (patientAudioUrlRef.current) {
        URL.revokeObjectURL(patientAudioUrlRef.current);
        patientAudioUrlRef.current = null;
      }

      Object.values(recordingsByStepRef.current).forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });

      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, [cleanupRecorderTimer, stopAudio, stopFlash]);

  const progressPercent = (currentStep.id / steps.length) * 100;
  const canRecord = currentStep.mode === "record" && !isPlaying && !waitingCaregiver;
  const caregiverEnabled = waitingCaregiver && !isPlaying;
  const hasStepRecording = Boolean(recordingsByStepRef.current[currentStep.id]?.url || patientAudioUrlRef.current);

  return (
    <div className="dialogue-page-shell">
      <header className="dd-top-header">
        <h2>{`Step ${currentStep.id} / Task 1 / 2 : Name`}</h2>
        <div className="dd-progress-wrap">
          <div className="dd-progress-track">
            <div className="dd-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="dd-progress-text">{`Step ${currentStep.id} / ${steps.length}`}</div>
        </div>
      </header>

      <main className="dd-content-grid">
        <section className="dd-card dd-doctor-panel">
          <h3>Doctor&apos;s Demo</h3>
          <div className="dd-doctor-chat-wrap">
            <div className="dd-doctor-avatar" aria-hidden="true">
              👨‍⚕️
            </div>
            <div className="dd-doctor-bubble">
              <div className="dd-step-pill">{`Step ${currentStep.id} · ${currentStep.stage}`}</div>
              <div className="dd-karaoke-box">
                <div className="dd-karaoke-label">Karaoke Cue</div>
                <div className="dd-karaoke-text">
                  {tokens.map((token, idx) => (
                    <span key={`${token}-${idx}`} className={`dd-syllable ${idx === activeSyllable ? "active" : ""}`}>
                      {token}
                    </span>
                  ))}
                </div>
                {questionVisible ? <div className="dd-question-prompt">Question Prompt: What&apos;s your name?</div> : null}
              </div>
            </div>
          </div>

          <div className="dd-audio-strip">
            <button
              className="dd-small-btn"
              disabled={isPlaying}
              onClick={() => {
                if (isPlaying) return;
                const token = ++runTokenRef.current;
                runCurrentStepDemo(token, currentStep);
              }}
            >
              Play Demo
            </button>
            <span>{isPlaying ? `Playing... (Volume: ${Math.round(currentStep.volume * 100)}%)` : `Idle (Volume: ${Math.round(currentStep.volume * 100)}%)`}</span>
          </div>
        </section>

        <section className="dd-card">
          <h3>User / Caregiver Feedback</h3>
          <div className="dd-task-box">
            <div className="dd-avatar dd-patient-avatar" aria-hidden="true">
              👵
            </div>
            <div>
              <div className="dd-task-text">{`User Task: ${currentStep.task}`}</div>
              <div className="dd-success-text">{`Consecutive Successes: ${(currentStep.id - 1) % 2} / 2`}</div>
            </div>
          </div>

          <div className="dd-input-box">
            <div className="dd-input-title">USER INPUT</div>
            <div className="dd-record-row">
              <button
                className={`dd-mic-btn ${micEnabled ? "on" : ""}`}
                onClick={() => {
                  setMicEnabled(!micEnabled);
                }}
              >
                {micEnabled ? "🎤 On" : "🎤 Off"}
              </button>
              <button
                className={`dd-record-btn ${!canRecord && !isRecording ? "disabled" : ""}`}
                disabled={!canRecord && !isRecording}
                onClick={() => {
                  if (isRecording) {
                    stopRecording(true);
                  } else {
                    startRecording(false);
                  }
                }}
              >
                {isRecording ? "End Recording" : "Start Recording"}
              </button>
              <button className="dd-redo-btn" disabled={!hasStepRecording || isPlaying || isRecording} onClick={playPatientRecording}>
                Play Patient Recording
              </button>
            </div>
            <div className="dd-record-state">{recordStateText}</div>
            <div className="dd-score-state">
              {lastScore
                ? `Auto Score: ${lastScore.score} | Similarity: ${lastScore.similarity.toFixed(2)} | Keyword: ${lastScore.keywordHit ? "hit" : "miss"} | Heard: ${lastScore.transcript || "-"}`
                : "Auto Score: -"}
            </div>
          </div>

          <div className="dd-caregiver-box">
            <div className="dd-input-title">CAREGIVER FEEDBACK</div>
            <div className="dd-caregiver-row">
              <button className="dd-good-btn" disabled={!caregiverEnabled} onClick={goToNextStep}>
                Good (Success)
              </button>
              <button className="dd-bad-btn" disabled={!caregiverEnabled} onClick={resetCurrentPairStart}>
                Bad (Redo)
              </button>
              <button className="dd-skip-btn" onClick={() => {
                if (isRecording) stopRecording(true);
                setWaitingCaregiver(false);
                goToNextStep();
              }}>
                Skip
              </button>
            </div>
          </div>
        </section>
      </main>

      {toast ? <div className="dd-toast">{toast}</div> : null}

      {showStartModal ? (
        <div className="dd-modal-overlay">
          <div className="dd-modal-card">
            <h2 className="dd-modal-title">Start DailyTraining?</h2>
            <p className="dd-modal-desc">Begin today&apos;s dialogue training session.</p>
            <button className="dd-modal-start-btn" onClick={() => setShowStartModal(false)}>
              Start
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
