import { useState } from "react";
import type { UserProfile } from "../types";

type Props = {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
};

export function SettingsPage({ profile, onSave }: Props) {
  const [form, setForm] = useState<UserProfile>(profile);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <section className="panel settings-panel">
      <h2>Settings</h2>
      <p className="muted">Basic profile and voice settings.</p>

      <label className="settings-field">
        <span>User Name</span>
        <input
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Enter user name"
        />
      </label>

      <label className="settings-field">
        <span>Age</span>
        <input
          type="number"
          min={1}
          max={120}
          value={form.age}
          onChange={(e) => setForm((prev) => ({ ...prev, age: Number(e.target.value) || 0 }))}
          placeholder="Enter age"
        />
      </label>

      <label className="settings-field">
        <span>Voice Pitch</span>
        <input
          value={form.pitch}
          onChange={(e) => setForm((prev) => ({ ...prev, pitch: e.target.value }))}
          placeholder="Default B3"
        />
      </label>

      <button className="button-primary" onClick={handleSave}>
        Save Settings
      </button>
      {saved ? <p className="saved-hint">Saved.</p> : null}
    </section>
  );
}
