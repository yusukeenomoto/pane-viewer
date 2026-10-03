# Security Policy

## Reporting a vulnerability

Please report security issues to **info@eeenoooo.com**. Do not open a public
issue for anything that could put users at risk. You should get a reply within a
few days.

セキュリティ上の問題は **info@eeenoooo.com** までご連絡ください。利用者に
影響しうる内容は、公開 issue ではなくメールでお願いします。

## Scope

PaneViewer runs entirely in the browser. It has no backend, no accounts, and no
telemetry, and it never uploads the files you open — they are read locally and
rendered on a canvas. The most relevant risks are therefore in how untrusted
files are parsed:

- PDF rendering uses [PDF.js](https://github.com/mozilla/pdfjs-dist)
- TIFF decoding uses [UTIF.js](https://github.com/photopea/UTIF.js)

Vulnerabilities in those libraries should be reported to their maintainers, but
please tell us as well so the dependency can be updated here.

To limit what a parser bug could do, the deployment sends a strict
Content-Security-Policy (no inline or external scripts, `object-src 'none'`,
`frame-ancestors 'none'`) along with `X-Content-Type-Options`, `X-Frame-Options`
and the other hardening headers. They live in `public/_headers`, which the build
copies into `dist/` for Cloudflare to apply.

## Supported versions

Only the latest commit on `main` is supported.
