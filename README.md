# PaneViewer

A browser-based viewer for arranging images, PDFs, and TIFFs in multiple panes. Use it to inspect files side by side with synchronized zooming and panning.

画像・PDF・TIFFを複数のペインに並べて表示し、同期ズームやパンで見比べられるブラウザービューアーです。

**[pane-viewer.eeenoooo.com](https://pane-viewer.eeenoooo.com)**

> PaneViewer is for visual inspection only. It does not guarantee that files match.
>
> このアプリは視覚的に確認を行うもので、ファイル間の一致を保証するものではありません。

## Features

- Arrange panes in a grid of 1–3 rows and 1–3 columns; drag a pane header to swap two panes.
- Open images, multi-page PDFs, and multi-page TIFFs (16-bit TIFFs are converted for display).
- Choose the rendering resolution for PDFs, from 72 to 300 dpi.
- Synchronize zooming and panning while keeping each pane's own offset and scale, or inspect panes independently. "Align" copies the active pane's view to every pane.
- Rotate and flip panes, together or one at a time.
- Export the pane layout as PNG, or copy it to the clipboard.
- Record a comparison as a video, saved alongside a JSON log of what you did.
- Drop that JSON back onto the window to restore the grid, zoom, position, orientation and page of a past session.
- Switch between Japanese and English.
- Files are processed in the browser and are not uploaded by the application. There is no backend, no account, and no telemetry.
- Display settings are kept in `localStorage` (three keys, prefixed `image-viewer.`). The contents and names of the files you open are never stored.

## Usage

Drop a file onto a pane, or click an empty pane to pick one.

| Input | Action |
| --- | --- |
| Two-finger scroll (trackpad) | Pan |
| Pinch, or ⌥ + wheel | Zoom |
| Mouse wheel | Zoom |
| Drag | Pan |
| Double click | Fit the pane |
| `0` / `1` | Fit / actual size |
| `+` / `-` | Zoom in / out |
| `Ctrl`(`⌘`)`+Space`+click | Zoom in 2× at the pointer |
| `Ctrl`(`⌘`)`+Alt`(`⌥`)`+Space`+click | Zoom out 2× at the pointer |
| Arrow keys | Pan |
| `R` / `Shift+R` | Rotate right / left |
| `H` / `V` | Flip horizontally / vertically |
| `S` / `Shift+S` | Toggle sync / align panes |
| `Ctrl`(`⌘`)`+S` | Save a PNG |
| `Ctrl`(`⌘`)`+Shift+C` | Copy a PNG to the clipboard |

The recording button writes `compare_<timestamp>.mp4` (or `.webm`) plus
`compare_<timestamp>.json`. Browsers allow only one automatic download at a
time, so the toast keeps a button to save the log by hand if the second file is
blocked.

## Browser support

Developed and tested on Chrome. Recording uses `MediaRecorder`, whose container
support differs between browsers: Chrome and Safari produce MP4, Firefox
produces WebM, which QuickTime and PowerPoint may not play. Everything else
relies on widely supported APIs.

## Development

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run typecheck
npm run build      # production build into dist/
```

`predev` and `prebuild` copy PDF.js's `cmaps/` and `standard_fonts/` into
`public/`. Without them, PDFs whose fonts are not embedded render with missing
text, so do not remove that step. `public/` is generated and is not tracked.

Tests cover the parts that can break silently: the relative-sync transform,
orientation math, the operation-log format, trackpad detection, and settings
migration. Rendering, recording and file loading are still verified by hand.

## Deployment

`wrangler.jsonc` is the configuration for the author's own Cloudflare Workers
deployment. A fork should change `name` and `routes` before running
`npm run deploy`, or delete the file and serve `dist/` with any static host.

## License

PaneViewer is released under the MIT License. See [LICENSE](LICENSE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for application and dependency license information. Security reports go to [SECURITY.md](SECURITY.md).
