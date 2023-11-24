import analyze from 'rollup-plugin-analyzer';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

import react from '@vitejs/plugin-react';

/** @type {import('vite').UserConfig} */
const config = {
  root: 'src',
  plugins: [wasm(), topLevelAwait(), react(), analyze()]
};

export default config;
