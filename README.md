# PaneViewer

A browser-based viewer for arranging images, PDFs, and TIFFs in multiple panes. Use it to inspect files side by side with synchronized zooming and panning.

画像・PDF・TIFFを複数のペインに並べて表示し、同期ズームやパンで見比べられるブラウザービューアーです。

## Features

- Arrange panes in a grid of 1–3 rows and 1–3 columns.
- Open images, multi-page PDFs, and multi-page TIFFs.
- Synchronize zooming and panning, or inspect panes independently.
- Rotate and flip images; export the pane layout as PNG.
- Switch between Japanese and English.
- Files are processed in the browser and are not uploaded by the application.

> PaneViewer is for visual inspection only. It does not guarantee that files match.
>
> このアプリは視覚的に確認を行うもので、ファイル間の一致を保証するものではありません。

## Development

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## License

PaneViewer is released under the MIT License. See [LICENSE](LICENSE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for application and dependency license information.
