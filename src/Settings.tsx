import type { Settings, Theme, EditorFont } from "./App";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

const FONT_OPTIONS = [
  { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", label: "System Sans" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia Serif" },
  { value: "'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace", label: "Mono Code" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Lora', serif", label: "Lora" },
  { value: "'JetBrains Mono', monospace", label: "JetBrains Mono" },
];

const EDITOR_FONT_OPTIONS: { value: EditorFont; label: string }[] = [
  { value: "mono", label: "Monospace" },
  { value: "sans", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
];

export default function SettingsDrawer({ settings, onChange, onClose }: Props) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-body">
          {/* Theme */}
          <div className="setting-group">
            <span className="setting-label">Theme</span>
            <div className="theme-toggle">
              {(["light", "dark"] as Theme[]).map((t) => (
                <button
                  key={t}
                  className={`theme-option ${settings.theme === t ? "active" : ""}`}
                  onClick={() => onChange({ theme: t })}
                >
                  {t === "light" ? "☀ Light" : "☾ Dark"}
                </button>
              ))}
            </div>
          </div>

          {/* Preview font family */}
          <div className="setting-group">
            <span className="setting-label">Preview Font</span>
            <div className="select-input">
              <select
                value={settings.previewFont}
                onChange={(e) => onChange({ previewFont: e.target.value })}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview font size */}
          <div className="setting-group">
            <span className="setting-label">Preview Font Size</span>
            <div className="range-row">
              <input
                type="range"
                min="12"
                max="22"
                value={settings.previewSize}
                onChange={(e) => onChange({ previewSize: Number(e.target.value) })}
              />
              <span className="range-value">{settings.previewSize}px</span>
            </div>
          </div>

          {/* Editor font family */}
          <div className="setting-group">
            <span className="setting-label">Editor Font</span>
            <div className="theme-toggle">
              {EDITOR_FONT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  className={`theme-option ${settings.editorFont === f.value ? "active" : ""}`}
                  onClick={() => onChange({ editorFont: f.value })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editor font size */}
          <div className="setting-group">
            <span className="setting-label">Editor Font Size</span>
            <div className="range-row">
              <input
                type="range"
                min="11"
                max="24"
                value={settings.editorSize}
                onChange={(e) => onChange({ editorSize: Number(e.target.value) })}
              />
              <span className="range-value">{settings.editorSize}px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
