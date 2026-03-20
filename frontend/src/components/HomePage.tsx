type Props = {
  currentTask: string;
  progressPercent: number;
  onStartTraining: () => void;
  onOpenDrill: (phrase: string) => void;
};

export function HomePage({ currentTask, progressPercent, onStartTraining, onOpenDrill }: Props) {
  const trainingCards = [
    { text: "I want to drink water", level: "Level 1: Unison Phase", score: "Last Score: 90%" },
    { text: "I am hungry", level: "Level 2: Cued Phase", score: "Last Score: 75%" },
    { text: "Please help me", level: "Level 3: Rhythmic Phase", score: "Last Score: 85%" },
    { text: "I want to rest", level: "Level 4C: Natural Speech", score: "Last Goal Met: Yes" },
    { text: "I am hurting", level: "Level 1: Unison Phase", score: "Needs practice" },
  ];

  return (
    <>
      <section className="panel welcome-panel">
        <h2>Hello, Ms. Zhang. Let's start today's pronunciation practice!</h2>
        <p className="muted">
          Today's Progress: {Math.max(1, Math.round((progressPercent / 100) * 5))}/5 ({Math.floor(progressPercent / 20)} completed)
        </p>
        <div className="progress large">
          <div style={{ width: `${Math.max(12, progressPercent)}%` }} />
        </div>
        <p className="muted">Current stage: {currentTask}</p>
        <button className="button-primary full-width" onClick={onStartTraining}>
          One-Click Start Today's Training
        </button>
      </section>
      <section className="panel">
        <h3>Training Task Recommendation</h3>
        <div className="home-task-grid">
          {trainingCards.map((item) => (
            <button key={item.text} className="task-card" onClick={() => onOpenDrill(item.text)}>
              <div className="task-main">
                <div className="task-text">{item.text}</div>
                <div className="task-meta">
                  <span className="task-level">{item.level}</span>
                  <span>{item.score}</span>
                </div>
              </div>
              <div className="play-chip">
                <span className="play-icon">PLAY</span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="footer-note">
        <span>Vibration Module: Connected check</span>
        <span>Disclaimer: This tool is for pronunciation practice assistance only.</span>
      </section>
    </>
  );
}
