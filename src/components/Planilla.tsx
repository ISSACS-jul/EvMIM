import React, { useState, useEffect, useMemo } from 'react';
import { Actividad, Calificacion, Estudiante, Curso, RecuperacionAcademica } from '../types';
import { DatabaseService } from '../services/db';
import { FichaEstudiante } from './FichaEstudiante';
import { CheckCircle2 } from 'lucide-react';

interface PlanillaProps {
  curso: Curso;
  periodo: number;
  asignaturaId?: string;
  refreshTrigger?: number;
  onRefresh?: () => void;
}

interface CeldaEditando {
  estudianteId: string;
  actividadId: string;
  valorActual: string;
}

export const Planilla: React.FC<PlanillaProps> = ({ curso, periodo, asignaturaId, refreshTrigger, onRefresh }) => {
  const config = DatabaseService.getConfiguracion();
  const categorias = DatabaseService.getCategorias();
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [celdaEditando, setCeldaEditando] = useState<CeldaEditando | null>(null);
  const [celdaSeleccionada, setCeldaSeleccionada] = useState<{ estudianteId: string; actividadId: string } | null>(null);
  const [mensajeNotificacion, setMensajeNotificacion] = useState<{ tipo: 'exito' | 'info'; texto: string } | null>(null);
  const [fichaEstudianteId, setFichaEstudianteId] = useState<string | null>(null);
  const [filtroReporte, setFiltroReporte] = useState<'todos' | 'pierden' | 'basico'>('todos');
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
    const actsLoaded = asignaturaId
      ? DatabaseService.getActividades(asignaturaId, periodo)
      : DatabaseService.getActividades(curso.id, periodo);
    if (asignaturaId) {
      const filtrados = todosCurso.filter(
        e => !e.asignaturaIds || e.asignaturaIds.length === 0 || e.asignaturaIds.includes(asignaturaId)
      );
      setEstudiantes(ordenarPorApellido(filtrados));
    } else {
      setEstudiantes(ordenarPorApellido(todosCurso));
    }
    setActividades(actsLoaded);

    // Cargar únicamente las calificaciones de las actividades visibles en esta planilla
    const califsFiltradas: Calificacion[] = [];
    for (const act of actsLoaded) {
      califsFiltradas.push(...DatabaseService.getCalificaciones(act.id));
    }
    setCalificaciones(califsFiltradas);
  }, [curso.id, periodo, asignaturaId, refresh, refreshTrigger]);

  // Índice O(1) para consultar la nota de un estudiante en una actividad
  const calificacionesMap = useMemo(() => {
    const map = new Map<string, Calificacion>();
    for (const c of calificaciones) {
      map.set(`${c.estudianteId}_${c.actividadId}`, c);
    }
    return map;
  }, [calificaciones]);

  // Índice O(1) para recuperaciones (Plan de Mejora / Habilitación) del target actual
  const targetId = asignaturaId || curso.id;
  const recuperacionesMap = useMemo(() => {
    const map = new Map<string, RecuperacionAcademica>();
    for (const r of DatabaseService.getRecuperaciones()) {
      if (r.targetId === targetId) {
        map.set(r.estudianteId, r);
      }
    }
    return map;
  }, [targetId, refresh, refreshTrigger]);

  const getNota = (estudianteId: string, actividadId: string): Calificacion | undefined =>
    calificacionesMap.get(`${estudianteId}_${actividadId}`);

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
      setCeldaSeleccionada(null);
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
    setCeldaSeleccionada(null);
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

  const getNotaFinalEfectiva = (estudianteId: string): number | null => {
    const rec = recuperacionesMap.get(estudianteId);
    const pm = rec?.planesMejora?.[periodo];
    if (pm?.presenta && pm.aprobo && pm.nota !== undefined) {
      return pm.nota;
    }
    return promFinal(estudianteId);
  };

  const rangoBasicoMax = config.rangoBasicoMax ?? Number((config.notaAprobatoria + 0.9).toFixed(2));

  const estudiantesPierdenCount = estudiantes.filter(e => {
    const n = getNotaFinalEfectiva(e.id);
    return n !== null && n < config.notaAprobatoria;
  }).length;

  const estudiantesBasicoCount = estudiantes.filter(e => {
    const n = getNotaFinalEfectiva(e.id);
    return n !== null && n >= config.notaAprobatoria && n <= rangoBasicoMax;
  }).length;

  const estudiantesVisibles = estudiantes.filter(e => {
    if (filtroReporte === 'todos') return true;
    const n = getNotaFinalEfectiva(e.id);
    if (n === null) return false;
    if (filtroReporte === 'pierden') return n < config.notaAprobatoria;
    return n >= config.notaAprobatoria && n <= rangoBasicoMax;
  });

  if (estudiantes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p className="text-lg font-semibold">Sin estudiantes en este curso</p>
        <p className="text-sm mt-1">Agrega estudiantes desde el apartado "Estudiantes"</p>
      </div>
    );
  }

  if (actividades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
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

      {/* Barra de Reportes / Filtros rápidos */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Reportes:
          </span>
          <button
            type="button"
            onClick={() => setFiltroReporte('todos')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              filtroReporte === 'todos'
                ? 'bg-sky-600 border-sky-500 text-white shadow'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos ({estudiantes.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroReporte('pierden')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              filtroReporte === 'pierden'
                ? 'bg-rose-600 border-rose-500 text-white shadow'
                : 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            Pierden ({estudiantesPierdenCount})
          </button>
          <button
            type="button"
            onClick={() => setFiltroReporte('basico')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              filtroReporte === 'basico'
                ? 'bg-amber-600 border-amber-500 text-white shadow'
                : 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            En Básico ({estudiantesBasicoCount})
          </button>
        </div>
        {filtroReporte !== 'todos' && (
          <span className="text-[11px] text-slate-400">
            Mostrando {estudiantesVisibles.length} de {estudiantes.length} estudiantes
          </span>
        )}
      </div>

      <div
        className="planilla-container rounded-xl border border-slate-700 overflow-auto max-h-[calc(100vh-220px)] outline-none"
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
              <th className="sticky-col bg-slate-900 border-b border-r border-slate-700 px-2 py-2 text-center text-slate-400 font-semibold w-8">#</th>
              <th className="sticky-col-2 bg-slate-900 border-b border-r border-slate-700 px-3 py-2 text-left text-slate-300 font-semibold min-w-[160px]">Estudiante</th>
              {categoriasCon.map(cat => {
                const actsDeCategoria = actividades.filter(a => a.categoriaId === cat.id);
                const esUnica = actsDeCategoria.length === 1;
                return (
                  <th
                    key={cat.id}
                    colSpan={esUnica ? 1 : actsDeCategoria.length + 1}
                    className="border-b border-r border-slate-700 px-2 py-1.5 text-center font-bold uppercase tracking-wide"
                    style={{ backgroundColor: cat.color + '33', color: cat.color }}
                  >
                    {cat.nombre} ({cat.pesoPorcentaje}%)
                  </th>
                );
              })}
              <th className="border-b border-slate-700 px-3 py-1.5 text-center font-bold text-purple-300 bg-purple-500/20 min-w-[70px]">
                FINAL
              </th>
              {periodo >= config.periodosCount && (
                <th
                  className="border-b border-slate-700 px-3 py-1.5 text-center font-bold text-sky-300 bg-sky-500/20 min-w-[92px]"
                  title="Nota definitiva requerida en el último periodo para alcanzar la nota aprobatoria anual"
                >
                  META AÑO
                </th>
              )}
            </tr>

            {/* Fila 2: nombres de actividades */}
            <tr className="bg-slate-800/50">
              <th className="sticky-col bg-slate-800 border-b border-r border-slate-700 px-2 py-2"></th>
              <th className="sticky-col-2 bg-slate-800 border-b border-r border-slate-700 px-3 py-2 text-slate-400 text-left">Apellido, Nombre</th>
              {categoriasCon.map(cat => {
                const actsDeCategoria = actividades.filter(a => a.categoriaId === cat.id);
                const esUnica = actsDeCategoria.length === 1;
                return (
                  <React.Fragment key={cat.id}>
                    {actsDeCategoria.map((act, idx) => (
                      <th
                        key={act.id}
                        className="border-b border-r border-slate-700 px-2 py-1 text-center text-slate-300 font-medium max-w-[74px]"
                        title={`${act.titulo}\n${act.descripcion || ''}\nFecha: ${act.fechaActividad}`}
                      >
                        <span className="block truncate max-w-[68px]" title={act.titulo}>
                          {esUnica ? 'Nota / DEF' : `#${idx + 1}`}
                        </span>
                        <span className="block text-slate-500 font-normal truncate max-w-[68px]" title={act.titulo}>
                          {act.titulo.slice(0, 10)}
                        </span>
                      </th>
                    ))}
                    {!esUnica && (
                      <th className="border-b border-r border-slate-700 px-2 py-1 text-center font-bold text-slate-200 bg-slate-700/50">
                        DEF
                      </th>
                    )}
                  </React.Fragment>
                );
              })}
              <th className="border-b border-slate-700 px-2 py-1 text-center font-bold text-purple-300 bg-purple-500/10">∑</th>
              {periodo >= config.periodosCount && (
                <th className="border-b border-slate-700 px-2 py-1 text-center font-bold text-sky-300 bg-sky-500/10 text-[10px]">
                  Para aprobar
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {/* Fila de promedios del curso (cabecera de promedios) */}
            <tr className="bg-slate-800 border-b border-slate-700">
              <td className="sticky-col bg-slate-800 border-r border-slate-700 px-2 py-1.5 text-slate-500 text-center font-bold">x̄</td>
              <td className="sticky-col-2 bg-slate-800 border-r border-slate-700 px-3 py-1.5 text-slate-400 font-semibold italic">Promedio del curso</td>
              {categoriasCon.map(cat => {
                const actsDeCategoria = actividades.filter(a => a.categoriaId === cat.id);
                const esUnica = actsDeCategoria.length === 1;
                return (
                  <React.Fragment key={cat.id}>
                    {actsDeCategoria.map(act => {
                      const p = promActividad(act.id);
                      return (
                        <td
                          key={act.id}
                          className="border-r border-slate-700 px-2 py-1.5 text-center font-bold"
                        >
                          <span className={getNotaColor(p)}>
                            {p !== null ? p.toFixed(1) : '—'}
                          </span>
                        </td>
                      );
                    })}
                    {!esUnica && (
                      <td className="border-r border-slate-700 px-2 py-1.5 text-center font-bold bg-slate-700/40">
                        <span className={promDefCat(cat.id) !== null ? `${getNotaBg(promDefCat(cat.id))} px-2 py-0.5 rounded` : 'text-slate-500'}>
                          {promDefCat(cat.id) !== null ? promDefCat(cat.id)!.toFixed(1) : '—'}
                        </span>
                      </td>
                    )}
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
              {periodo >= config.periodosCount && (
                <td className="px-2 py-1.5 text-center font-bold bg-sky-500/10 text-sky-300 text-[11px]">
                  Obj: {config.notaAprobatoria.toFixed(1)}
                </td>
              )}
            </tr>

            {/* Filas de estudiantes */}
            {estudiantesVisibles.length === 0 ? (
              <tr>
                <td colSpan={20} className="py-10 text-center text-xs text-slate-400 italic">
                  No hay estudiantes en esta categoría de reporte para el Periodo {periodo}.
                </td>
              </tr>
            ) : estudiantesVisibles.map((est, idx) => {
              const finalEst = promFinal(est.id);
              return (
                <tr key={est.id} className="border-b border-slate-700/50 hover:bg-slate-800/60 transition-colors group">
                  <td className="sticky-col bg-slate-900 group-hover:bg-slate-800/60 border-r border-slate-700 px-2 py-1.5 text-center text-slate-500 font-mono">
                    {idx + 1}
                  </td>
                  <td
                    className="sticky-col-2 bg-slate-900 group-hover:bg-slate-800/60 border-r border-slate-700 px-3 py-1.5 text-slate-200 font-medium cursor-pointer hover:text-sky-400 transition-colors"
                    onClick={() => setFichaEstudianteId(est.id)}
                    title="Ver ficha completa del estudiante"
                  >
                    {est.apellido}, {est.nombre}
                    <span className="text-slate-500 text-xs ml-2">{est.codigo}</span>
                  </td>

                  {categoriasCon.map(cat => {
                    const actsDeCategoria = actividades.filter(a => a.categoriaId === cat.id);
                    const esUnica = actsDeCategoria.length === 1;
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
                              className={`border-r border-slate-700/50 px-1 py-1 text-center cursor-pointer transition ${
                                isSelected ? 'ring-1 ring-inset ring-sky-400/40 bg-sky-500/5' : ''
                              } ${esUnica ? 'bg-slate-800/40' : ''}`}
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
                                  className="w-14 text-center bg-sky-900 border border-sky-500 rounded text-sky-200 text-xs py-0.5 outline-none font-bold"
                                />
                              ) : (
                                <span
                                  className={`inline-block w-12 py-0.5 rounded text-xs ${
                                    cal
                                      ? `${getNotaColor(cal.nota)} font-semibold`
                                      : 'text-slate-600 hover:bg-slate-700/50 hover:text-slate-400'
                                  }`}
                                >
                                  {cal ? cal.nota.toFixed(1) : '·'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        {/* DEF de la categoría (solo si hay más de 1 actividad) */}
                        {!esUnica && (
                          <td
                            className="border-r border-slate-700 px-2 py-1.5 text-center font-bold cursor-pointer bg-slate-800/40 hover:bg-slate-700/40"
                            onClick={() => setFichaEstudianteId(est.id)}
                          >
                            <span className={`text-sm font-bold px-2 py-0.5 rounded ${pCat !== null ? getNotaBg(pCat) : 'text-slate-500'}`}>
                              {pCat !== null ? pCat.toFixed(1) : '—'}
                            </span>
                          </td>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Promedio final del periodo (o Plan de Mejora aprobado/presentado) */}
                  {(() => {
                    const rec = recuperacionesMap.get(est.id);
                    const pm = rec?.planesMejora?.[periodo];
                    const tienePmPresentado = Boolean(pm?.presenta);
                    const tienePmAprobado = Boolean(pm?.presenta && pm.aprobo && pm.nota !== undefined);
                    const notaFinalMostrar = tienePmAprobado ? pm!.nota! : finalEst;
                    return (
                      <td
                        className="px-2 py-1.5 text-center cursor-pointer bg-purple-500/10 hover:bg-purple-500/20"
                        onClick={() => setFichaEstudianteId(est.id)}
                        title={
                          tienePmAprobado
                            ? `Plan de Mejora aprobado (nota original: ${finalEst !== null ? finalEst.toFixed(2) : '—'})`
                            : tienePmPresentado
                            ? 'Presentó Plan de Mejora y no aprobó'
                            : 'Ver ficha / gestionar Plan de Mejora'
                        }
                      >
                        <div className="inline-flex items-center gap-1">
                          <span className={`text-sm font-black ${getNotaBg(notaFinalMostrar)} px-2 py-0.5 rounded`}>
                            {notaFinalMostrar !== null ? notaFinalMostrar.toFixed(2) : '—'}
                          </span>
                          {tienePmPresentado && (
                            <span
                              className={`text-[9px] font-bold px-1 py-0.5 rounded border ${
                                tienePmAprobado
                                  ? 'bg-sky-500/25 text-sky-300 border-sky-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              {tienePmAprobado ? 'PM✓' : 'PM✗'}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })()}

                  {/* Nota necesaria para aprobar el año (visible al llegar al último periodo académico) */}
                  {periodo >= config.periodosCount && (() => {
                    const rec = recuperacionesMap.get(est.id);
                    const hab = rec?.habilitacion;
                    if (hab?.presenta && hab.aprobo && hab.nota !== undefined) {
                      return (
                        <td
                          className="px-2 py-1.5 text-center cursor-pointer bg-sky-500/5 hover:bg-sky-500/15"
                          onClick={() => setFichaEstudianteId(est.id)}
                          title={`Habilitación anual aprobada con ${hab.nota.toFixed(2)}`}
                        >
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            HAB✓ {hab.nota.toFixed(1)}
                          </span>
                        </td>
                      );
                    }
                    if (hab?.presenta && !hab.aprobo) {
                      return (
                        <td
                          className="px-2 py-1.5 text-center cursor-pointer bg-sky-500/5 hover:bg-sky-500/15"
                          onClick={() => setFichaEstudianteId(est.id)}
                          title="Presentó Habilitación anual y no aprobó"
                        >
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            HAB✗
                          </span>
                        </td>
                      );
                    }

                    const meta = DatabaseService.calcularNotaNecesariaAnio(est.id, targetId, periodo);
                    if (!meta) {
                      return <td className="px-2 py-1.5 text-center text-slate-500 bg-sky-500/5">—</td>;
                    }
                    const superaMax = meta.notaNecesariaAnio > config.maxNota;
                    return (
                      <td
                        className="px-2 py-1.5 text-center cursor-pointer bg-sky-500/5 hover:bg-sky-500/15"
                        onClick={() => setFichaEstudianteId(est.id)}
                        title={
                          meta.yaAproboAnio
                            ? 'El estudiante ya superó la nota mínima anual con los periodos anteriores'
                            : superaMax
                            ? `Requiere ${meta.notaNecesariaAnio.toFixed(2)}, supera el máximo (${config.maxNota})`
                            : `Necesita ${meta.notaNecesariaAnio.toFixed(2)} definitivo en el último periodo para aprobar el año`
                        }
                      >
                        {meta.yaAproboAnio ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            ✓ Listo
                          </span>
                        ) : (
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded ${
                              superaMax
                                ? 'bg-rose-500/20 text-rose-300'
                                : meta.notaNecesariaAnio >= config.notaAprobatoria
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {meta.notaNecesariaAnio.toFixed(2)}
                          </span>
                        )}
                      </td>
                    );
                  })()}
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
          asignaturaId={asignaturaId}
          periodo={periodo}
          onClose={() => setFichaEstudianteId(null)}
          onUpdated={() => {
            setRefresh(r => r + 1);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
};
