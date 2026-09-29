import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resuelve los alias de rutas del tsconfig (Vite ya lo soporta sin plugin)
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
