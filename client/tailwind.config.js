/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Display — Hero recovered amount (the biggest number on the page)
        'display': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '800' }],
        // Hero — Hero headline
        'hero': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
        // Title — Recovery decision, dominant section labels
        'title': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        // Section — Section headings
        'section': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        // Emphasis — Cause headline, key field values
        'emphasis': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],
        // Body Large — Policy rationale, outreach copy, editorial prose
        'body-lg': ['1.0625rem', { lineHeight: '1.7', letterSpacing: '-0.005em' }],
        // Body — Standard body text
        'body': ['0.9375rem', { lineHeight: '1.6', letterSpacing: '-0.005em' }],
        // UI — Table cell amounts, form field values
        'ui': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0' }],
        // Caption — Subtitles, supporting descriptors
        'caption': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0' }],
        // Label — KPI labels, table headers (uppercase + tracked)
        'label': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.1em' }],
        // Micro — Timestamps, mono metadata
        'micro': ['0.625rem', { lineHeight: '1.4', letterSpacing: '0' }],
      },
      fontWeight: {
        // Named aliases so intent is explicit in JSX
        'editorial': '800',
        'heading': '700',
        'emphasis': '600',
        'ui': '500',
        'body': '400',
        'light': '300',
      },
      colors: {
        canvas: '#f9f8f5',
        surface: {
          50: '#ffffff',
          100: '#f8f7f4',
          200: '#f0efe9',
          300: '#e4e3db',
          400: '#cccbc0',
        },
        ink: {
          950: '#0c1117',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'elevated': '0 10px 25px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
      },
      letterSpacing: {
        'tightest': '-0.04em',
        'tighter': '-0.03em',
        'tight': '-0.02em',
        'label': '0.1em',
        'widest': '0.14em',
      },
    },
  },
  plugins: [],
};
