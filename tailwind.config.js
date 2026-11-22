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
          950: '#0d1117',   // fondo raíz
          900: '#161b22',   // paneles primarios
          800: '#1c2333',   // paneles secundarios / cards
          700: '#21262d',   // hover de items
          600: '#30363d',   // bordes
          500: '#484f58',   // texto deshabilitado / placeholders
          400: '#8b949e',   // texto secundario
          300: '#c9d1d9',   // texto normal
          200: '#e6edf3',   // texto prominente
          100: '#f0f6fc',   // texto máximo contraste
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
