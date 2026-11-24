# Plantilla de Sistema de Temas Ergonómicos y Escala UI (theme_template)

> **Instrucción para agentes de IA / Desarrolladores:**
> Copia y entrega este archivo al agente en el nuevo proyecto con el siguiente mensaje:
> *"Implementa en esta aplicación el sistema de temas ergonómicos y escala de UI tal como está especificado en esta plantilla. Asegúrate de configurar tailwind.config.js, index.css, theme.ts y el componente selector con cambio y guardado instantáneo al hacer clic."*

---

## 📋 Resumen del Sistema

Este sistema proporciona:
1. **5 Temas de Color Ergonómicos (Bajo Cansancio Visual y Alto Contraste):**
   * **Default (Oscuro Clásico):** Slate pizarra suave (`#0f172a`) con acentos azul cielo equilibrados.
   * **Elegante Oscuro:** Grafito mate (`#101319`) con acentos en bronce champán tostado y oro viejo satinado (cero amarillo estridente, anti-reflejos).
   * **Negro & Azul Contraste:** Fondo negro puro con tipografía ultra nítida y acentos azul eléctrico de alto contraste.
   * **Tema Claro:** Gris perla mate suave (`#f4f6f9`) con tarjetas blancas y azul sereno (sin blanco quemante ni deslumbramiento).
   * **Elegante Claro:** Marfil cálido estilo papel/lino (`#f6f3eb`) con toques champán (filtra la luz azul, ideal para lectura prolongada).
2. **Escala de UI Vectorial (Sin Zoom Destructivo):**
   * Multiplicadores: `x0,5`, `x1`, `x1,5`, `x2`, `x3`.
   * Escala modificando el tamaño de fuente raíz del documento (`html { font-size }`), redimensionando de forma proporcional y nítida todas las unidades `rem` de Tailwind sin romper boundingClientRect, modales ni tablas.
3. **Persistencia y Aplicación Instantánea:**
   * Al hacer clic en un tema o escala, se aplica y guarda **inmediatamente** en `localStorage` y en la base de datos/configuración sin requerir presionar ningún botón de guardar.
   * Carga inmediata en el inicio de la app sin parpadeos (*zero-flash load*).

---

## Paso 1: Configurar `tailwind.config.js`

Configura las paletas `slate` y `sky` para que consuman variables CSS como tripletas RGB. Esto permite que todas las utilidades de Tailwind (incluyendo opacidades como `bg-slate-800/80` o `bg-sky-500/20`) funcionen automáticamente en cualquier tema.

```javascript
/** @type {import('tailwindcss').Config} */

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: withOpacity('--color-slate-50'),
          100: withOpacity('--color-slate-100'),
          200: withOpacity('--color-slate-200'),
          300: withOpacity('--color-slate-300'),
          400: withOpacity('--color-slate-400'),
          500: withOpacity('--color-slate-500'),
          600: withOpacity('--color-slate-600'),
          700: withOpacity('--color-slate-700'),
          800: withOpacity('--color-slate-800'),
          900: withOpacity('--color-slate-900'),
          950: withOpacity('--color-slate-950'),
        },
        sky: {
          50: withOpacity('--color-sky-50'),
          100: withOpacity('--color-sky-100'),
          200: withOpacity('--color-sky-200'),
          300: withOpacity('--color-sky-300'),
          400: withOpacity('--color-sky-400'),
          500: withOpacity('--color-sky-500'),
          600: withOpacity('--color-sky-600'),
          700: withOpacity('--color-sky-700'),
          800: withOpacity('--color-sky-800'),
          900: withOpacity('--color-sky-900'),
          950: withOpacity('--color-sky-950'),
        },
      }
    },
  },
  plugins: [],
}
```

---

## Paso 2: Variables CSS en `src/index.css` (o archivo CSS principal)

Agrega las definiciones de los 5 temas con sus tripletas RGB y estilos ergonómicos base:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ══════════════════════════════════════════════════════════════════════
   SISTEMA DE TEMAS VISUALES ERGONÓMICOS
   ══════════════════════════════════════════════════════════════════════ */

/* 1. TEMA DEFAULT (Oscuro Clásico / Slate & Sky) */
:root,
[data-theme="default"] {
  --color-slate-50: 248 250 252;
  --color-slate-100: 241 245 249;
  --color-slate-200: 226 232 240;
  --color-slate-300: 203 213 225;
  --color-slate-400: 148 163 184;
  --color-slate-500: 100 116 139;
  --color-slate-600: 71 85 105;
  --color-slate-700: 51 65 85;
  --color-slate-800: 30 41 59;
  --color-slate-900: 15 23 42;
  --color-slate-950: 2 6 23;

  --color-sky-50: 240 249 255;
  --color-sky-100: 224 242 254;
  --color-sky-200: 186 230 253;
  --color-sky-300: 125 211 252;
  --color-sky-400: 56 189 248;
  --color-sky-500: 14 165 233;
  --color-sky-600: 2 132 199;
  --color-sky-700: 3 105 161;
  --color-sky-800: 7 89 133;
  --color-sky-900: 12 74 110;
  --color-sky-950: 8 47 73;

  --theme-bg: #0f172a;
  --theme-text: #e2e8f0;
  --theme-input-bg: #1e293b;
  --theme-input-border: #475569;
  --theme-scheme: dark;
}

/* 2. TEMA ELEGANTE OSCURO (Grafito Mate & Bronce Champán Suave) */
[data-theme="dark-gold"] {
  --color-slate-50: 248 249 251;
  --color-slate-100: 240 242 247;
  --color-slate-200: 226 229 237;
  --color-slate-300: 198 204 216;
  --color-slate-400: 152 160 176;
  --color-slate-500: 108 116 132;
  --color-slate-600: 58 64 78;
  --color-slate-700: 36 41 52;
  --color-slate-800: 24 28 36;
  --color-slate-900: 16 19 25;
  --color-slate-950: 10 12 16;

  --color-sky-50: 252 249 242;
  --color-sky-100: 247 240 228;
  --color-sky-200: 238 224 201;
  --color-sky-300: 224 202 164;
  --color-sky-400: 206 176 128;
  --color-sky-500: 188 152 98;
  --color-sky-600: 164 128 76;
  --color-sky-700: 136 104 58;
  --color-sky-800: 108 81 44;
  --color-sky-900: 68 51 28;
  --color-sky-950: 42 31 17;

  --theme-bg: #101319;
  --theme-text: #e6e9f0;
  --theme-input-bg: #1c212b;
  --theme-input-border: #384050;
  --theme-scheme: dark;
}

/* 3. TEMA NEGRO & AZUL (Alto Contraste / Fondo Negro Puro & Acentos Azul Eléctrico) */
[data-theme="dark-blue"] {
  --color-slate-50: 255 255 255;
  --color-slate-100: 255 255 255;
  --color-slate-200: 242 246 252;
  --color-slate-300: 220 230 245;
  --color-slate-400: 175 190 215;
  --color-slate-500: 130 145 168;
  --color-slate-600: 48 54 68;
  --color-slate-700: 26 26 30;
  --color-slate-800: 15 15 17;
  --color-slate-900: 0 0 0;
  --color-slate-950: 0 0 0;

  --color-sky-50: 240 249 255;
  --color-sky-100: 224 242 254;
  --color-sky-200: 186 230 253;
  --color-sky-300: 125 211 252;
  --color-sky-400: 56 189 248;
  --color-sky-500: 30 155 255;
  --color-sky-600: 14 130 230;
  --color-sky-700: 10 100 180;
  --color-sky-800: 8 75 140;
  --color-sky-900: 12 40 80;
  --color-sky-950: 6 20 45;

  --theme-bg: #000000;
  --theme-text: #ffffff;
  --theme-input-bg: #141416;
  --theme-input-border: #303644;
  --theme-scheme: dark;
}

/* 4. TEMA CLARO (Gris Perla Suave & Azul Sereno) */
[data-theme="light"] {
  --color-slate-50: 24 33 47;
  --color-slate-100: 24 33 47;
  --color-slate-200: 39 49 66;
  --color-slate-300: 65 77 97;
  --color-slate-400: 100 112 131;
  --color-slate-500: 130 142 160;
  --color-slate-600: 209 216 226;
  --color-slate-700: 232 236 242;
  --color-slate-800: 255 255 255;
  --color-slate-900: 244 246 249;
  --color-slate-950: 250 251 253;

  --color-sky-50: 240 248 255;
  --color-sky-100: 224 240 254;
  --color-sky-200: 186 224 252;
  --color-sky-300: 125 200 248;
  --color-sky-400: 48 168 232;
  --color-sky-500: 18 138 209;
  --color-sky-600: 14 116 178;
  --color-sky-700: 11 93 144;
  --color-sky-800: 9 74 115;
  --color-sky-900: 219 238 254;
  --color-sky-950: 239 247 255;

  --theme-bg: #f4f6f9;
  --theme-text: #18212f;
  --theme-input-bg: #ffffff;
  --theme-input-border: #cbd5e1;
  --theme-scheme: light;
}

/* 5. TEMA ELEGANTE CLARO (Marfil Cálido & Champán Satinado) */
[data-theme="light-gold"] {
  --color-slate-50: 38 34 30;
  --color-slate-100: 38 34 30;
  --color-slate-200: 56 50 44;
  --color-slate-300: 82 74 65;
  --color-slate-400: 122 112 100;
  --color-slate-500: 154 144 132;
  --color-slate-600: 218 210 196;
  --color-slate-700: 238 233 222;
  --color-slate-800: 255 255 255;
  --color-slate-900: 246 243 235;
  --color-slate-950: 252 250 246;

  --color-sky-50: 253 250 244;
  --color-sky-100: 250 243 230;
  --color-sky-200: 242 227 202;
  --color-sky-300: 228 203 162;
  --color-sky-400: 202 168 116;
  --color-sky-500: 176 138 84;
  --color-sky-600: 148 112 60;
  --color-sky-700: 122 91 46;
  --color-sky-800: 98 72 36;
  --color-sky-900: 253 245 230;
  --color-sky-950: 255 251 243;

  --theme-bg: #f6f3eb;
  --theme-text: #26221e;
  --theme-input-bg: #ffffff;
  --theme-input-border: #dcd3c3;
  --theme-scheme: light;
}

/* ══════════════════════════════════════════════════════════════════════
   ESTILOS BASE
   ══════════════════════════════════════════════════════════════════════ */

:root {
  color-scheme: var(--theme-scheme, dark);
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: var(--theme-bg, #0f172a);
  color: var(--theme-text, #e2e8f0);
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.25s ease, color 0.25s ease;
}

select, input, textarea {
  color-scheme: var(--theme-scheme, dark);
}

select {
  background-color: var(--theme-input-bg, #1e293b);
  color: var(--theme-text, #f1f5f9);
  border-color: var(--theme-input-border, #475569);
}

select option {
  background-color: var(--theme-input-bg, #1e293b);
  color: var(--theme-text, #f1f5f9);
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--theme-bg, #1e293b); }
::-webkit-scrollbar-thumb { background: var(--theme-input-border, #334155); border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { filter: brightness(1.2); }
```

---

## Paso 3: Módulo de Gestión `src/services/theme.ts` (o `src/utils/theme.ts`)

Crea este archivo TypeScript para centralizar la aplicación, metadatos y persistencia:

```typescript
export type TemaVisual = 'default' | 'dark-gold' | 'dark-blue' | 'light' | 'light-gold';

export const TEMAS_INFO: {
  id: TemaVisual;
  nombre: string;
  descripcion: string;
  previewBg: string;
  previewCard: string;
  previewAccent: string;
  isDark: boolean;
}[] = [
  {
    id: 'default',
    nombre: 'Default (Oscuro Clásico)',
    descripcion: 'Pizarra oscura suave con acentos azul cielo equilibrados',
    previewBg: '#0f172a',
    previewCard: '#1e293b',
    previewAccent: '#0284c7',
    isDark: true,
  },
  {
    id: 'dark-gold',
    nombre: 'Elegante Oscuro',
    descripcion: 'Grafito carbón mate con acentos en bronce champán suave (cero reflejos)',
    previewBg: '#101319',
    previewCard: '#181c24',
    previewAccent: '#a4804c',
    isDark: true,
  },
  {
    id: 'dark-blue',
    nombre: 'Negro & Azul Contraste',
    descripcion: 'Fondo negro puro con tipografía ultra nítida y acentos azul eléctrico',
    previewBg: '#000000',
    previewCard: '#0f0f11',
    previewAccent: '#0e82e6',
    isDark: true,
  },
  {
    id: 'light',
    nombre: 'Tema Claro',
    descripcion: 'Gris perla mate con tarjetas blancas y azul sereno descansado',
    previewBg: '#f4f6f9',
    previewCard: '#ffffff',
    previewAccent: '#0e74b2',
    isDark: false,
  },
  {
    id: 'light-gold',
    nombre: 'Elegante Claro',
    descripcion: 'Marfil cálido y lino con sutiles toques champán (filtra la luz azul)',
    previewBg: '#f6f3eb',
    previewCard: '#ffffff',
    previewAccent: '#94703c',
    isDark: false,
  },
];

export const ESCALAS_UI: { factor: number; label: string; desc: string }[] = [
  { factor: 0.5, label: 'x0,5', desc: 'Compacto' },
  { factor: 1, label: 'x1', desc: 'Normal' },
  { factor: 1.5, label: 'x1,5', desc: 'Ampliado' },
  { factor: 2, label: 'x2', desc: 'Grande' },
  { factor: 3, label: 'x3', desc: 'Extra' },
];

export function aplicarTemaVisual(tema: TemaVisual) {
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('app_tema_visual', tema);
  const isLight = tema === 'light' || tema === 'light-gold';
  document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
}

export function aplicarEscalaUI(factor: number) {
  const baseSize = 16;
  const targetPx = Math.round(baseSize * factor);
  document.documentElement.style.fontSize = `${targetPx}px`;
  localStorage.setItem('app_ui_scale', String(factor));
}

export function inicializarTemaYEscala(defaultTema?: TemaVisual, defaultEscala?: number) {
  const savedTheme =
    (localStorage.getItem('app_tema_visual') as TemaVisual) ||
    defaultTema ||
    'default';
  const savedScale =
    Number(localStorage.getItem('app_ui_scale')) || defaultEscala || 1;

  aplicarTemaVisual(savedTheme);
  aplicarEscalaUI(savedScale);
}
```

---

## Paso 4: Inicialización en el Punto de Entrada (`src/main.tsx`)

Importa y ejecuta `inicializarTemaYEscala()` antes de montar React para garantizar carga instantánea sin parpadeos:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { inicializarTemaYEscala } from './services/theme';

// Inicializar tema y escala guardados antes de renderizar
inicializarTemaYEscala();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

## Paso 5: Componente UI para Configuración / Opciones con Cambio Instantáneo

Inserta este bloque dentro de tu modal o pantalla de Ajustes / Configuración. Los cambios se aplican y guardan en `localStorage` al hacer clic inmediatamente:

```tsx
import React, { useState } from 'react';
import { Palette, Maximize2, Check } from 'lucide-react';
import {
  TEMAS_INFO,
  ESCALAS_UI,
  TemaVisual,
  aplicarTemaVisual,
  aplicarEscalaUI,
} from './services/theme';

export const SettingsAppearanceSection: React.FC = () => {
  const [temaActivo, setTemaActivo] = useState<TemaVisual>(
    (localStorage.getItem('app_tema_visual') as TemaVisual) || 'default'
  );
  const [escalaActiva, setEscalaActiva] = useState<number>(
    Number(localStorage.getItem('app_ui_scale')) || 1
  );

  const handleCambiarTema = (tema: TemaVisual) => {
    setTemaActivo(tema);
    aplicarTemaVisual(tema); // Se aplica y guarda inmediatamente al hacer clic
  };

  const handleCambiarEscala = (factor: number) => {
    setEscalaActiva(factor);
    aplicarEscalaUI(factor); // Se aplica y guarda inmediatamente al hacer clic
  };

  return (
    <section className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Tema Visual y Escala de Interfaz
          </h3>
        </div>
        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
          ✓ Se aplica y guarda al instante con un clic
        </span>
      </div>

      {/* Selector de Temas */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-slate-400 block mb-2">
          Tema de Color de la Aplicación:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TEMAS_INFO.map(t => {
            const seleccionado = temaActivo === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleCambiarTema(t.id)}
                className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  seleccionado
                    ? 'bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/30'
                    : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-1">
                      <span
                        className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                        style={{ backgroundColor: t.previewBg }}
                        title="Fondo principal"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                        style={{ backgroundColor: t.previewCard }}
                        title="Superficie de tarjetas"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: t.previewAccent }}
                        title="Acentos y botones"
                      />
                    </div>
                    <span className={`text-xs font-bold ${seleccionado ? 'text-sky-300' : 'text-slate-200'}`}>
                      {t.nombre}
                    </span>
                  </div>
                  {seleccionado && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-sky-400 bg-sky-500/20 px-1.5 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Activo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {t.descripcion}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selector de Escala de UI */}
      <div className="pt-3 border-t border-slate-700/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            <label className="text-xs font-semibold text-slate-400">
              Escala de UI (Tamaño de la interfaz sin zoom):
            </label>
          </div>
          <span className="text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
            x{escalaActiva} ({ESCALAS_UI.find(e => e.factor === escalaActiva)?.desc || 'Personalizada'})
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mb-2.5">
          Escala matemáticamente las fuentes, botones, campos y planillas de forma vectorial y nítida.
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {ESCALAS_UI.map(e => {
            const activo = escalaActiva === e.factor;
            return (
              <button
                key={e.factor}
                type="button"
                onClick={() => handleCambiarEscala(e.factor)}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
                  activo
                    ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-sm">{e.label}</span>
                <span className={`text-[9px] font-normal ${activo ? 'text-sky-100' : 'text-slate-400'}`}>
                  {e.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
```
