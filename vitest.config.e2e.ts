import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resuelve los alias de rutas del tsconfig (Vite ya lo soporta sin plugin)
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Antes de las pruebas: apunta la app a una base de datos SOLO de pruebas
    setupFiles: ['./test/setup-e2e.ts'],
    // Los archivos e2e comparten esa base: se ejecutan uno tras otro
    fileParallelism: false,
  },
});
