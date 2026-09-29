import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resuelve los alias de rutas del tsconfig (Vite ya lo soporta sin plugin)
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Mientras no haya pruebas unitarias, "pnpm test" no debe fallar
    passWithNoTests: true,
  },
});
