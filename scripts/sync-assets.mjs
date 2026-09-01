import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const output = join(root, 'public', 'media');
const skip = new Set(['node_modules', 'public', 'src', 'scripts', '.git', 'dist']);
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic']);
const audioExtensions = new Set(['.mp3', '.mpeg', '.m4a', '.wav', '.ogg', '.aac']);
const videoExtensions = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!skip.has(entry.name)) files.push(...await walk(join(directory, entry.name)));
    } else {
      const extension = extname(entry.name).toLowerCase();
      if (imageExtensions.has(extension) || audioExtensions.has(extension) || videoExtensions.has(extension)) files.push(join(directory, entry.name));
    }
  }
  return files;
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const files = await walk(root);
const items = [];
for (let index = 0; index < files.length; index += 1) {
  const file = files[index];
  const sourceName = relative(root, file);
  const safeName = `${String(index).padStart(3, '0')}-${file.split(/[/\\]/).at(-1)}`;
  await cp(file, join(output, safeName));
  const extension = extname(file).toLowerCase();
  const type = imageExtensions.has(extension) ? 'image' : videoExtensions.has(extension) ? 'video' : 'audio';
  items.push({ type, name: file.split(/[/\\]/).at(-1), path: `/media/${encodeURIComponent(safeName)}`, special: /webworkedsong\.mp3(?:\.|$)/i.test(sourceName) });
}
await writeFile(join(root, 'public', 'assets.json'), JSON.stringify(items, null, 2));
console.log(`Synced ${items.filter(x => x.type === 'image').length} photos, ${items.filter(x => x.type === 'video').length} videos, and ${items.filter(x => x.type === 'audio').length} audio files.`);
