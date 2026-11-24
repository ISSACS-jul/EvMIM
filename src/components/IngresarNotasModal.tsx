import React, { useState, useEffect, useRef } from 'react';
import { Actividad } from '../types';
import { DatabaseService } from '../services/db';
import { Save, Paperclip, ExternalLink, X, AlertCircle, ClipboardPaste } from 'lucide-react';

interface IngresarNotasModalProps {
  isOpen: boolean;
  onClose: () => void;
  actividad: Actividad;
  cursoId?: string;
  asignaturaId?: string;
}

export const IngresarNotasModal: React.FC<IngresarNotasModalProps> = ({
  isOpen,
  onClose,
  actividad,
  cursoId,
  asignaturaId,
}) => {
  const config = DatabaseService.getConfiguracion();
  const categorias = DatabaseService.getCategorias();
  const categoria = categorias.find(c => c.id === actividad.categoriaId);

  // Resolver curso y asignatura correctos
  const asignaturas = DatabaseService.getAsignaturas();
  const asig = asignaturas.find(
    a => a.id === (asignaturaId || actividad.asignaturaId || actividad.cursoId)
  );
  const targetCursoId = cursoId || asig?.cursoId || actividad.cursoId;
  const targetAsigId = asignaturaId || actividad.asignaturaId || (asig ? asig.id : undefined);

  // Obtener estudiantes del curso
  const estudiantesDelCurso = DatabaseService.getEstudiantes(targetCursoId);

  // Filtrar estudiantes que cursan esta asignatura (o todos los del curso si no hay restricción)
  const estudiantes = targetAsigId
    ? estudiantesDelCurso.filter(
        e =>
          !e.asignaturaIds ||
          e.asignaturaIds.length === 0 ||
          e.asignaturaIds.includes(targetAsigId)
      )
    : estudiantesDelCurso;

  const [notas, setNotas] = useState<{ [id: string]: { nota: string; obs: string } }>({});
  const [guardado, setGuardado] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const califs = DatabaseService.getCalificaciones(actividad.id);
    const map: { [id: string]: { nota: string; obs: string } } = {};
    for (const e of estudiantes) {
      const cal = califs.find(c => c.estudianteId === e.id);
      map[e.id] = { nota: cal ? String(cal.nota) : '', obs: cal?.observaciones || '' };
    }
    setNotas(map);
  }, [actividad.id, estudiantes.length, isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const next = idx + 1;
      if (next < estudiantes.length) {
        setFocusIdx(next);
        inputRefs.current[next]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startIdx: number) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const lineas = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd().split('\n');
    if (lineas.length > 1 || lineas[0].includes('\t')) {
      e.preventDefault();
      setNotas(prev => {
        const nextNotas = { ...prev };
        lineas.forEach((linea, offset) => {
          const targetIdx = startIdx + offset;
          if (targetIdx < estudiantes.length) {
            const est = estudiantes[targetIdx];
            const partes = linea.split('\t');
            const valorLimpio = partes[0].trim().replace(/^"|"$/g, '').replace(',', '.');
            if (valorLimpio !== '' && !isNaN(parseFloat(valorLimpio))) {
              const num = Math.min(config.maxNota, Math.max(config.minNota, parseFloat(valorLimpio)));
              nextNotas[est.id] = {
                ...(nextNotas[est.id] || { obs: '' }),
                nota: String(Math.round(num * 100) / 100),
              };
            }
          }
        });
        return nextNotas;
      });
    }
  };

  const handleGuardar = () => {
    const lote = estudiantes
      .filter(e => notas[e.id]?.nota !== '')
      .map(e => ({
        estudianteId: e.id,
        actividadId: actividad.id,
        nota: parseFloat(notas[e.id]?.nota || '0'),
        observaciones: notas[e.id]?.obs || undefined,
      }));
    DatabaseService.saveCalificacionesLote(lote);
    setGuardado(true);
    setTimeout(() => {
      setGuardado(false);
      onClose();
    }, 700);
  };

  const notasNum = estudiantes
    .map(e => parseFloat(notas[e.id]?.nota || ''))
    .filter(n => !isNaN(n));
  const prom =
    notasNum.length > 0
      ? (notasNum.reduce((a, b) => a + b, 0) / notasNum.length).toFixed(2)
      : '—';

  const getNotaBg = (nota: string) => {
    const n = parseFloat(nota);
    if (isNaN(n)) return '';
    if (n >= config.notaAprobatoria) return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/50';
    if (n >= config.notaAprobatoria * 0.8) return 'text-amber-300 bg-amber-500/20 border-amber-500/50';
    return 'text-rose-300 bg-rose-500/20 border-rose-500/50';
  };

  const abrirAdjunto = () => {
    if (!actividad.archivoAdjuntoBase64) return;
    const win = window.open();
    win?.document.write(
      `<iframe src="${actividad.archivoAdjuntoBase64}" style="width:100%;height:100%;border:none;"></iframe>`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-3 flex-shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-100">{actividad.titulo}</h2>
              {categoria && (
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: categoria.color + '33', color: categoria.color }}
                >
                  {categoria.nombre}
                </span>
              )}
              {asig && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  {asig.nombre}
                </span>
              )}
            </div>
            {actividad.descripcion && (
              <p className="text-xs text-slate-500 mt-1">{actividad.descripcion}</p>
            )}
            <div className="flex gap-3 mt-1 text-xs text-slate-600">
              <span>Actividad: {actividad.fechaActividad}</span>
              <span>· Calificación: {actividad.fechaCalificacion}</span>
              <span>· Periodo {actividad.periodo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {actividad.archivoAdjuntoNombre && (
              <button
                onClick={abrirAdjunto}
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 px-2.5 py-1.5 rounded-lg border border-sky-500/20 transition"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="max-w-[80px] truncate">{actividad.archivoAdjuntoNombre}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-200 p-1 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-2 mb-3 flex-shrink-0">
          {[
            { label: 'Calificados', val: `${notasNum.length}/${estudiantes.length}` },
            { label: 'Promedio', val: prom },
            { label: 'Escala', val: `${config.minNota} — ${config.maxNota}` },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/60 p-2.5 rounded-lg text-center">
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="font-bold text-slate-200">{s.val}</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 mb-3 flex-shrink-0 flex items-center justify-between flex-wrap gap-2">
          <span>
            💡 Presiona <kbd className="bg-slate-700 border border-slate-600 px-1 rounded text-xs text-slate-300">Enter</kbd> o <kbd className="bg-slate-700 border border-slate-600 px-1 rounded text-xs text-slate-300">Tab</kbd> para pasar al siguiente
          </span>
          <span className="flex items-center gap-1 text-sky-400 font-medium">
            <ClipboardPaste className="w-3.5 h-3.5" />
            Copia columna en Excel y pega con <kbd className="bg-slate-700 border border-slate-600 px-1.5 py-0.5 rounded text-xs text-sky-200 font-mono">Ctrl+V</kbd>
          </span>
        </p>

        {/* Lista de estudiantes */}
        {estudiantes.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-700/60 my-2">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
            <p className="font-semibold text-slate-300">No hay estudiantes inscritos en este curso o materia.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Asegúrate de que los estudiantes estén asignados al curso en la pestaña "Estudiantes" y tengan esta asignatura vinculada.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-1.5">
            {estudiantes.map((est, idx) => {
              const notaVal = notas[est.id]?.nota || '';
              return (
                <div
                  key={est.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                    focusIdx === idx
                      ? 'border-sky-700/50 bg-sky-500/5'
                      : 'border-transparent hover:border-slate-700 hover:bg-slate-700/40'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {est.nombre[0]}
                    {est.apellido[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-200 truncate">
                      {est.apellido}, {est.nombre}
                    </div>
                    <div className="text-xs text-slate-500">{est.codigo}</div>
                  </div>
                  <input
                    ref={el => {
                      inputRefs.current[idx] = el;
                    }}
                    type="number"
                    min={config.minNota}
                    max={config.maxNota}
                    step="0.1"
                    value={notaVal}
                    onChange={e =>
                      setNotas(prev => ({
                        ...prev,
                        [est.id]: { ...prev[est.id], nota: e.target.value },
                      }))
                    }
                    onFocus={() => setFocusIdx(idx)}
                    onKeyDown={e => handleKeyDown(e, idx)}
                    onPaste={e => handlePaste(e, idx)}
                    placeholder="Nota"
                    className={`w-20 text-center px-2 py-1.5 border rounded-lg text-sm font-bold bg-slate-700 focus:ring-2 focus:ring-sky-500 outline-none transition ${
                      notaVal ? getNotaBg(notaVal) : 'border-slate-600 text-slate-400'
                    }`}
                  />
                  <input
                    type="text"
                    value={notas[est.id]?.obs || ''}
                    onChange={e =>
                      setNotas(prev => ({
                        ...prev,
                        [est.id]: { ...prev[est.id], obs: e.target.value },
                      }))
                    }
                    placeholder="Observación..."
                    className="w-40 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 outline-none hidden sm:block"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700 flex-shrink-0">
          <span className="text-xs text-slate-600">
            {notasNum.filter(n => n >= config.notaAprobatoria).length} aprobados ·{' '}
            {notasNum.filter(n => n < config.notaAprobatoria).length} reprobados
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 rounded-xl text-sm text-slate-400 hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={estudiantes.length === 0}
              className={`px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow transition ${
                guardado
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white'
              }`}
            >
              <Save className="w-4 h-4" /> {guardado ? '¡Guardado!' : 'Guardar Notas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
