export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Support last 2 versions of major browsers
      overrideBrowserslist: [
        '>0.2%',
        'not dead',
        'not op_mini all',
        'last 2 versions',
        'Firefox ESR',
        'iOS >= 12',
        'Safari >= 12',
      ],
      // Add prefixes for backdrop-filter (glass effects)
      grid: 'autoplace',
    },
    // Only apply cssnano in production (handled by vite.config.ts)
  },
};
