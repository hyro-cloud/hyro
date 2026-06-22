import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bin.ts', 'src/index.ts', 'src/ink-entry.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  dts: true,
  splitting: true,
  sourcemap: true,
  bundle: true,
  external: [
    '@hyro/core',
    '@hyro/sdk',
    'ink',
    'react',
    'ink-text-input',
    'ink-spinner',
    'commander',
    'chalk',
    'react-devtools-core',
  ],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
