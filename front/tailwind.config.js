/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Yekan', 'Tahoma', 'Arial', 'sans-serif'],
        yekan: ['Yekan', 'Tahoma', 'sans-serif'],
      },
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.15)',
          medium: 'rgba(255, 255, 255, 0.25)',
          heavy: 'rgba(255, 255, 255, 0.35)',
        },
        border: {
          glass: {
            light: 'rgba(255, 255, 255, 0.2)',
            medium: 'rgba(255, 255, 255, 0.3)',
          },
        },
        text: {
          primary: '#ffffff',
          secondary: 'rgba(255, 255, 255, 0.8)',
          muted: 'rgba(255, 255, 255, 0.6)',
        },
        accent: {
          primary: '#6e8efb',
          secondary: '#a777e0',
        },
        success: {
          color: '#00d4a0',
        },
        warning: {
          color: '#ffb400',
        },
        error: {
          color: '#ff6b6b',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(120deg, #1a1a2e, #16213e, #0f3460)',
        'gradient-secondary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-accent': 'linear-gradient(135deg, #6e8efb, #a777e0)',
      },
      backdropBlur: {
        'glass-light': '8px',
        'glass-medium': '12px',
        'glass-heavy': '16px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.15)',
        'glass-active': '0 4px 16px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'ripple': 'ripple 0.6s linear',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInRight: {
          '0%': {
            transform: 'translateX(100%)',
          },
          '100%': {
            transform: 'translateX(0)',
          },
        },
        ripple: {
          '0%': {
            width: '0',
            height: '0',
            opacity: '1',
          },
          '100%': {
            width: '300px',
            height: '300px',
            opacity: '0',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [
    function({ addUtilities, theme }) {
      const newUtilities = {
        '.glass-base': {
          'backdrop-filter': `blur(${theme('backdropBlur.glass-medium')})`,
          '-webkit-backdrop-filter': `blur(${theme('backdropBlur.glass-medium')})`,
          'border-radius': '16px',
          'border': `1px solid ${theme('colors.border.glass.light')}`,
          'box-shadow': theme('boxShadow.glass'),
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.glass-card': {
          'backdrop-filter': `blur(${theme('backdropBlur.glass-medium')})`,
          '-webkit-backdrop-filter': `blur(${theme('backdropBlur.glass-medium')})`,
          'background': theme('colors.glass.light'),
          'border-radius': '16px',
          'border': `1px solid ${theme('colors.border.glass.light')}`,
          'box-shadow': theme('boxShadow.glass'),
          'padding': '1.5rem',
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.glass-card-hover:hover': {
          'transform': 'translateY(-4px)',
          'box-shadow': theme('boxShadow.glass-hover'),
          'filter': 'brightness(1.1)',
        },
        '.glass-button': {
          'backdrop-filter': `blur(${theme('backdropBlur.glass-medium')})`,
          '-webkit-backdrop-filter': `blur(${theme('backdropBlur.glass-medium')})`,
          'background': theme('colors.glass.medium'),
          'border-radius': '16px',
          'border': `1px solid ${theme('colors.border.glass.light')}`,
          'box-shadow': theme('boxShadow.glass'),
          'padding': '0.75rem 1.5rem',
          'font-weight': '500',
          'cursor': 'pointer',
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          'position': 'relative',
          'overflow': 'hidden',
        },
        '.glass-button:hover': {
          'filter': 'brightness(1.1)',
          'transform': 'translateY(-2px)',
        },
        '.glass-button:active': {
          'transform': 'translateY(0)',
          'box-shadow': theme('boxShadow.glass-active'),
        },
        '.glass-input': {
          'backdrop-filter': `blur(${theme('backdropBlur.glass-medium')})`,
          '-webkit-backdrop-filter': `blur(${theme('backdropBlur.glass-medium')})`,
          'background': theme('colors.glass.light'),
          'border-radius': '16px',
          'border': `1px solid ${theme('colors.border.glass.light')}`,
          'box-shadow': theme('boxShadow.glass'),
          'padding': '0.75rem 1rem',
          'color': theme('colors.text.primary'),
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.glass-input:focus': {
          'outline': 'none',
          'border-color': theme('colors.accent.primary'),
          'box-shadow': `${theme('boxShadow.glass')}, 0 0 0 2px ${theme('colors.accent.primary')}33`,
        },
        '.glass-navbar': {
          'backdrop-filter': `blur(${theme('backdropBlur.glass-medium')})`,
          '-webkit-backdrop-filter': `blur(${theme('backdropBlur.glass-medium')})`,
          'background': theme('colors.glass.medium'),
          'border-radius': '16px',
          'border': `1px solid ${theme('colors.border.glass.light')}`,
          'box-shadow': theme('boxShadow.glass'),
          'position': 'fixed',
          'top': '0',
          'width': '100%',
          'z-index': '50',
        },
        '.glass-modal': {
          'backdrop-filter': `blur(${theme('backdropBlur.glass-heavy')})`,
          '-webkit-backdrop-filter': `blur(${theme('backdropBlur.glass-heavy')})`,
          'background': theme('colors.glass.heavy'),
          'border-radius': '16px',
          'border': `1px solid ${theme('colors.border.glass.medium')}`,
          'box-shadow': theme('boxShadow.glass-hover'),
        },
        '.ripple-effect': {
          'position': 'relative',
          'overflow': 'hidden',
        },
        '.ripple-effect::before': {
          'content': '""',
          'position': 'absolute',
          'top': '50%',
          'left': '50%',
          'width': '0',
          'height': '0',
          'border-radius': '50%',
          'background': 'rgba(255, 255, 255, 0.3)',
          'transform': 'translate(-50%, -50%)',
          'transition': 'width 0.6s, height 0.6s',
        },
        '.ripple-effect:active::before': {
          'width': '300px',
          'height': '300px',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
