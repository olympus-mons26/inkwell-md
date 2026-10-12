# Inkwell Markdown Editor

A lightweight Markdown editor with a live preview, formatting toolbar, settings drawer, and dark mode by default.

## Features

- Live Markdown preview
- Editor toolbar for common formatting actions
- Save and open `.md` files
- Auto-saves to browser local storage
- Default dark theme
- Default editor font: JetBrains Mono
- Opens `Markdown-Guide.md` by default when no saved document exists

## Project structure

- `src/App.tsx` — main editor UI and document logic
- `src/Settings.tsx` — settings panel
- `src/styles.css` — styling and theme configuration
- `public/Markdown-Guide.md` — default Markdown guide shown on first load

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Deploying to Surge

```bash
surge ./dist inkwell-md.surge.sh
```

## Default behavior

- Theme: dark
- Editor font: JetBrains Mono
- Default document: `Markdown-Guide.md`

## Credits

- Hosted with free Surge support: https://surge.sh
- Made by olympus-mons26: https://github.com/olympus-mons26/inkwell-md
