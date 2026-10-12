import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import SettingsDrawer from "./Settings";

const STORAGE_KEY = "inkwell:document";
const STORAGE_FILENAME_KEY = "inkwell:filename";
const SETTINGS_KEY = "inkwell:settings";

export type Theme = "light" | "dark";
export type EditorFont = "mono" | "sans" | "serif";

export interface Settings {
  theme: Theme;
  previewFont: string;
  previewSize: number;
  editorFont: EditorFont;
  editorSize: number;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  previewFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  previewSize: 15,
  editorFont: "mono",
  editorSize: 14,
};

const EDITOR_FONT_MAP: Record<EditorFont, string> = {
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

const SAMPLE_DOC = `# Markdown Reference Guide

Welcome to **Inkwell** — a clean Markdown editor with live preview.
Write on the left, see the result on the right. Use the formatting
buttons above the editor, or type the syntax directly.

---

## Headings

Use \`#\` marks for headings. More hashes = smaller heading.

\`\`\`markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
\`\`\`

## Text Styles

| Style | Syntax | Result |
|------|--------|--------|
| **Bold** | \`**text**\` | **bold** |
| *Italic* | \`*text*\` | *italic* |
| ***Both*** | \`***text***\` | ***bold + italic*** |
| ~~Strikethrough~~ | \`~~text~~\` | ~~struck~~ |
| \`Inline code\` | \\\`code\\\` | \`code\` |

## Lists

**Unordered** — use \`-\`, \`+\`, or \`*\`:

- First item
- Second item
  - Nested item
- Third item

**Ordered** — use numbers:

1. First
2. Second
3. Third

## Links and Images

Links: \`[link text](https://example.com)\` → [link text](https://example.com)

Images: \`![alt text](https://example.com/image.png)\`

## Blockquotes

Use \`>\` before a line:

> "The best way to predict the future is to invent it."
> — Alan Kay

## Code Blocks

Use triple backticks. Optionally add a language for highlighting hints.

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Tables

Use pipes \`|\` and dashes \`-\`:

\`\`\`markdown
| Name  | Age |
|-------|-----|
| Alice | 30  |
| Bob   | 25  |
\`\`\`

## Horizontal Rule

Three dashes or asterisks on a line create a divider:

---

## Task Lists

Use \`- [ ]\` or \`- [x]\`:

- [x] Learn Markdown basics
- [x] Try the formatting buttons
- [ ] Write something amazing

---

**Tips:** Click the formatting buttons above the editor to insert
syntax automatically. Your work auto-saves to the browser. Use
**Save .md** to download a file, or **Open File** to load one.

Happy writing!
`;

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

function loadDoc(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ?? "";
  } catch {
    return "";
  }
}

function loadFilename(): string {
  try {
    return localStorage.getItem(STORAGE_FILENAME_KEY) ?? "Markdown-Guide.md";
  } catch {
    return "Markdown-Guide.md";
  }
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_\-. ]/g, "").trim();
  if (!cleaned) return "untitled.md";
  return cleaned.toLowerCase().endsWith(".md") ? cleaned : `${cleaned}.md`;
}

// ---- Text formatting helpers ----

interface FormatAction {
  id: string;
  label: string;
  title: string;
  apply: (before: string, sel: string, after: string) => string;
}

// Wrap selection with a prefix/suffix
function wrap(prefix: string, suffix: string = prefix, placeholder = "text") {
  return (before: string, sel: string, after: string): string => {
    const text = sel || placeholder;
    return before + prefix + text + suffix + after;
  };
}

// Prefix each selected line
function linePrefix(prefix: string) {
  return (before: string, sel: string, after: string): string => {
    if (!sel) sel = "text";
    const lines = sel.split("\n").map((l) => prefix + l);
    return before + lines.join("\n") + after;
  };
}

const FORMAT_ACTIONS: FormatAction[] = [
  { id: "bold", label: "B", title: "Bold  (Ctrl+B)", apply: wrap("**") },
  { id: "italic", label: "I", title: "Italic  (Ctrl+I)", apply: wrap("*") },
  { id: "strike", label: "S", title: "Strikethrough", apply: wrap("~~") },
  { id: "code", label: "</>", title: "Inline code", apply: wrap("`") },
  { id: "h1", label: "H1", title: "Heading 1", apply: linePrefix("# ") },
  { id: "h2", label: "H2", title: "Heading 2", apply: linePrefix("## ") },
  { id: "h3", label: "H3", title: "Heading 3", apply: linePrefix("### ") },
  { id: "quote", label: "❝", title: "Blockquote", apply: linePrefix("> ") },
  { id: "ul", label: "•", title: "Bullet list", apply: linePrefix("- ") },
  { id: "ol", label: "1.", title: "Numbered list", apply: linePrefix("1. ") },
  { id: "task", label: "☐", title: "Task list", apply: linePrefix("- [ ] ") },
  {
    id: "link",
    label: "🔗",
    title: "Link",
    apply: (before, sel) => before + `[${sel || "link text"}](https://)`,
  },
  {
    id: "image",
    label: "🖼",
    title: "Image",
    apply: (before, sel) => before + `![${sel || "alt text"}](https://)`,
  },
  {
    id: "codeblock",
    label: "{ }",
    title: "Code block",
    apply: (before, sel) =>
      before + "```\n" + (sel || "code here") + "\n```",
  },
  {
    id: "hr",
    label: "―",
    title: "Horizontal rule",
    apply: (before) => before + "\n---\n",
  },
  {
    id: "table",
    label: "▦",
    title: "Table",
    apply: (before) =>
      before +
      "| Column 1 | Column 2 |\n|----------|----------|\n| Cell     | Cell     |\n",
  },
];

export default function App() {
  const [doc, setDoc] = useState(loadDoc);
  const [filename, setFilename] = useState(loadFilename);
  const [settings, setSettings] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("saved");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme + font settings as CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", settings.theme);
    root.style.setProperty("--font-sans", settings.previewFont);
    root.style.setProperty("--font-size", `${settings.previewSize}px`);
    root.style.setProperty("--editor-font", EDITOR_FONT_MAP[settings.editorFont]);
    root.style.setProperty("--editor-size", `${settings.editorSize}px`);
  }, [settings]);

  useEffect(() => {
    try {
      const hasSavedDocument = localStorage.getItem(STORAGE_KEY) !== null;
      if (hasSavedDocument) return;

      fetch("/Markdown-Guide.md")
        .then((response) => {
          if (!response.ok) throw new Error("Unable to load guide");
          return response.text();
        })
        .then((text) => {
          setDoc(text);
          setFilename("Markdown-Guide.md");
        })
        .catch(() => {
          setDoc(SAMPLE_DOC);
          setFilename("Markdown-Guide.md");
        });
    } catch {
      setDoc(SAMPLE_DOC);
      setFilename("Markdown-Guide.md");
    }
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Auto-save document (debounced)
  useEffect(() => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, doc);
      localStorage.setItem(STORAGE_FILENAME_KEY, filename);
      setSaveState("saved");
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc]);

  // Render markdown -> sanitized HTML
  const previewHtml = useMemo(() => {
    const raw = marked.parse(doc, { async: false, breaks: true }) as string;
    return DOMPurify.sanitize(raw);
  }, [doc]);

  // Save as .md file
  const handleSaveFile = useCallback(() => {
    const blob = new Blob([doc], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [doc]);

  // Load .md file from computer
  const handleLoadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setDoc(text);
      setFilename(file.name);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // Apply a formatting action to the textarea at the current selection
  const applyFormat = useCallback((action: FormatAction) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = doc.slice(0, start);
    const sel = doc.slice(start, end);
    const after = doc.slice(end);

    // For wrap actions, place cursor inside the wrapping markers
    const isWrap = ["bold", "italic", "strike", "code"].includes(action.id);
    const newDoc = action.apply(before, sel, after);
    setDoc(newDoc);

    // Restore selection / place cursor after the edit
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      if (isWrap && !sel) {
        // Place cursor between the markers, on the placeholder text
        const innerLen = sel ? sel.length : 4; // "text" placeholder
        textareaRef.current.selectionStart = start + 2; // after prefix
        textareaRef.current.selectionEnd = start + 2 + innerLen;
      } else {
        textareaRef.current.selectionStart = start;
        textareaRef.current.selectionEnd = newDoc.length - after.length;
      }
      textareaRef.current.focus();
    });
  }, [doc]);

  // Keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        handleSaveFile();
        return;
      }
      if (key === "b") {
        e.preventDefault();
        applyFormat(FORMAT_ACTIONS[0]);
        return;
      }
      if (key === "i") {
        e.preventDefault();
        applyFormat(FORMAT_ACTIONS[1]);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSaveFile, applyFormat]);

  // Create a new file: clear content and ask for a filename
  const handleNewFile = useCallback(() => {
    const input = window.prompt("Enter a name for the new file:", "untitled.md");
    if (input === null) return;
    const name = sanitizeFilename(input);
    setFilename(name);
    setDoc("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const updateSettings = (patch: Partial<Settings>) =>
    setSettings((s) => ({ ...s, ...patch }));

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        onChange={handleLoadFile}
        style={{ display: "none" }}
      />

      {/* Toolbar */}
      <header className="toolbar">
        <div className="toolbar-brand">
          <div className="toolbar-brand-icon">I</div>
          Inkwell
        </div>

        <span className={`save-status ${saveState === "saved" ? "saved" : ""}`}>
          {saveState === "saving" ? "Saving…" : "Saved"}
        </span>

        <div className="toolbar-divider" />

        <button className="toolbar-btn toolbar-btn-primary" onClick={handleNewFile}>
          New +
        </button>
        <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()}>
          Open File
        </button>
        <button className="toolbar-btn" onClick={handleSaveFile}>
          Save .md
        </button>

        <div className="toolbar-divider" />

        <button
          className="toolbar-btn"
          onClick={() => setDoc("")}
          title="Clear editor"
        >
          Clear
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setShowSettings(true)}
        >
          Settings
        </button>
      </header>

      {/* Formatting toolbar */}
      <div className="format-bar">
        {FORMAT_ACTIONS.map((action, i) => (
          <span key={action.id} className="format-bar-group">
            {i > 0 && [4, 10, 14].includes(i) && (
              <span className="format-bar-divider" />
            )}
            <button
              className="format-btn"
              title={action.title}
              onClick={() => applyFormat(action)}
            >
              {action.label}
            </button>
          </span>
        ))}
      </div>

      {/* Split pane */}
      <div className="split-pane">
        <section className="pane">
          <div className="pane-header">
            <span>{filename}</span>
            <span>{doc.length} chars</span>
          </div>
          <div className="pane-body">
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              placeholder="Start writing in Markdown…"
              spellCheck
            />
          </div>
        </section>

        <div className="pane-divider" />

        <section className="pane">
          <div className="pane-header">
            <span>Preview</span>
          </div>
          <div className="pane-body">
            <div
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </section>
      </div>

      <footer className="app-footer">
        <p>
          Thank you to <a href="https://surge.sh" target="_blank" rel="noreferrer">Surge</a> for the free hosting
        </p>
        <p>
          made by <a href="https://github.com/olympus-mons26/inkwell-md" target="_blank" rel="noreferrer">olympus-mons26</a>
        </p>
      </footer>

      {showSettings && (
        <SettingsDrawer
          settings={settings}
          onChange={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
