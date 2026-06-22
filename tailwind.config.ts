import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07090d',
          900: '#0b0f15',
          800: '#11161f',
          700: '#1a2230',
          600: '#243043',
          500: '#34425a',
          400: '#5b6b86',
          300: '#8895af',
          200: '#b4becf',
          100: '#dfe4ed'
        },
        pickle: {
          400: '#b6e84f',
          500: '#9ad933',
          600: '#7cba1f',
          700: '#5f9416'
        },
        neon: {
          400: '#5cf2c2'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(154, 217, 51, 0.35), 0 0 24px -6px rgba(154, 217, 51, 0.35)',
        'glow-soft': '0 0 0 1px rgba(92, 242, 194, 0.2), 0 0 18px -4px rgba(92, 242, 194, 0.18)'
      },
      keyframes: {
        matrixDrift: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.6' },
          '100%': { transform: 'translateY(100%)', opacity: '0' }
        },
        cursorBlink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' }
        },
        softPulse: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' }
        }
      },
      animation: {
        'matrix-drift': 'matrixDrift 6s linear infinite',
        'cursor-blink': 'cursorBlink 1.05s steps(2, start) infinite',
        'soft-pulse': 'softPulse 3s ease-in-out infinite'
      }
    }
  },
  plugins: []
};

export default config;
