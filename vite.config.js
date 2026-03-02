import { defineConfig } from 'vite';

export default defineConfig({
  // Serve WASM files with correct MIME type
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  // Ensure .wasm files are treated as assets
  assetsInclude: ['**/*.wasm'],
});
