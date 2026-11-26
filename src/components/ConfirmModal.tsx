import React, { useEffect, useState } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

export interface ConfirmOptions {
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: 'peligro' | 'advertencia' | 'info';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

type Listener = (req: PendingConfirm) => void;
let activeListener: Listener | null = null;

export function confirmarAccion(opciones: ConfirmOptions | string): Promise<boolean> {
  const opts: ConfirmOptions = typeof opciones === 'string' ? { mensaje: opciones } : opciones;
  return new Promise<boolean>(resolve => {
    if (activeListener) {
      activeListener({ ...opts, resolve });
    } else {
      resolve(window.confirm(opts.mensaje));
    }
  });
}

export const GlobalConfirmDialog: React.FC = () => {
  const [actual, setActual] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    activeListener = req => setActual(req);
    return () => {
      activeListener = null;
    };
  }, []);

  useEffect(() => {
    if (!actual) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        actual.resolve(false);
        setActual(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actual]);

  if (!actual) return null;

  const variante = actual.variante || 'peligro';
  const esPeligro = variante === 'peligro';
  const esAdv = variante === 'advertencia';

  const cerrar = (resultado: boolean) => {
    actual.resolve(resultado);
    setActual(null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={() => cerrar(false)}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                esPeligro
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  : esAdv
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-sky-500/15 border-sky-500/40 text-sky-400'
              }`}
            >
              {esPeligro || esAdv ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <HelpCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {actual.titulo || (esPeligro ? 'Confirmar eliminación' : 'Confirmar acción')}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{actual.mensaje}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => cerrar(false)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/70">
          <button
            type="button"
            onClick={() => cerrar(false)}
            className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            {actual.textoCancelar || 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={() => cerrar(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition ${
              esPeligro
                ? 'bg-rose-600 hover:bg-rose-500'
                : esAdv
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-sky-600 hover:bg-sky-500'
            }`}
            autoFocus
          >
            {actual.textoConfirmar || (esPeligro ? 'Sí, eliminar' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
};
