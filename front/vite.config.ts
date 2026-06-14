import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  return {
    plugins: [
      react({
        jsxRuntime: 'automatic',
        babel: isProduction
          ? {
              plugins: [],
            }
          : undefined,
      }),

      isProduction &&
        viteCompression({
          verbose: true,
          disable: false,
          threshold: 10240,
          algorithm: 'gzip',
          ext: '.gz',
          deleteOriginFile: false,
        }),

      isProduction &&
        viteCompression({
          verbose: true,
          disable: false,
          threshold: 10240,
          algorithm: 'brotliCompress',
          ext: '.br',
          deleteOriginFile: false,
        }),

      isProduction &&
        visualizer({
          filename: './dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/pages': path.resolve(__dirname, './src/pages'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/context': path.resolve(__dirname, './src/context'),
        '@/services': path.resolve(__dirname, './src/services'),
      },
    },

    optimizeDeps: {
      exclude: ['lucide-react'],
      include: ['react', 'react-dom', 'react-router-dom', 'axios'],
    },

    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      'import.meta.env.VITE_API_TIMEOUT': JSON.stringify(env.VITE_API_TIMEOUT),
      'import.meta.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION),
      'import.meta.env.VITE_ENABLE_PWA': JSON.stringify(env.VITE_ENABLE_PWA),
      'import.meta.env.VITE_ENABLE_DEVTOOLS': JSON.stringify(env.VITE_ENABLE_DEVTOOLS),
      'import.meta.env.VITE_LOG_LEVEL': JSON.stringify(env.VITE_LOG_LEVEL),
      __DEV__: JSON.stringify(isDevelopment),
      __PROD__: JSON.stringify(isProduction),
    },

    build: {
      target: 'es2020',

      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router')
              ) {
                return 'react-vendor';
              }
              if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                return 'chart-vendor';
              }
              if (id.includes('lucide-react')) {
                return 'ui-vendor';
              }
              if (id.includes('axios')) {
                return 'api-vendor';
              }
              return 'vendor';
            }

            if (id.includes('/src/pages/admin/')) return 'admin';
            if (id.includes('/src/pages/user/')) return 'user';
            if (id.includes('/src/pages/product/')) return 'product';
            if (id.includes('/src/pages/checkout/')) return 'checkout';
            if (id.includes('/src/services/')) return 'services';
          },

          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || 'asset';
            const info = name.split('.');
            const ext = info[info.length - 1];

            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }

            if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }

            return `assets/[ext]/[name]-[hash][extname]`;
          },
        },
      },

      chunkSizeWarningLimit: 1000,

      minify: isProduction ? 'terser' : false,

      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              dead_code: true,
              unused: true,
              pure_funcs: [
                'console.log',
                'console.info',
                'console.debug',
                'console.trace',
              ],
            },
            mangle: {
              safari10: true,
            },
            format: {
              comments: false,
            },
          }
        : undefined,

      sourcemap: isDevelopment,

      cssCodeSplit: true,
      cssMinify: isProduction,
      assetsInlineLimit: 4096,
      reportCompressedSize: isProduction,

      modulePreload: {
        polyfill: true,
      },
    },

    css: {
      devSourcemap: isDevelopment,
      preprocessorOptions: {
        css: {
          charset: false,
        },
      },
    },

    server: {
      hmr: {
        overlay: true,
      },

      compress: true,

      // 🔥 IMPORTANT FIX (THIS IS WHAT YOU WERE MISSING)
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    preview: {
      port: 4173,
      strictPort: true,
      open: true,
    },

    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      target: 'es2020',
      legalComments: 'none',
    },
  };
});