import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await Promise.all([
  copyFile('src/gallery.css', 'dist/gallery.css'),
  copyFile('src/gallery.d.ts', 'dist/gallery.d.ts')
]);
