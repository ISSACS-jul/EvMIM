import React, { useState, useEffect } from 'react';
import { Actividad, Calificacion, Estudiante, Curso } from '../types';
import { DatabaseService } from '../services/db';
import { FichaEstudiante } from './FichaEstudiante';
import { ClipboardPaste, CheckCircle2 } from 'lucide-react';

interface PlanillaProps {
  curso: Curso;
  periodo: number;
  asignaturaId?: string;
  onRefresh?: () => void;
}

interface CeldaEditando {
  estudianteId: string;
  actividadId: string;
  valorActual: string;
}

export const Planilla: React.FC<PlanillaProps> = ({ curso, periodo, asignaturaId, onRefresh }) => {
  const config = DatabaseService.getConfiguracion();
  const categorias = DatabaseService.getCategorias();
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [celdaEditando, setCeldaEditando] = useState<CeldaEditando | null>(null);
  const [celdaSeleccionada, setCeldaSeleccionada] = useState<{ estudianteId: string; actividadId: string } | null>(null);
  const [mensajeNotificacion, setMensajeNotificacion] = useState<{ tipo: 'exito' | 'info'; texto: string } | null>(null);
  const [fichaEstudianteId, setFichaEstudianteId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const categoriasCon = categorias.filter(cat => actividades.some(a => a.categoriaId === cat.id));
  const actividadesEnOrden = categoriasCon.flatMap(cat => actividades.filter(a => a.categoriaId === cat.id));

  const procesarPegado = (texto: string, startEstId: string, startActId: string) => {
    if (!texto) return;

    // Normalizar saltos de línea y limpiar espacios al final
    const lineas = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd().split('\n');
    if (lineas.length === 0) return;

    const startEstIdx = estudiantes.findIndex(e => e.id === startEstId);
    const startActIdx = actividadesEnOrden.findIndex(a => a.id === startActId);

    if (startEstIdx === -1 || startActIdx === -1) return;

    const lote: { estudianteId: string; actividadId: string; nota: number }[] = [];
    let totalNotas = 0;

    lineas.forEach((linea, rOffset) => {
      const estIdx = startEstIdx + rOffset;
      if (estIdx >= estudiantes.length) return;
      const est = estudiantes[estIdx];

      const celdas = linea.split('\t');
      celdas.forEach((celda, cOffset) => {
        const actIdx = startActIdx + cOffset;
        if (actIdx >= actividadesEnOrden.length) return;
        const act = actividadesEnOrden[actIdx];

        const valorLimpio = celda.trim().replace(/^"|"$/g, '').replace(',', '.');
        if (valorLimpio === '' || valorLimpio === '-' || valorLimpio === '—') return;

        const num = parseFloat(valorLimpio);
        if (!isNaN(num)) {
          const notaClamped = Math.min(config.maxNota, Math.max(config.minNota, num));
          lote.push({
            estudianteId: est.id,
            actividadId: act.id,
            nota: Math.round(notaClamped * 100) / 100,
          });
          totalNotas++;
        }
      });
    });

    if (lote.length > 0) {
      DatabaseService.saveCalificacionesLote(lote);
      setCeldaEditando(null);
      setRefresh(r => r + 1);
      onRefresh?.();
      setMensajeNotificacion({
        tipo: 'exito',
        texto: `¡Se pegaron ${totalNotas} nota(s) desde Excel correctamente!`,
      });
      setTimeout(() => setMensajeNotificacion(null), 4000);
    }
  };

  const ordenarPorApellido = (lista: Estudiante[]) => {
    return [...lista].sort((a, b) => {
      const cmp = (a.apellido || '').localeCompare(b.apellido || '', 'es', { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
    });
  };

  useEffect(() => {
    const todosCurso = DatabaseService.getEstudiantes(curso.id);
    if (asignaturaId) {
      const filtrados = todosCurso.filter(
        e => !e.asignaturaIds || e.asignaturaIds.length === 0 || e.asignaturaIds.includes(asignaturaId)
      );
      setEstudiantes(ordenarPorApellido(filtrados));
      setActividades(DatabaseService.getActividades(asignaturaId, periodo));
    } else {
      setEstudiantes(ordenarPorApellido(todosCurso));
      setActividades(DatabaseService.getActividades(curso.id, periodo));
    }
    setCalificaciones(DatabaseService.getCalificaciones());
  }, [curso.id, periodo, asignaturaId, refresh]);

  const getNota = (estudianteId: string, actividadId: string): Calificacion | undefined =>
    calificaciones.find(c => c.estudianteId === estudianteId && c.actividadId === actividadId);

  const handleCeldaClick = (estudianteId: string, actividadId: string) => {
    const cal = getNota(estudianteId, actividadId);
    setCeldaEditando({
      estudianteId,
      actividadId,
      valorActual: cal ? String(cal.nota) : '',
    });
  };

  const handleCeldaGuardar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!celdaEditando) return;
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
      const nota = parseFloat(celdaEditando.valorActual);
      if (!isNaN(nota)) {
        DatabaseService.saveCalificacionesLote([{
          estudianteId: celdaEditando.estudianteId,
          actividadId: celdaEditando.actividadId,
          nota: Math.min(config.maxNota, Math.max(config.minNota, nota)),
        }]);
      }
      setCeldaEditando(null);
      setRefresh(r => r + 1);
      onRefresh?.();
    }
  };

  const handleCeldaBlur = () => {
    if (!celdaEditando) return;
    const nota = parseFloat(celdaEditando.valorActual);
    if (!isNaN(nota)) {
      DatabaseService.saveCalificacionesLote([{
        estudianteId: celdaEditando.estudianteId,
        actividadId: celdaEditando.actividadId,
        nota: Math.min(config.maxNota, Math.max(config.minNota, nota)),
      }]);
    }
    setCeldaEditando(null);
    setRefresh(r => r + 1);
    onRefresh?.();
  };

  // Promedio de notas de un estudiante en una categoría
  const promCat = (estudianteId: string, catId: string): number | null => {
    const actsDeCategoria = actividades.filter(a => a.categoriaId === catId);
    const notas = actsDeCategoria
      .map(a => getNota(estudianteId, a.id)?.nota)
      .filter((n): n is number => n !== undefined);
    if (notas.length === 0) return null;
    return notas.reduce((a, b) => a + b, 0) / notas.length;
  };

  // Promedio final ponderado del estudiante en el periodo
  const promFinal = (estudianteId: string): number | null => {
    let suma = 0, pesoTotal = 0;
    for (const cat of categorias) {
      const p = promCat(estudianteId, cat.id);
      if (p !== null) {
        suma += p * (cat.pesoPorcentaje / 100);
        pesoTotal += cat.pesoPorcentaje;
      }
    }
    if (pesoTotal === 0) return null;
    return (suma / (pesoTotal / 100));
  };

  const getNotaColor = (nota: number | null): string => {
    if (nota === null) return '';
    if (nota >= config.notaAprobatoria) return 'text-emerald-400';
    if (nota >= config.notaAprobatoria * 0.85) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getNotaBg = (nota: number | null): string => {
    if (nota === null) return '';
    if (nota >= config.notaAprobatoria) return 'bg-emerald-500/20 text-emerald-300';
    if (nota >= config.notaAprobatoria * 0.85) return 'bg-amber-500/20 text-amber-300';
    return 'bg-rose-500/20 text-rose-300';
  };

  // Promedio general de una actividad (columna)
  const promActividad = (actividadId: string): number | null => {
    const notas = estudiantes
      .map(e => getNota(e.id, actividadId)?.nota)
      .filter((n): n is number => n !== undefined);
    if (notas.length === 0) return null;
    return notas.reduce((a, b) => a + b, 0) / notas.length;
  };

  // Promedio general categoría (columna DEF)
  const promDefCat = (catId: string): number | null => {
    const notas = estudiantes
      .map(e => promCat(e.id, catId))
      .filter((n): n is number => n !== null);
    if (notas.length === 0) return null;
    return notas.reduce((a, b) => a + b, 0) / notas.length;
  };

  if (estudiantes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-base-500">
        <p className="text-lg font-semibold">Sin estudiantes en este curso</p>
        <p className="text-sm mt-1">Agrega estudiantes desde el apartado "Estudiantes"</p>
      </div>
    );
  }

  if (actividades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-base-500">
        <p className="text-lg font-semibold">Sin actividades en el Periodo {periodo}</p>
        <p className="text-sm mt-1">Crea actividades desde el apartado "Actividades"</p>
      </div>
    );
  }

  return (
    <>
      {mensajeNotificacion && (
        <div className="mb-3 px-4 py-2.5 bg-emerald-950/90 border border-emerald-500/80 text-emerald-200 rounded-xl flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{mensajeNotificacion.texto}</span>
          </div>
          <button
            onClick={() => setMensajeNotificacion(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-base-400 mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <ClipboardPaste className="w-3.5 h-3.5 text-accent-light" />
          <span>
            Tip Excel: Copia una columna de notas en Excel y presiona{' '}
            <kbd className="px-1.5 py-0.5 bg-base-800 border border-base-600 rounded text-accent-light font-mono font-semibold">
              Ctrl + V
            </kbd>{' '}
            sobre cualquier celda para rellenar hacia abajo automáticamente.
          </span>
        </div>
      </div>

      <div
        className="planilla-container rounded-xl border border-base-600 overflow-auto max-h-[calc(100vh-220px)] outline-none"
        tabIndex={0}
        onPaste={e => {
          if (celdaSeleccionada && !celdaEditando) {
            const text = e.clipboardData.getData('text');
            if (text) {
              e.preventDefault();
              procesarPegado(text, celdaSeleccionada.estudianteId, celdaSeleccionada.actividadId);
            }
          }
        }}
      >
        <table className="border-collapse text-xs" style={{ minWidth: 'max-content' }}>
          <thead>
            {/* Fila 1: grupos de categorías */}
            <tr>
              <th className="sticky-col bg-base-900 border-b border-r border-base-600 px-2 py-2 text-center text-base-400 font-semibold w-8">#</th>
              <th className="sticky-col-2 bg-base-900 border-b border-r border-base-600 px-3 py-2 text-left text-base-300 font-semibold min-w-[160px]">Estudiante</th>
              {categoriasCon.map(cat => {
                const actsDeCategoria = actividades.filter(a => a.categoriaId === cat.id);
                return (
                  <th
                    key={cat.id}
                    colSpan={actsDeCategoria.length + 1} // +1 por DEF
                    className="border-b border-r border-base-600 px-2 py-1.5 text-center font-bold uppercase tracking-wide"
                    style={{ backgroundColor: cat.color + '33', color: cat.color }}
                  >
                    {cat.nombre} ({cat.pesoPorcentaje}%)
                  </th>
                );
              })}
              <th className="border-b border-base-600 px-3 py-1.5 text-center font-bold text-purple-300 bg-purple-500/20 min-w-[70px]">
                FINAL
              </th>
            </tr>

            {/* Fila 2: nombres de actividades */}
            <tr className="bg-base-800/50">
              <th className="sticky-col bg-base-800 border-b border-r border-base-600 px-2 py-2"></th>
              <th className="sticky-col-2 bg-base-800 border-b border-r border-base-600 px-3 py-2 text-base-400 text-left">Apellido, Nombre</th>
              {categoriasCon.map(cat => {
                const actsDeCategoria = actividades.filter(a => a.categoriaId === cat.id);
                return (
                  <React.Fragment key={cat.id}>
                    {actsDeCategoria.map((act, idx) => (
                      <th
                        key={act.id}
                        className="border-b border-r border-base-600 px-2 py-1 text-center text-base-300 font-medium max-w-[64px]"
                        title={`${act.titulo}\n${act.descripcion || ''}\nFecha: ${act.fechaActividad}`}
                      >
                        <span className="block truncate max-w-[60px]" title={act.titulo}>
                          #{idx + 1}
                        </span>
                        <span className="block text-base-500 font-normal truncate max-w-[60px]" title={act.titulo}>
                          {act.titulo.slice(0, 8)}
                        </span>
                      </th>
                    ))}
                    <th className="border-b border-r border-base-600 px-2 py-1 text-center font-bold text-base-200 bg-base-700/50">
                      DEF
                    </th>
                  </React.Fragment>
                );
              })}
              <th className="border-b border-base-600 px-2 py-1 text-center font-bold text-purple-300 bg-purple-500/10">∑</th>
            </tr>
          </thead>

          <tbody>
            {/* Fila de promedios del curso (cabecera de promedios) */}
            <tr className="bg-base-800 border-b border-base-600">
              <td className="sticky-col bg-base-800 border-r border-base-600 px-2 py-1.5 text-base-500 text-center font-bold">x̄</td>
              <td className="sticky-col-2 bg-base-800 border-r border-base-600 px-3 py-1.5 text-base-400 font-semibold italic">Promedio del curso</td>
              {categoriasCon.map(cat => {
                const actsDeCategoria = actividades.filter(a => a.categoriaId === cat.id);
                return (
                  <React.Fragment key={cat.id}>
                    {actsDeCategoria.map(act => {
                      const p = promActividad(act.id);
                      return (
                        <td key={act.id} className={`border-r border-base-600 px-2 py-1.5 text-center font-bold ${getNotaColor(p)}`}>
                          {p !== null ? p.toFixed(1) : '—'}
                        </td>
                      );
                    })}
                    <td className="border-r border-base-600 px-2 py-1.5 text-center font-bold bg-base-700/40">
                      <span className={getNotaColor(promDefCat(cat.id))}>
                        {promDefCat(cat.id) !== null ? promDefCat(cat.id)!.toFixed(1) : '—'}
                      </span>
                    </td>
                  </React.Fragment>
                );
              })}
              <td className="px-2 py-1.5 text-center font-bold bg-purple-500/10 text-purple-300">
                {(() => {
                  const finals = estudiantes.map(e => promFinal(e.id)).filter((n): n is number => n !== null);
                  if (finals.length === 0) return '—';
                  return (finals.reduce((a, b) => a + b, 0) / finals.length).toFixed(2);
                })()}
              </td>
            </tr>

            {/* Filas de estudiantes */}
            {estudiantes.map((est, idx) => {
              const finalEst = promFinal(est.id);
              return (
                <tr key={est.id} className="border-b border-base-600/50 hover:bg-base-800/60 transition-colors group">
                  <td className="sticky-col bg-base-900 group-hover:bg-base-800/60 border-r border-base-600 px-2 py-1.5 text-center text-base-500 font-mono">
                    {idx + 1}
                  </td>
                  <td
                    className="sticky-col-2 bg-base-900 group-hover:bg-base-800/60 border-r border-base-600 px-3 py-1.5 text-base-200 font-medium cursor-pointer hover:text-accent-light transition-colors"
                    onClick={() => setFichaEstudianteId(est.id)}
                    title="Ver ficha completa del estudiante"
                  >
                    {est.apellido}, {est.nombre}
                    <span className="text-base-500 text-xs ml-2">{est.codigo}</span>
                  </td>

                  {categoriasCon.map(cat => {
                    const actsDeCategoria = actividades.filter(a => a.categoriaId === cat.id);
                    const pCat = promCat(est.id, cat.id);
                    return (
                      <React.Fragment key={cat.id}>
                        {actsDeCategoria.map(act => {
                          const cal = getNota(est.id, act.id);
                          const isEditing = celdaEditando?.estudianteId === est.id && celdaEditando?.actividadId === act.id;
                          const isSelected = celdaSeleccionada?.estudianteId === est.id && celdaSeleccionada?.actividadId === act.id;

                          return (
                            <td
                              key={act.id}
                              className={`border-r border-base-600/50 px-1 py-1 text-center cursor-pointer transition ${
                                isSelected ? 'ring-2 ring-sky-400 bg-accent-light/20' : ''
                              }`}
                              onClick={() => {
                                setCeldaSeleccionada({ estudianteId: est.id, actividadId: act.id });
                                if (!isEditing) handleCeldaClick(est.id, act.id);
                              }}
                              title={`${act.titulo}\n${est.nombre} ${est.apellido}\n(Haz clic y presiona Ctrl+V para pegar notas de Excel)`}
                            >
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={celdaEditando.valorActual}
                                  onChange={e => setCeldaEditando({ ...celdaEditando, valorActual: e.target.value })}
                                  onKeyDown={handleCeldaGuardar}
                                  onBlur={handleCeldaBlur}
                                  onPaste={e => {
                                    const text = e.clipboardData.getData('text');
                                    if (text && (text.includes('\n') || text.includes('\t'))) {
                                      e.preventDefault();
                                      procesarPegado(text, est.id, act.id);
                                    }
                                  }}
                                  min={config.minNota}
                                  max={config.maxNota}
                                  step="0.1"
                                  autoFocus
                                  className="w-14 text-center bg-sky-900 border border-accent rounded text-accent-light text-xs py-0.5 outline-none font-bold"
                                />
                              ) : (
                                <span className={`inline-block w-12 py-0.5 rounded text-xs font-semibold ${cal ? getNotaBg(cal.nota) : 'text-base-600 hover:bg-base-700/50 hover:text-base-400'}`}>
                                  {cal ? cal.nota.toFixed(1) : '·'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        {/* DEF de la categoría */}
                        <td
                          className="border-r border-base-600 px-2 py-1.5 text-center font-bold cursor-pointer bg-base-800/40 hover:bg-base-700/40"
                          onClick={() => setFichaEstudianteId(est.id)}
                        >
                          <span className={`text-sm ${getNotaColor(pCat)}`}>
                            {pCat !== null ? pCat.toFixed(1) : '—'}
                          </span>
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Promedio final del periodo */}
                  <td
                    className="px-2 py-1.5 text-center cursor-pointer bg-purple-500/10 hover:bg-purple-500/20"
                    onClick={() => setFichaEstudianteId(est.id)}
                  >
                    <span className={`text-sm font-black ${getNotaBg(finalEst)} px-2 py-0.5 rounded`}>
                      {finalEst !== null ? finalEst.toFixed(2) : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {fichaEstudianteId && (
        <FichaEstudiante
          estudianteId={fichaEstudianteId}
          cursoId={curso.id}
          onClose={() => setFichaEstudianteId(null)}
        />
      )}
    </>
  );
};
