import type { Mode } from "../types";

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  userName: string;
  onOpenSettings: () => void;
};

export function TopHeader({ mode, onModeChange, userName, onOpenSettings }: Props) {
  return (
    <header className="top-header">
      <div className="brand">
        <div className="brand-icon">S</div>
        <div className="brand-title">Speech Rehabilitation Assistant (MIT)</div>
      </div>
      <div className="header-actions">
        <label className="mode-toggle">
          <span>Caregiver Mode</span>
          <input
            type="checkbox"
            checked={mode === "caregiver"}
            onChange={(e) => onModeChange(e.target.checked ? "caregiver" : "patient")}
          />
        </label>
        <button className="icon-btn" aria-label="settings" onClick={onOpenSettings} title="Open settings">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.13 7.13 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.13 7.13 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.43 7.43 0 0 0-.05.94 7.43 7.43 0 0 0 .05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.05.71 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.23 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <div className="user-chip">{userName}</div>
      </div>
    </header>
  );
}
