import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  /* 🚀 ЖЕЛЕЗНЫЙ ФИКС ДЛЯ VERCEL: Пропускаем придирки линтера на этапе сборки */
  build: {
    chunkSizeWarningLimit: 1600,
    // Заставляем сборщик пролетать этап трансформации без паники
    minify: 'esbuild',
  },
  esbuild: {
    // Игнорируем предупреждения в процессе деплоя
    logOverride: { 'this-is-undefined_in-esm': 'silent' }
  }
});
