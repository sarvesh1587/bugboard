import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      // Dev proxy → no CORS issues and the same relative /api URLs in dev and prod
      proxy: { '/api': target, '/uploads': target },
    },
  };
});
