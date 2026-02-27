# Markdown Publisher

A **minimal** Node.js project that lets you publish Markdown files with a
very simple, static output. No full‑blown SSG like Docusaurus or Astro is used –
the build step merely converts `.md` documents to plain HTML and copies any
additional assets.

## Features

- Extremely lightweight: only the `marked` parser as a dependency
- `npm run build` makes a `build/` directory ready to deploy
- Markdown → HTML conversion with basic styling
- All other files under `src/` are copied verbatim

## Getting started

1. **Install dependencies**
	```bash
	npm install
	```

2. **Write content**
	Place your Markdown files in `src/`. Subfolders are supported.

3. **Build**
	```bash
	npm run build
	```

	The output will land in `build/`. You can publish that directory to any
	static host (GitHub Pages, Netlify, etc.).

4. **Preview (optional)**
	```bash
	npx serve build
	```

## Example

There is a sample `src/hello.md` included so you can immediately test the
process.

## Customization notes

- The inline CSS in `build.js` keeps the appearance simple; feel free to swap
  it for your own stylesheet by placing a `.css` file in `src/` and adjusting
  the template.
- Only `.md` files are transformed; any other assets (images, JSON, etc.) are
  copied as-is.

Enjoy your markdown-powered site! 😊