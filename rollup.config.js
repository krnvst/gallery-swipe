import { defineConfig } from 'rollup';

export default defineConfig({
  input: 'src/gallery.js',
  output: [
    {
      file: 'dist/gallery.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/gallery.cjs',
      format: 'cjs',
      exports: 'named',
      sourcemap: true
    },
    {
      file: 'dist/gallery.global.js',
      format: 'iife',
      name: 'GallerySwipe',
      exports: 'named',
      sourcemap: true
    }
  ]
});
