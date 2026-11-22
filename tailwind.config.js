/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Fondo IDE ────────────────────────────────────
        base: {
          950: '#000000',   // fondo raíz — negro puro
          900: '#0d0d0d',   // paneles primarios
          800: '#141414',   // paneles secundarios / cards
          700: '#1a1a1a',   // hover de items
          600: '#2a2a2a',   // bordes
          500: '#4a4a4a',   // texto deshabilitado / placeholders
          400: '#888888',   // texto secundario
          300: '#bbbbbb',   // texto normal
          200: '#e0e0e0',   // texto prominente
          100: '#f5f5f5',   // texto máximo contraste
        },
        // ── Acento azul (similar al del reference) ───────
        accent: {
          DEFAULT: '#388bfd',
          light:   '#58a6ff',
          dark:    '#1f6feb',
          subtle:  'rgba(31,111,235,0.15)',
        },
        // ── Cyan (badges / tags) ─────────────────────────
        cyan: {
          DEFAULT: '#39d353',
          tag:     '#0ea5e9',
          tagBg:   'rgba(14,165,233,0.12)',
        },
        // ── Semáforos ────────────────────────────────────
        ok:    '#3fb950',
        warn:  '#d29922',
        error: '#f85149',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        md:  '6px',
        lg:  '8px',
        xl:  '10px',
        '2xl': '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.3)',
        modal: '0 8px 32px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
