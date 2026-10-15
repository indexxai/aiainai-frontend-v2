import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig keeps jsx "preserve" for Next.js; tests compile JSX themselves.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { tsconfigPaths: true },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
