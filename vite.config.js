import { defineConfig, loadEnv } from 'vite';

// Forward local development and preview requests to the API target.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'API_');
  const target = process.env.API_TARGET || env.API_TARGET || 'http://aurelion.local:3000';
  const proxy = { '/api': { target, changeOrigin: true }, '/health': { target, changeOrigin: true } };
  return { server: { port: 5173, strictPort: true, proxy }, preview: { proxy } };
});
