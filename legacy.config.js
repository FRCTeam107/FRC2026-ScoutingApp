// Vite plugin for legacy browser support
// https://github.com/vitejs/vite-plugin-legacy
import legacy from '@vitejs/plugin-legacy';

export default legacy({
  targets: ['chrome >= 64', 'android >= 7.1'],
  // Polyfills for ES6 features
  additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
  modernPolyfills: true,
});
