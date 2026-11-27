import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // './' damit die App auch unter https://NAME.github.io/vokabeltrainer/ funktioniert
  base: './',
  plugins: [tailwindcss()],
  // alles flach in dist/ – ohne Unterordner, damit der Upload auf GitHub einfach ist
  build: { assetsDir: '' },
});
