// apps/web/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        surface: '#0c0c0e',
        'surface-elevated': '#141416',
        'surface-hover': '#1c1c1f',
        border: '#222226',
        'border-subtle': '#18181b',
        spotify: {
          DEFAULT: '#1DB954',
          hover: '#1ed760',
          dark: '#14833b',
        },
        accent: {
          DEFAULT: '#ffffff',
          hover: '#e4e4e7',
          muted: '#71717a',
        },
      },
      fontFamily: {
        sans: [
          'Geist',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
