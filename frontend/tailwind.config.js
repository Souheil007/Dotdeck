/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        background: '#07080b',
        surface: '#0d0f17',
        card: '#141824',
        border: '#1e2438',
        // Dotdeck Tactical Telemetry Tokens
        slate: {
          ground: '#F4F5F7',
          surface: '#FFFFFF',
          border: '#DFE1E6',
          ink: '#121417',
          muted: '#5E6C84',
        },
        obsidian: {
          ground: '#07080B',
          surface: '#111317',
          panel: '#171A21',
          border: '#22262E',
          ink: '#F0F2F5',
          muted: '#8C96A5',
        },
        photonic: {
          blue: '#2684FF',
          cobalt: '#0052CC',
        },
        phosphor: {
          working: '#36B37E',
          'working-light': '#00875A',
          hold: '#FFAB00',
          'hold-light': '#FF8B00',
          alarm: '#FF5630',
          'alarm-light': '#DE350B',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
      },
      transitionTimingFunction: {
        'spring-tactical': 'cubic-bezier(0.34, 1.56, 0.64, 1.0)',
        'out-tactical': 'cubic-bezier(0.16, 1.0, 0.3, 1.0)',
      },
      boxShadow: {
        'tactical-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'tactical-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'tactical-hairline': '0 0 0 1px rgba(255, 255, 255, 0.08)',
        'glow-blue': '0 0 24px -4px rgba(38, 132, 255, 0.25)',
        'glow-working': '0 0 24px -4px rgba(54, 179, 126, 0.25)',
        'glow-hold': '0 0 24px -4px rgba(255, 171, 0, 0.25)',
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
        'cyber-dots': 'radial-gradient(circle, rgba(34, 211, 238, 0.15) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-sm': '24px 24px',
        'dots-sm': '20px 20px',
      },
    },
  },
  plugins: [],
};
