import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// GramJS (the "telegram" package) expects a few Node globals such as Buffer,
// so we polyfill them for the browser.
export default defineConfig({
  plugins: [nodePolyfills({ protocolImports: true })],
  build: { target: 'es2020', chunkSizeWarningLimit: 2500 },
});
