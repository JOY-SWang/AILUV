import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { playStageCue, stopStageCue } from "./audioCue";
import {
  MOCK_SESSION,
  MOCK_SESSION_CODE,
  MOCK_STAGES,
  mockStage,
  type MockStage,
} from "./mockData";
import {
  LocalRecorder,
  microphoneSupport,
  recordingErrorMessage,
  requestMicrophone,
} from "./recording";
import {
  clearRecordings,
  deleteRecording,
  listRecordings,
  saveRecording,
  type StoredRecording,
} from "./storage";

type Screen = "code" | "intro" | "protocol" | "stage" | "evaluate" | "complete";
type Rating = "HAPPY" | "OKAY" | "SAD";
type PracticePhase =
  | "INTRO"
  | "DEMO_PLAYING"
  | "READY"
  | "COUNTDOWN"
  | "RECORDING"
  | "PAUSED"
  | "SAVING"
  | "REVIEW"
  | "ERROR";

type MockProgress = {
  verified: boolean;
  started: boolean;
  stageNo: number;
  completedStages: number[];
  stageRatings: Record<string, Rating>;
  dailyRating: Rating | null;
  finished: boolean;
};

type PlayableRecording = StoredRecording & { url: string };

const PROGRESS_KEY = "ailuv-patient-mock-progress-v1";
const EMPTY_PROGRESS: MockProgress = {
  verified: false,
  started: false,
  stageNo: 1,
  completedStages: [],
  stageRatings: {},
  dailyRating: null,
  finished: false,
};

const RATING_OPTIONS: readonly {
  id: Rating;
  label: string;
  face: string;
}[] = [
  { id: "HAPPY", label: "Happy", face: "😊" },
  { id: "OKAY", label: "Okay", face: "😐" },
  { id: "SAD", label: "Sad", face: "😔" },
];

function loadProgress(): MockProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<MockProgress>;
    return {
      verified: Boolean(parsed.verified),
      started: Boolean(parsed.started),
      stageNo:
        typeof parsed.stageNo === "number" &&
        parsed.stageNo >= 1 &&
        parsed.stageNo <= 5
          ? parsed.stageNo
          : 1,
      completedStages: Array.isArray(parsed.completedStages)
        ? parsed.completedStages.filter(
            (value): value is number =>
              typeof value === "number" && value >= 1 && value <= 5,
          )
        : [],
      stageRatings:
        parsed.stageRatings && typeof parsed.stageRatings === "object"
          ? parsed.stageRatings
          : {},
      dailyRating:
        parsed.dailyRating === "HAPPY" ||
        parsed.dailyRating === "OKAY" ||
        parsed.dailyRating === "SAD"
          ? parsed.dailyRating
          : null,
      finished: Boolean(parsed.finished),
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function screenFromPath(pathname: string, progress: MockProgress): Screen {
  if (pathname.includes("/complete")) return "complete";
  if (pathname.includes("/evaluate")) return "evaluate";
  if (pathname.includes("/session/")) return "stage";
  if (pathname.includes("/protocol")) return "protocol";
  if (pathname.includes("/intro")) return "intro";
  if (pathname.includes("/code")) return "code";
  if (progress.finished || progress.completedStages.length === 5) return "complete";
  if (progress.started) return "protocol";
  if (progress.verified) return "intro";
  return "code";
}

function stageFromPath(pathname: string): number | null {
  const match = pathname.match(/\/stage\/([1-5])(?:\/|$)/);
  return match ? Number(match[1]) : null;
}

function pathFor(screen: Screen, stageNo: number): string {
  switch (screen) {
    case "code":
      return "/patient/code";
    case "intro":
      return "/patient/intro";
    case "protocol":
      return "/patient/protocol";
    case "stage":
      return `/patient/session/task/1/stage/${stageNo}`;
    case "evaluate":
      return "/patient/evaluate";
    case "complete":
      return "/patient/complete";
  }
}

function recordingExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function PatientShell({
  children,
  onReset,
  showReset = true,
}: {
  children: ReactNode;
  onReset: () => void;
  showReset?: boolean;
}) {
  return (
    <div className="patient-app">
      <div className="ambient ambient--one" aria-hidden="true" />
      <div className="ambient ambient--two" aria-hidden="true" />
      <div className="patient-phone">
        <header className="patient-top">
          <p className="patient-brand" aria-label="AI LUV">
            AI <span aria-hidden="true">♪</span> LUV
          </p>
          {showReset ? (
            <button type="button" className="reset-link" onClick={onReset}>
              Start over
            </button>
          ) : (
            <span className="mock-chip">Local mock</span>
          )}
        </header>
        <main className="patient-main">{children}</main>
        <footer className="patient-footer">
          <span className="privacy-dot" aria-hidden="true" />
          No server connection · recordings stay in this browser
        </footer>
      </div>
    </div>
  );
}

function DailyProgress({ completed }: { completed: number }) {
  const percent = Math.round((completed / 5) * 100);
  return (
    <section className="patient-progress" aria-label="Daily progress">
      <div className="patient-progress__row">
        <span>Daily progress</span>
        <span>{completed} / 5</span>
      </div>
      <div
        className="patient-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={completed}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}

function CodePage({
  onVerified,
  onReset,
}: {
  onVerified: () => void;
  onReset: () => void;
}) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setCode(value: string): void {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    setDigits(Array.from({ length: 4 }, (_, index) => cleaned[index] ?? ""));
    if (cleaned.length === 4) {
      document.getElementById("patient-code-3")?.focus();
    }
  }

  function updateDigit(index: number, value: string): void {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError(null);
    if (cleaned && index < 3) {
      document.getElementById(`patient-code-${index + 1}`)?.focus();
    }
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    const code = digits.join("");
    if (code.length !== 4) {
      setError("Enter all 4 digits.");
      return;
    }
    if (code !== MOCK_SESSION_CODE) {
      setError(`This standalone mock uses ${MOCK_SESSION_CODE}.`);
      return;
    }
    setBusy(true);
    setError(null);
    window.setTimeout(() => {
      setBusy(false);
      onVerified();
    }, 320);
  }

  return (
    <PatientShell onReset={onReset} showReset={false}>
      <div className="code-hero" aria-hidden="true">
        <span className="code-hero__ring">
          <span>4</span>
        </span>
      </div>
      <div className="center-copy">
        <p className="eyebrow">Patient practice</p>
        <h1 className="patient-title">Enter session code</h1>
        <p className="patient-lede">
          Enter the 4-digit code provided by your therapist.
        </p>
      </div>

      <form className="patient-code-form" onSubmit={submit} noValidate>
        <div
          className="patient-code-row"
          role="group"
          aria-label="Session code"
          onPaste={(event) => {
            event.preventDefault();
            setCode(event.clipboardData.getData("text"));
          }}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              id={`patient-code-${index}`}
              className="patient-code-cell"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              aria-label={`Digit ${index + 1}`}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digit && index > 0) {
                  document.getElementById(`patient-code-${index - 1}`)?.focus();
                }
              }}
            />
          ))}
        </div>
        {error ? (
          <div className="banner banner--error" role="alert">
            {error}
          </div>
        ) : null}
        <button type="submit" className="btn btn--primary patient-cta" disabled={busy}>
          {busy ? "Opening local session…" : "Continue"}
        </button>
      </form>

      <button
        type="button"
        className="demo-code"
        onClick={() => setCode(MOCK_SESSION_CODE)}
      >
        <span>
          Demo code <strong>{MOCK_SESSION_CODE}</strong>
        </span>
        <span aria-hidden="true">Use code →</span>
      </button>

      <aside className="patient-secure" aria-label="Mock privacy notice">
        <span className="shield-icon" aria-hidden="true">✓</span>
        <div>
          <strong>Private local demo</strong>
          <p>No code verification or patient data is sent anywhere.</p>
        </div>
      </aside>
    </PatientShell>
  );
}

function IntroPage({
  onBegin,
  onReset,
}: {
  onBegin: () => void;
  onReset: () => void;
}) {
  return (
    <PatientShell onReset={onReset}>
      <div className="center-copy intro-heading">
        <span className="welcome-mark" aria-hidden="true">♪</span>
        <p className="eyebrow">{MOCK_SESSION.planDateLabel}</p>
        <h1 className="patient-title">Hi, M1.3 Checkpoint Patient!</h1>
        <p className="patient-subtitle">Today’s practice</p>
      </div>

      <article className="session-overview">
        <div className="session-stat">
          <span className="session-stat__icon" aria-hidden="true">1</span>
          <div>
            <strong>1 task</strong>
            <span>5 guided stages</span>
          </div>
        </div>
        <div className="session-stat">
          <span className="session-stat__icon session-stat__icon--clock" aria-hidden="true">⌁</span>
          <div>
            <strong>About {MOCK_SESSION.estimatedMinutes} minutes</strong>
            <span>Pause whenever you need</span>
          </div>
        </div>
      </article>

      <article className="task-preview">
        <p className="eyebrow">Today’s phrase</p>
        <p className="task-preview__sentence">{MOCK_SESSION.task.targetSentence}</p>
        <p>{MOCK_SESSION.task.questionText}</p>
      </article>

      <article className="headphones-note">
        <span className="headphones-note__icon" aria-hidden="true">◖◗</span>
        <div>
          <strong>Headphones recommended</strong>
          <p>They keep the reference cue out of your recording so your voice is clearer.</p>
        </div>
      </article>

      <button type="button" className="btn btn--primary patient-cta push-bottom" onClick={onBegin}>
        Begin session
      </button>
      <p className="patient-hint">This mock saves progress only on this device.</p>
    </PatientShell>
  );
}

function ProtocolPage({
  progress,
  onStart,
  onReset,
}: {
  progress: MockProgress;
  onStart: () => void;
  onReset: () => void;
}) {
  return (
    <PatientShell onReset={onReset}>
      <div className="protocol-heading">
        <p className="eyebrow">MIT protocol · {MOCK_SESSION.protocolVersion}</p>
        <h1 className="patient-title">Today’s 5-stage flow</h1>
        <p className="patient-lede">
          Work through each step with the phrase “{MOCK_SESSION.task.targetSentence}”.
        </p>
      </div>

      <ol className="patient-stage-list">
        {MOCK_STAGES.map((stage) => {
          const completed = progress.completedStages.includes(stage.number);
          const current = stage.number === progress.stageNo && !completed;
          return (
            <li
              key={stage.number}
              className={[
                "patient-stage-item",
                completed ? "patient-stage-item--complete" : "",
                current ? "patient-stage-item--current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="patient-stage-badge" aria-hidden="true">
                {completed ? "✓" : stage.number}
              </span>
              <span>
                <strong>{stage.title}</strong>
                <small>{stage.practiceInstruction}</small>
              </span>
              {current ? <span className="current-label">Next</span> : null}
            </li>
          );
        })}
      </ol>

      <article className="patient-card patient-card--info protocol-summary">
        <span>{progress.completedStages.length}/5 complete</span>
        <strong>1 task × 5 stages</strong>
      </article>

      <button type="button" className="btn btn--primary patient-cta" onClick={onStart}>
        {progress.completedStages.length ? `Resume stage ${progress.stageNo}` : "Start exercise 1"}
      </button>
    </PatientShell>
  );
}

function CueTimeline({
  activeSegment,
  tapping,
}: {
  activeSegment: number;
  tapping: boolean;
}) {
  return (
    <section className="cue-timeline" aria-label="Stress and rhythm cue">
      <div className="syllable-row">
        {MOCK_SESSION.task.syllables.map((segment) => (
          <span
            key={segment.ordinal}
            className={activeSegment === segment.ordinal ? "is-active" : ""}
          >
            {segment.syllable}
          </span>
        ))}
      </div>
      <div className="pitch-band pitch-band--upper">
        <span className="pitch-band__label">G# · stressed</span>
        <div className="pitch-band__grid">
          {MOCK_SESSION.task.syllables.map((segment) => (
            <span key={segment.ordinal} className="pitch-cell">
              {segment.stressed ? (
                <i
                  className={[
                    "pitch-bar",
                    activeSegment === segment.ordinal ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              ) : null}
            </span>
          ))}
        </div>
      </div>
      <div className="pitch-band pitch-band--lower">
        <span className="pitch-band__label">C# · unstressed</span>
        <div className="pitch-band__grid">
          {MOCK_SESSION.task.syllables.map((segment) => (
            <span key={segment.ordinal} className="pitch-cell">
              {!segment.stressed ? (
                <i
                  className={[
                    "pitch-bar",
                    activeSegment === segment.ordinal ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              ) : null}
            </span>
          ))}
        </div>
      </div>
      {tapping ? <p className="tap-caption">Tap cue enabled for this stage</p> : null}
    </section>
  );
}

function StagePage({
  stageNo,
  completed,
  stageRecordings,
  onSaved,
  onEvaluate,
  onPauseSession,
  onReset,
}: {
  stageNo: number;
  completed: number;
  stageRecordings: PlayableRecording[];
  onSaved: (recording: StoredRecording) => void;
  onEvaluate: () => void;
  onPauseSession: () => void;
  onReset: () => void;
}) {
  const stage = mockStage(stageNo);
  const [phase, setPhase] = useState<PracticePhase>("INTRO");
  const [activeSegment, setActiveSegment] = useState(0);
  const [countdown, setCountdown] = useState(stage.countdownSeconds);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [inputLevel, setInputLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [latestRecordingId, setLatestRecordingId] = useState<string | null>(null);
  const recorderRef = useRef<LocalRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);
  const cancelledRef = useRef(false);

  const latestRecording =
    stageRecordings.find((recording) => recording.id === latestRecordingId) ??
    stageRecordings.at(-1) ??
    null;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    setPhase("INTRO");
    setActiveSegment(0);
    setCountdown(stage.countdownSeconds);
    setElapsedMs(0);
    setInputLevel(0);
    setError(null);
    setTapCount(0);
    setLatestRecordingId(null);
    stoppingRef.current = false;
    return () => {
      cancelledRef.current = true;
      clearTimer();
      stopStageCue();
      recorderRef.current?.abort();
      recorderRef.current = null;
    };
  }, [clearTimer, stage.countdownSeconds, stageNo]);

  async function playDemo(): Promise<void> {
    if (phase === "DEMO_PLAYING") return;
    setError(null);
    setPhase("DEMO_PLAYING");
    setActiveSegment(1);
    try {
      await playStageCue(stage, setActiveSegment);
      setActiveSegment(0);
      setPhase("READY");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The local cue could not play.");
      setPhase("READY");
    }
  }

  async function finishRecording(): Promise<void> {
    if (stoppingRef.current) return;
    const recorder = recorderRef.current;
    if (!recorder) return;
    stoppingRef.current = true;
    clearTimer();
    stopStageCue();
    setPhase("SAVING");
    try {
      const result = await recorder.stop();
      recorderRef.current = null;
      const stored: StoredRecording = {
        id: crypto.randomUUID(),
        stageNo: stage.number,
        attemptNo: stageRecordings.length + 1,
        blob: result.blob,
        mimeType: result.mimeType,
        durationMs: Math.min(result.durationMs, stage.autoStopMs),
        createdAt: new Date().toISOString(),
      };
      try {
        await saveRecording(stored);
      } catch {
        setError("Recorded successfully, but this browser could not persist the Blob after refresh.");
      }
      onSaved(stored);
      setLatestRecordingId(stored.id);
      setElapsedMs(stored.durationMs);
      setInputLevel(0);
      setActiveSegment(0);
      setPhase("REVIEW");
    } catch (caught) {
      recorderRef.current = null;
      setError(recordingErrorMessage(caught));
      setPhase("ERROR");
    } finally {
      stoppingRef.current = false;
    }
  }

  function startRecorder(recorder: LocalRecorder): void {
    recorderRef.current = recorder;
    recorder.start();
    setElapsedMs(0);
    setInputLevel(0);
    setActiveSegment(1);
    setTapCount(0);
    setPhase("RECORDING");
    if (!stage.patientStopAllowed) {
      void playStageCue(stage, setActiveSegment).catch((caught) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "The local reference could not play.",
        );
      });
    }
    timerRef.current = window.setInterval(() => {
      const current = recorderRef.current?.elapsedMs() ?? 0;
      setElapsedMs(current);
      setInputLevel(recorderRef.current?.inputLevel() ?? 0);
      setActiveSegment(Math.min(4, Math.floor(current / 1_000) + 1));
      if (current >= stage.autoStopMs) void finishRecording();
    }, 100);
  }

  async function beginPractice(): Promise<void> {
    if (stageRecordings.length >= 4) {
      setError("This mock keeps the protocol limit of four Attempts per stage.");
      return;
    }
    setError(null);
    setPhase(stage.countdownSeconds ? "COUNTDOWN" : "READY");
    try {
      const stream = await requestMicrophone();
      if (cancelledRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      const recorder = new LocalRecorder(stream);
      recorderRef.current = recorder;
      if (stage.countdownSeconds) {
        for (let value = stage.countdownSeconds; value > 0; value -= 1) {
          setCountdown(value);
          await new Promise((resolve) => window.setTimeout(resolve, 700));
          if (cancelledRef.current) {
            recorder.abort();
            return;
          }
        }
      }
      startRecorder(recorder);
    } catch (caught) {
      setError(recordingErrorMessage(caught));
      setPhase("ERROR");
    }
  }

  function pauseRecording(): void {
    const recorder = recorderRef.current;
    if (!recorder || !stage.pauseResumeAllowed) return;
    recorder.pause();
    stopStageCue();
    setInputLevel(0);
    setPhase("PAUSED");
  }

  function resumeRecording(): void {
    const recorder = recorderRef.current;
    if (!recorder || !stage.pauseResumeAllowed) return;
    recorder.resume();
    setPhase("RECORDING");
  }

  function redo(): void {
    if (stageRecordings.length >= 4) {
      setError("Four Attempts are already stored for this stage.");
      return;
    }
    setError(null);
    setElapsedMs(0);
    setInputLevel(0);
    setActiveSegment(0);
    setLatestRecordingId(null);
    setPhase("READY");
  }

  const support = microphoneSupport();
  const isQuestion = stage.key === "QUESTION_ELICITATION";
  const showTimeline = !isQuestion || phase === "RECORDING";
  const instruction =
    phase === "INTRO" || phase === "DEMO_PLAYING"
      ? stage.demoInstruction
      : stage.practiceInstruction;

  return (
    <PatientShell onReset={onReset}>
      <DailyProgress completed={completed} />

      <div className="patient-stage-head">
        <span className="patient-stage-badge patient-stage-badge--large" aria-hidden="true">
          {stage.number}
        </span>
        <div className="patient-stage-head__copy">
          <p className="muted">Exercise 1 · {stage.title}</p>
          <h1 className="patient-title patient-title--sm">{instruction}</h1>
        </div>
        <button
          type="button"
          className="patient-icon-btn"
          aria-label="Pause practice and return to protocol"
          disabled={phase === "RECORDING" || phase === "COUNTDOWN"}
          onClick={onPauseSession}
        >
          <span aria-hidden="true">Ⅱ</span>
        </button>
      </div>

      <article
        className={[
          "phrase-card",
          isQuestion ? "phrase-card--question" : "",
          phase === "COUNTDOWN" ? "phrase-card--countdown" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="phrase-card__label">
          {isQuestion ? "Question" : "Target phrase"}
        </span>
        <p>
          {isQuestion
            ? MOCK_SESSION.task.questionText
            : MOCK_SESSION.task.targetSentence}
        </p>
        {phase === "COUNTDOWN" ? (
          <div className="patient-countdown" aria-live="polite">{countdown}</div>
        ) : null}
      </article>

      {showTimeline ? (
        <CueTimeline
          activeSegment={activeSegment}
          tapping={stage.tappingInputEnabled}
        />
      ) : null}

      {error ? (
        <div className="banner banner--error" role="alert">{error}</div>
      ) : null}

      {phase === "INTRO" ? (
        <>
          <button type="button" className="btn btn--primary patient-cta" onClick={() => void playDemo()}>
            <span className="button-icon" aria-hidden="true">▶</span>
            Play local demonstration
          </button>
          <p className="patient-hint">
            This bundled session recording plays without a backend connection.
          </p>
        </>
      ) : null}

      {phase === "DEMO_PLAYING" ? (
        <div className="listening-status" aria-live="polite">
          <span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>
          Playing local reference…
        </div>
      ) : null}

      {phase === "READY" || phase === "ERROR" ? (
        <>
          <button
            type="button"
            className="record-start"
            disabled={!support.supported}
            onClick={() => void beginPractice()}
          >
            <span className="record-start__circle" aria-hidden="true" />
            <span>
              <strong>{stage.countdownSeconds ? "Start 3–2–1" : "Start recording practice"}</strong>
              <small>Saved only on this device</small>
            </span>
          </button>
          {!support.supported ? (
            <p className="support-warning">{support.reason}</p>
          ) : null}
        </>
      ) : null}

      {phase === "COUNTDOWN" ? (
        <p className="patient-hint" aria-live="polite">
          Recording begins after 3–2–1
        </p>
      ) : null}

      {phase === "RECORDING" ? (
        <>
          {stage.tappingInputEnabled ? (
            <button
              type="button"
              className="patient-tap-target"
              onPointerDown={() => {
                setTapCount((count) => count + 1);
                if (typeof navigator.vibrate === "function") navigator.vibrate(35);
              }}
            >
              Tap with the rhythm
              <small>{tapCount} tap{tapCount === 1 ? "" : "s"}</small>
            </button>
          ) : null}
          <div className="recording-panel" role="group" aria-label="Recording controls">
            <div className="recording-panel__status">
              <span className="recording-live"><i /> Recording</span>
              <strong>{(elapsedMs / 1000).toFixed(1)}s</strong>
              <span
                className="mic-level"
                role="meter"
                aria-label="Microphone input level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(inputLevel * 100)}
              >
                <i style={{ width: `${Math.max(3, inputLevel * 100)}%` }} />
              </span>
              <small className="mic-level__label">
                {inputLevel >= 0.16 ? "Voice detected" : "Speak a little louder"}
              </small>
            </div>
            {stage.pauseResumeAllowed ? (
              <button type="button" className="btn btn--secondary" onClick={pauseRecording}>
                Pause
              </button>
            ) : (
              <button
                type="button"
                className="stop-recording"
                aria-label="Stop recording"
                onClick={() => void finishRecording()}
              >
                <span aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="patient-hint">
            {stage.patientStopAllowed
              ? "Tap stop when you finish. Maximum 10 seconds."
              : "This Attempt stops automatically with the cue."}
          </p>
        </>
      ) : null}

      {phase === "PAUSED" ? (
        <button type="button" className="btn btn--primary patient-cta" onClick={resumeRecording}>
          Resume recording
        </button>
      ) : null}

      {phase === "SAVING" ? (
        <div className="saving-status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          Saving the Recording to this browser…
        </div>
      ) : null}

      {phase === "REVIEW" && latestRecording ? (
        <section className="recording-review">
          <div className="recording-review__head">
            <div>
              <span className="success-check" aria-hidden="true">✓</span>
              <span>
                <strong>Attempt saved locally</strong>
                <small>
                  {(latestRecording.durationMs / 1000).toFixed(1)}s · Attempt{" "}
                  {latestRecording.attemptNo}
                </small>
              </span>
            </div>
            <a
              href={latestRecording.url}
              download={`ailuv-stage-${stage.number}-attempt-${latestRecording.attemptNo}.${recordingExtension(latestRecording.mimeType)}`}
            >
              Download
            </a>
          </div>
          <audio controls preload="metadata" src={latestRecording.url}>
            Your browser cannot play this local recording.
          </audio>
          <p className="recording-playback-note">
            This demo boosts your voice on supported browsers. For the clearest
            result, use headphones and keep the phone about 15–25 cm away.
          </p>
          <div className="patient-nav-row">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={stageRecordings.length >= 4}
              onClick={redo}
            >
              Redo
            </button>
            <button type="button" className="btn btn--primary" onClick={onEvaluate}>
              Next
            </button>
          </div>
        </section>
      ) : null}
    </PatientShell>
  );
}

function EvaluationPage({
  stage,
  completed,
  onSubmit,
  onReset,
}: {
  stage: MockStage;
  completed: number;
  onSubmit: (rating: Rating) => void;
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<Rating | null>(null);
  return (
    <PatientShell onReset={onReset}>
      <DailyProgress completed={completed} />
      <div className="evaluation-mark" aria-hidden="true">✦</div>
      <div className="center-copy">
        <p className="eyebrow">Stage {stage.number} · {stage.title}</p>
        <h1 className="patient-title">How do you feel this time?</h1>
        <p className="patient-lede">
          Your choice completes this stage and updates local progress.
        </p>
      </div>
      <div className="patient-sentiment" role="radiogroup" aria-label="How do you feel">
        {RATING_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected === option.id}
            className={[
              "patient-sentiment__card",
              selected === option.id ? "patient-sentiment__card--selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setSelected(option.id)}
          >
            <span className="patient-sentiment__face" aria-hidden="true">{option.face}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn btn--primary patient-cta push-bottom"
        disabled={!selected}
        onClick={() => selected && onSubmit(selected)}
      >
        Continue
      </button>
    </PatientShell>
  );
}

function CompletePage({
  progress,
  recordings,
  onDailyRating,
  onFinish,
  onDeleteRecording,
  onReset,
}: {
  progress: MockProgress;
  recordings: PlayableRecording[];
  onDailyRating: (rating: Rating) => void;
  onFinish: () => void;
  onDeleteRecording: (id: string) => void;
  onReset: () => void;
}) {
  return (
    <PatientShell onReset={onReset}>
      <div className="completion-art" aria-hidden="true">
        <span>♪</span><i /><i /><i />
      </div>
      <div className="center-copy">
        <p className="eyebrow">{MOCK_SESSION.planDateLabel}</p>
        <h1 className="patient-title">
          {progress.finished ? "Practice complete" : "Today’s stages are complete"}
        </h1>
        <p className="patient-lede">
          {progress.finished
            ? "Thank you for practicing today."
            : "How did you find today’s practice?"}
        </p>
      </div>

      {!progress.finished ? (
        <div className="patient-sentiment" role="radiogroup" aria-label="Daily feeling">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={progress.dailyRating === option.id}
              className={[
                "patient-sentiment__card",
                progress.dailyRating === option.id
                  ? "patient-sentiment__card--selected"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onDailyRating(option.id)}
            >
              <span className="patient-sentiment__face" aria-hidden="true">{option.face}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <article className="complete-summary">
          <strong>5 / 5 stages</strong>
          <span>{recordings.length} local Recording{recordings.length === 1 ? "" : "s"}</span>
        </article>
      )}

      <section className="recording-library">
        <div className="section-heading">
          <div>
            <p className="eyebrow">On this device</p>
            <h2>Local recordings</h2>
          </div>
          <span>{recordings.length}</span>
        </div>
        {recordings.length ? (
          <div className="recording-list">
            {recordings.map((recording) => (
              <article key={recording.id} className="recording-item">
                <div className="recording-item__meta">
                  <span className="recording-item__stage">{recording.stageNo}</span>
                  <span>
                    <strong>{mockStage(recording.stageNo).title}</strong>
                    <small>
                      Attempt {recording.attemptNo} ·{" "}
                      {(recording.durationMs / 1000).toFixed(1)}s
                    </small>
                  </span>
                </div>
                <audio controls preload="metadata" src={recording.url} />
                <div className="recording-item__actions">
                  <a
                    href={recording.url}
                    download={`ailuv-stage-${recording.stageNo}-attempt-${recording.attemptNo}.${recordingExtension(recording.mimeType)}`}
                  >
                    Download
                  </a>
                  <button type="button" onClick={() => onDeleteRecording(recording.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-recordings">No local recordings are available.</p>
        )}
      </section>

      {!progress.finished ? (
        <button
          type="button"
          className="btn btn--primary patient-cta"
          disabled={!progress.dailyRating}
          onClick={onFinish}
        >
          Finish local session
        </button>
      ) : null}
    </PatientShell>
  );
}

export function App() {
  const [progress, setProgress] = useState<MockProgress>(loadProgress);
  const [screen, setScreen] = useState<Screen>(() =>
    screenFromPath(window.location.pathname, loadProgress()),
  );
  const [recordings, setRecordings] = useState<StoredRecording[]>([]);

  const playableRecordings = useMemo<PlayableRecording[]>(
    () =>
      recordings.map((recording) => ({
        ...recording,
        url: URL.createObjectURL(recording.blob),
      })),
    [recordings],
  );

  useEffect(
    () => () => {
      for (const recording of playableRecordings) URL.revokeObjectURL(recording.url);
    },
    [playableRecordings],
  );

  useEffect(() => {
    void listRecordings()
      .then(setRecordings)
      .catch(() => setRecordings([]));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Private browsing may disable durable storage; the in-memory mock still works.
    }
  }, [progress]);

  const navigate = useCallback((next: Screen, stageNo = progress.stageNo, replace = false) => {
    const path = pathFor(next, stageNo);
    if (replace) window.history.replaceState(null, "", path);
    else window.history.pushState(null, "", path);
    setScreen(next);
  }, [progress.stageNo]);

  useEffect(() => {
    if (window.location.pathname === "/") {
      navigate(screen, progress.stageNo, true);
    }
    const onPopState = () => {
      const stageNo = stageFromPath(window.location.pathname);
      if (stageNo) {
        setProgress((current) => ({ ...current, stageNo }));
      }
      setScreen(screenFromPath(window.location.pathname, progress));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate, progress, screen]);

  async function reset(): Promise<void> {
    stopStageCue();
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      // Keep resetting the in-memory mock if durable storage is unavailable.
    }
    setRecordings([]);
    setProgress(EMPTY_PROGRESS);
    navigate("code", 1);
    try {
      await clearRecordings();
    } catch {
      // The progress reset remains useful if IndexedDB is unavailable.
    }
  }

  function addRecording(recording: StoredRecording): void {
    setRecordings((current) => [
      ...current.filter((item) => item.id !== recording.id),
      recording,
    ]);
  }

  async function removeRecording(id: string): Promise<void> {
    try {
      await deleteRecording(id);
    } catch {
      // Remove the in-memory item even when IndexedDB is unavailable.
    }
    setRecordings((current) => current.filter((item) => item.id !== id));
  }

  if (screen === "code") {
    return (
      <CodePage
        onReset={() => void reset()}
        onVerified={() => {
          setProgress((current) => ({ ...current, verified: true }));
          navigate("intro");
        }}
      />
    );
  }

  if (screen === "intro") {
    return (
      <IntroPage
        onReset={() => void reset()}
        onBegin={() => {
          setProgress((current) => ({ ...current, started: true }));
          navigate("protocol");
        }}
      />
    );
  }

  if (screen === "protocol") {
    return (
      <ProtocolPage
        progress={progress}
        onReset={() => void reset()}
        onStart={() => navigate("stage", progress.stageNo)}
      />
    );
  }

  if (screen === "stage") {
    return (
      <StagePage
        stageNo={progress.stageNo}
        completed={progress.completedStages.length}
        stageRecordings={playableRecordings.filter(
          (recording) => recording.stageNo === progress.stageNo,
        )}
        onSaved={addRecording}
        onEvaluate={() => navigate("evaluate")}
        onPauseSession={() => navigate("protocol")}
        onReset={() => void reset()}
      />
    );
  }

  if (screen === "evaluate") {
    return (
      <EvaluationPage
        stage={mockStage(progress.stageNo)}
        completed={progress.completedStages.length}
        onReset={() => void reset()}
        onSubmit={(rating) => {
          const completedStages = Array.from(
            new Set([...progress.completedStages, progress.stageNo]),
          ).sort();
          const lastStage = progress.stageNo === 5;
          const nextStage = lastStage ? 5 : progress.stageNo + 1;
          setProgress((current) => ({
            ...current,
            stageNo: nextStage,
            completedStages,
            stageRatings: {
              ...current.stageRatings,
              [String(progress.stageNo)]: rating,
            },
          }));
          navigate(lastStage ? "complete" : "stage", nextStage);
        }}
      />
    );
  }

  return (
    <CompletePage
      progress={progress}
      recordings={playableRecordings}
      onReset={() => void reset()}
      onDailyRating={(dailyRating) =>
        setProgress((current) => ({ ...current, dailyRating }))
      }
      onFinish={() => setProgress((current) => ({ ...current, finished: true }))}
      onDeleteRecording={(id) => void removeRecording(id)}
    />
  );
}
