import { TemaVisual } from '../types';

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
  localStorage.setItem('evaluador_tema_visual', tema);
  const isLight = tema === 'light' || tema === 'light-gold';
  document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
}

export function aplicarEscalaUI(factor: number) {
  const baseSize = 16;
  const targetPx = Math.round(baseSize * factor);
  document.documentElement.style.fontSize = `${targetPx}px`;
  localStorage.setItem('evaluador_ui_scale', String(factor));
}

export function inicializarTemaYEscala(defaultTema?: TemaVisual, defaultEscala?: number) {
  const savedTheme =
    (localStorage.getItem('evaluador_tema_visual') as TemaVisual) ||
    defaultTema ||
    'default';
  const savedScale =
    Number(localStorage.getItem('evaluador_ui_scale')) || defaultEscala || 1;

  aplicarTemaVisual(savedTheme);
  aplicarEscalaUI(savedScale);
}
