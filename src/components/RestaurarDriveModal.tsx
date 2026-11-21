import React, { useState, useEffect } from 'react';
import { GoogleDriveBackupFile } from '../types';
import { GoogleDriveService } from '../services/googleDrive';
import { Cloud, Download, RefreshCw, X, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

interface RestaurarDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export const RestaurarDriveModal: React.FC<RestaurarDriveModalProps> = ({
  isOpen,
  onClose,
  onRestored,
}) => {
  const [archivos, setArchivos] = useState<GoogleDriveBackupFile[]>([]);
  const [cargando, setCargando] = useState(false);
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarLista = async () => {
    setCargando(true);
    setMensaje(null);
    try {
      const lista = await GoogleDriveService.listarRespaldos();
      setArchivos(lista);
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al obtener lista de Google Drive.' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarLista();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestaurar = async (archivo: GoogleDriveBackupFile) => {
    if (
      !confirm(
        `¿Restaurar la copia "${archivo.name}"? Los datos actuales del Evaluador serán reemplazados por los de este respaldo.`
      )
    ) {
      return;
    }

    setRestaurandoId(archivo.id);
    setMensaje(null);

    try {
      const res = await GoogleDriveService.descargarYRestaurar(archivo.id);
      if (res.ok) {
        setMensaje({
          tipo: 'ok',
          texto: `¡Respaldo restaurado con éxito! Se cargaron ${res.count?.estudiantes || 0} estudiantes y ${res.count?.cursos || 0} cursos.`,
        });
        setTimeout(() => {
          onRestored();
          onClose();
        }, 1500);
      } else {
        setMensaje({ tipo: 'error', texto: res.mensaje });
      }
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al restaurar archivo.' });
    } finally {
      setRestaurandoId(null);
    }
  };

  const formatearFecha = (isoString?: string) => {
    if (!isoString) return 'Fecha desconocida';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Restaurar desde Google Drive
              </h2>
              <p className="text-xs text-slate-400">Carpeta: "Evaluador_Respaldos" en tu Drive</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cargarLista}
              disabled={cargando}
              className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-700 rounded-lg transition"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mensaje de estado */}
        {mensaje && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
              mensaje.tipo === 'ok'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            {mensaje.tipo === 'ok' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Lista de Respaldos */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {cargando ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-sky-400 opacity-60" />
              <p className="text-xs">Consultando copias en tu Google Drive...</p>
            </div>
          ) : archivos.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto opacity-30" />
              <p className="font-semibold text-slate-400 text-sm">No se encontraron respaldos</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No hay archivos `.json` en tu carpeta "Evaluador_Respaldos" de Google Drive. Puedes crear tu primera copia desde los Ajustes.
              </p>
            </div>
          ) : (
            archivos.map(arch => {
              const isRestaurando = restaurandoId === arch.id;
              const esCompleto = arch.name.includes('completo');

              return (
                <div
                  key={arch.id}
                  className="p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/60 rounded-xl flex items-center justify-between gap-3 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        esCompleto
                          ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400'
                          : 'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate group-hover:text-sky-300">
                        {arch.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>📅 {formatearFecha(arch.createdTime)}</span>
                        <span>· {arch.size}</span>
                        {esCompleto && (
                          <span className="text-[10px] text-purple-300 bg-purple-950/60 border border-purple-800/60 px-1.5 py-0.2 rounded">
                            Con adjuntos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestaurar(arch)}
                    disabled={isRestaurando}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 shadow"
                  >
                    {isRestaurando ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Restaurando...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Restaurar
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="bg-slate-850 px-6 py-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 flex-shrink-0">
          <span>{archivos.length} copia(s) encontradas en Google Drive</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
