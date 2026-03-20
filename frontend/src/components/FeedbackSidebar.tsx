type Props = {
  autoScore: number | null;
  caregiverDecision: string | null;
  keywordHits: string[];
  masteryPercent: number;
};

export function FeedbackSidebar({ autoScore, caregiverDecision, keywordHits, masteryPercent }: Props) {
  return (
    <aside className="panel">
      <h3>FeedbackSidebar</h3>
      <ul className="list">
        <li>Auto Score: {autoScore === null ? "-" : autoScore}</li>
        <li>Caregiver Good/Bad: {caregiverDecision || "Pending"}</li>
        <li>Keyword Hits: {keywordHits.length ? keywordHits.join(", ") : "Keyword match will appear here"}</li>
        <li>Mastery: {masteryPercent}%</li>
      </ul>
      <div className="progress">
        <div style={{ width: `${masteryPercent}%` }} />
      </div>
    </aside>
  );
}
