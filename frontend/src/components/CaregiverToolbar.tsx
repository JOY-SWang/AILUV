type Props = {
  onGood: () => void;
  onBad: () => void;
  onRetry: () => void;
  onPlay: () => void;
};

export function CaregiverToolbar({ onGood, onBad, onRetry, onPlay }: Props) {
  return (
    <div className="panel caregiver-toolbar">
      <button className="button-good" onClick={onGood}>
        Good
      </button>
      <button className="button-bad" onClick={onBad}>
        Bad
      </button>
      <button className="button-neutral" onClick={onRetry}>
        Retry
      </button>
      <button className="button-neutral" onClick={onPlay}>
        Play
      </button>
    </div>
  );
}
