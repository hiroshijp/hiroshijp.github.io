import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';

const SRC = path.resolve('src');
const OUT = path.resolve('build');
const pages = [];

async function clean() {
  await fs.rm(OUT, { recursive: true, force: true });
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      await processMarkdown(full);
    } else if (entry.isFile()) {
      // copy non-markdown assets as-is
      const rel = path.relative(SRC, full);
      const dest = path.join(OUT, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(full, dest);
    }
  }
}

async function processMarkdown(file) {
  const rel = path.relative(SRC, file);
  const target = path.join(OUT, rel.replace(/\.md$/i, '.html'));
  const md = await fs.readFile(file, 'utf8');
  const htmlBody = marked.parse(md);

  const page = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${path.basename(file, '.md')}</title>
<style>
body { font-family: sans-serif; padding: 2rem; max-width: 40rem; margin: auto; }
pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; }
code { background: #eee; padding: 2px 4px; }
a { color: #0366d6; text-decoration: none; }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, page, 'utf8');
  pages.push(rel.replace(/\.md$/i, '.html'));
}

async function main() {
  await clean();
  try {
    await walk(SRC);
    // generate index.html listing all pages
    await fs.mkdir(OUT, { recursive: true });
    pages.sort();
    const listItems = pages.map(p => `  <li><a href="${p}">${p}</a></li>`).join('\n');
    const indexPage = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Index</title>
<style>
body { font-family: sans-serif; padding: 2rem; max-width: 40rem; margin: auto; }
a { color: #0366d6; text-decoration: none; }
li { margin: .4rem 0 }
</style>
</head>
<body>
<h1>Index</h1>
<ul>
${listItems}
</ul>
</body>
</html>`;
    await fs.writeFile(path.join(OUT, 'index.html'), indexPage, 'utf8');
    console.log('build complete');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
