import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O CRM é publicado em https://www.bravusmidia.com.br/crm/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/crm/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], charts: ['recharts'], supabase: ['@supabase/supabase-js'] } } },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
