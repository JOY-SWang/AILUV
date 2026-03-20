import { splitToSyllables } from "../state/useTrainingStore";
import type { Mode, PhraseDrillState, StepConfig } from "../types";

const DRILL_TILES = ["I", "Want", "Wa-", "-ter"];

type Props = {
  mode: Mode;
  state: PhraseDrillState;
  step: StepConfig;
  onListen: () => void;
  onSpeak: () => void;
  onStopRecording: () => void;
  onPlay: () => void;
  onCaregiverGood: () => void;
  onCaregiverBad: () => void;
  onCaregiverRetry: () => void;
  onCaregiverSkip: () => void;
};

export function PhraseDrillPage({
  mode,
  state,
  step,
  onListen,
  onSpeak,
  onStopRecording,
  onPlay,
  onCaregiverGood,
  onCaregiverBad,
  onCaregiverRetry,
  onCaregiverSkip,
}: Props) {
  const fallbackSyllables = splitToSyllables(state.phrase);
  const syllables = DRILL_TILES.length === 4 ? DRILL_TILES : fallbackSyllables;
  const activeSyllable = state.isPlayingDemo
    ? state.playbackBeatIndex % 4
    : (state.stepIndex + state.attemptCount) % Math.max(syllables.length, 1);
  const activeAction: "listen" | "speak" | "play" = state.isPlayingDemo ? "play" : step.needsSpeech ? "speak" : "listen";
  const scoreText = state.localScore === 2 ? "Great!" : state.localScore === 1 ? "Good!" : "Keep Going";
  const combo = Math.max(0, state.consecutiveSuccessCount + (state.localScore === 2 ? 1 : 0));

  return (
    <div className="drill-reference-layout panel">
      <div className="drill-main">
        <div className="drill-meta-row">
          <div className="meta-chip">Attempts: {state.attemptCount}/10</div>
          <div className="meta-chip">Current Level: {step.name}</div>
          <div className="meta-chip">Prompt: {step.task}</div>
        </div>

        <div className={`syllable-stage ${state.isPlayingDemo ? "pulse" : ""}`}>
          {syllables.map((item, idx) => (
            <div key={`${item}-${idx}`} className={`syllable-tile ${idx === activeSyllable ? "active" : ""}`}>
              {item}
            </div>
          ))}
        </div>

        <div className="beat-lane">
          <div className="beat-title">Beat Lane</div>
          <div className="beat-dots">
            {[0, 1, 2, 3].map((beat) => (
              <span key={beat} className={`beat-dot ${beat === activeSyllable % 4 ? "active" : ""}`} />
            ))}
          </div>
        </div>

        <div className="drill-controls">
          <button className={`control-btn ${activeAction === "listen" ? "active" : ""}`} onClick={onListen}>
            Listen
          </button>
          <button
            className={`control-btn ${state.isRecording ? "recording" : ""} ${activeAction === "speak" ? "active" : ""}`}
            onClick={state.isRecording ? onStopRecording : onSpeak}
          >
            {state.isRecording ? "Stop" : "Record"}
          </button>
          <button className={`control-btn ${activeAction === "play" ? "active" : ""}`} onClick={onPlay}>
            Play
          </button>
          <div className="bpm-box">
            BPM
            <input type="range" min={40} max={120} value={60} readOnly />
            <span>60</span>
          </div>
        </div>

        <div className="drill-feedback">{state.feedbackMessage}</div>
      </div>

      <aside className="drill-side">
        <div className="perf-title">Performance Lane</div>
        <div className="score-banner">{scoreText}</div>
        <div className="side-grid">
          <div className="info-card">
            <div className="info-label">Combo Counter</div>
            <div className="info-value">+{combo}</div>
          </div>
          <div className="info-card">
            <div className="info-label">Caregiver Rating</div>
            <div className="info-value">{state.caregiverDecision || "Pending"}</div>
          </div>
        </div>
        <div className="keywords-block">
          Keywords Correct: {state.keywordHits.length ? state.keywordHits.join(", ") : "Waiting..."}
        </div>
        <div className="progress">
          <div style={{ width: `${state.masteryPercent}%` }} />
        </div>
        {mode === "caregiver" ? (
          <div className="caregiver-sidebar-toolbar">
            <div className="caregiver-sidebar-title">Caregiver Actions</div>
            <div className="caregiver-sidebar-btns">
              <button className="button-good" onClick={onCaregiverGood}>Good</button>
              <button className="button-bad" onClick={onCaregiverBad}>Bad</button>
              <button className="button-neutral" onClick={onCaregiverRetry}>Retry</button>
              <button className="button-neutral" onClick={onCaregiverSkip}>Skip</button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
