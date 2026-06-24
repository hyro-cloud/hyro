import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1.75rem',
      screens: { '2xl': '1240px' },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        hyro: {
          bg: 'rgb(var(--hyro-bg) / <alpha-value>)',
          panel: 'rgb(var(--hyro-panel) / <alpha-value>)',
          ink: 'rgb(var(--hyro-ink) / <alpha-value>)',
          mute: 'rgb(var(--hyro-mute) / <alpha-value>)',
          dim: 'rgb(var(--hyro-dim) / <alpha-value>)',
          faint: 'rgb(var(--hyro-faint) / <alpha-value>)',
          line: 'rgb(var(--hyro-line) / <alpha-value>)',
          hover: 'rgb(var(--hyro-hover) / <alpha-value>)',
          blue: '#3b8cff',
          'blue-hi': '#6ba8ff',
          'blue-lo': '#2563eb',
          cyan: '#38bdf8',
          green: '#34d399',
          red: '#f87171',
          /** Real CLI dashboard palette (matches `hyro` TUI) */
          amber: '#ffb000',
          'amber-hi': '#ffd166',
          'amber-dim': '#b9760a',
          term: '#f3ede1',
          'term-dim': '#6b6456',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        pulseDot: { '50%': { opacity: '0.4' } },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        blink: 'blink 1.05s steps(2, start) infinite',
        marquee: 'marquee 38s linear infinite',
        pulseDot: 'pulseDot 2s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
