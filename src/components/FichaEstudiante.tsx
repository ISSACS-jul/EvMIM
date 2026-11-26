import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { ResumenEstudiante } from '../types';
import { X, TrendingUp, Award, AlertTriangle, XCircle, BookOpen, Edit3, Check, ShieldCheck, RefreshCw } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { EditarEstudianteModal } from './EditarEstudianteModal';
import { ExpedienteEstudianteModal } from './ExpedienteEstudianteModal';

interface FichaEstudianteProps {
  estudianteId: string | null;
  cursoId?: string;
  asignaturaId?: string;
  periodo?: number;
  onClose: () => void;
  onUpdated?: () => void;
}

export const FichaEstudiante: React.FC<FichaEstudianteProps> = ({
  estudianteId,
  cursoId,
  asignaturaId,
  periodo,
  onClose,
  onUpdated,
}) => {
  // DECLARAR TODOS LOS HOOKS ARRIBA SIN CONDICIONALES PARA CUMPLIR REGLAS DE REACT
  const [editingModalOpen, setEditingModalOpen] = useState(false);
  const [expedienteModalOpen, setExpedienteModalOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [selectedCursoId, setSelectedCursoId] = useState<string>('');
  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState<string>(asignaturaId || '');
  const [periodoPM, setPeriodoPM] = useState<number>(periodo || 1);

  const [pmPresenta, setPmPresenta] = useState(false);
  const [pmAprobo, setPmAprobo] = useState(false);
  const [pmNotaStr, setPmNotaStr] = useState('');
  const [pmSavedMsg, setPmSavedMsg] = useState(false);

  const [habPresenta, setHabPresenta] = useState(false);
  const [habAprobo, setHabAprobo] = useState(false);
  const [habNotaStr, setHabNotaStr] = useState('');
  const [habSavedMsg, setHabSavedMsg] = useState(false);

  useEffect(() => {
    if (asignaturaId) {
      setSelectedAsignaturaId(asignaturaId);
    }
  }, [asignaturaId]);

  useEffect(() => {
    if (periodo) {
      setPeriodoPM(periodo);
    }
  }, [periodo]);

  useEffect(() => {
    if (!estudianteId) return;
    const est = DatabaseService.getEstudiantes().find(e => e.id === estudianteId);
    const cIds = est?.cursoIds || (est?.cursoId ? [est.cursoId] : []);
    const cId = selectedCursoId || cursoId || cIds[0] || '';
    const asigs = DatabaseService.getAsignaturas(cId).filter(
      a => !est?.asignaturaIds || est.asignaturaIds.length === 0 || est.asignaturaIds.includes(a.id)
    );
    const aId = selectedAsignaturaId && asigs.some(a => a.id === selectedAsignaturaId)
      ? selectedAsignaturaId
      : asigs[0]?.id || '';
    const tId = aId || cId;
    if (!tId) return;

    const cfg = DatabaseService.getConfiguracion();
    const rec = DatabaseService.getRecuperacion(estudianteId, tId);
    const pm = rec?.planesMejora?.[periodoPM];
    setPmPresenta(Boolean(pm?.presenta));
    setPmAprobo(Boolean(pm?.aprobo));
    setPmNotaStr(pm?.nota !== undefined ? String(pm.nota) : String(cfg.notaAprobatoria));

    const hab = rec?.habilitacion;
    setHabPresenta(Boolean(hab?.presenta));
    setHabAprobo(Boolean(hab?.aprobo));
    setHabNotaStr(hab?.nota !== undefined ? String(hab.nota) : String(cfg.notaAprobatoria));
  }, [estudianteId, cursoId, selectedCursoId, selectedAsignaturaId, periodoPM, refreshCount]);

  useEffect(() => {
    if (cursoId) {
      setSelectedCursoId(cursoId);
    } else if (estudianteId) {
      const est = DatabaseService.getEstudiantes().find(e => e.id === estudianteId);
      const cIds = est?.cursoIds || (est?.cursoId ? [est.cursoId] : []);
      if (cIds.length > 0) {
        setSelectedCursoId(prev => (prev && cIds.includes(prev) ? prev : cIds[0]));
      }
    }
  }, [cursoId, estudianteId, refreshCount]);

  // Si no hay estudiante seleccionado, retornar null después de los hooks
  if (!estudianteId) return null;

  const estudiantes = DatabaseService.getEstudiantes();
  const estudiante = estudiantes.find(e => e.id === estudianteId);
  if (!estudiante) return null;

  const estudianteCursoIds = estudiante.cursoIds || (estudiante.cursoId ? [estudiante.cursoId] : []);
  const activeCursoId = selectedCursoId || cursoId || estudianteCursoIds[0] || '';
  const cursos = DatabaseService.getCursos();
  const asignaturasCurso = DatabaseService.getAsignaturas(activeCursoId).filter(
    a => !estudiante.asignaturaIds || estudiante.asignaturaIds.length === 0 || estudiante.asignaturaIds.includes(a.id)
  );
  const activeAsignaturaId =
    selectedAsignaturaId && asignaturasCurso.some(a => a.id === selectedAsignaturaId)
      ? selectedAsignaturaId
      : asignaturasCurso[0]?.id || '';
  const activeAsignaturaObj = asignaturasCurso.find(a => a.id === activeAsignaturaId);
  const targetEvaluacionId = activeAsignaturaId || activeCursoId;

  const config = DatabaseService.getConfiguracion();
  const categorias = DatabaseService.getCategorias();
  const resumen = DatabaseService.getResumenEstudiante(
    estudianteId,
    targetEvaluacionId,
    periodo
  );

  // Fallback seguro si el resumen no estuviese generado aún
  const fallbackResumen: ResumenEstudiante = {
    estudiante,
    cursoId: activeCursoId,
    cursoNombre: cursos.find(c => c.id === activeCursoId)?.nombre || '',
    promedioGeneral: 0,
    promedioPeriodoActual: 0,
    promediosPorPeriodo: {},
    promediosPorCategoria: {},
    calificacionesCount: 0,
    estadoAprobacion: 'en_riesgo',
  };

  const datosResumen = resumen || fallbackResumen;
  const {
    estadoAprobacion,
    promedioPeriodoActual,
    promediosPorPeriodo,
    promediosPorCategoria,
    notaNecesariaEstimada,
    promedioAcumuladoAnio,
    notaNecesariaAnio,
    yaAproboAnio,
  } = datosResumen;

  const recuperacion = DatabaseService.getRecuperacion(estudianteId, targetEvaluacionId);
  const planMejoraSeleccionado = recuperacion?.planesMejora?.[periodoPM] || {
    presenta: false,
    aprobo: false,
    nota: config.notaAprobatoria,
  };
  const habilitacionActual = recuperacion?.habilitacion || {
    presenta: false,
    aprobo: false,
    nota: config.notaAprobatoria,
  };

  const actividades = DatabaseService.getActividades(targetEvaluacionId);
  const calificaciones = DatabaseService.getCalificaciones().filter(
    c => c.estudianteId === estudianteId && actividades.some(a => a.id === c.actividadId)
  );

  const statusConfig = {
    aprobado: {
      icon: Award,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20 border-emerald-500/40',
      label: 'Aprobado',
    },
    en_riesgo: {
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/20 border-amber-500/40',
      label: 'En Riesgo',
    },
    reprobado: {
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/20 border-rose-500/40',
      label: 'Reprobado',
    },
  };
  const sc = statusConfig[estadoAprobacion] || statusConfig.en_riesgo;
  const StatusIcon = sc.icon;

  const historial = calificaciones
    .map(cal => {
      const act = actividades.find(a => a.id === cal.actividadId);
      const cat = categorias.find(c => c.id === act?.categoriaId);
      return act ? { ...cal, actividad: act, categoria: cat } : null;
    })
    .filter(Boolean)
    .sort((a, b) =>
      (a!.actividad?.fechaCalificacion || '').localeCompare(b!.actividad?.fechaCalificacion || '')
    );

  const textStyle = { color: '#94a3b8', fontSize: 11 };

  const lineChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' },
    },
    grid: { left: '12%', right: '5%', top: '15%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: Array.from({ length: config.periodosCount || 3 }, (_, i) => `P${i + 1}`),
      axisLabel: textStyle,
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      min: config.minNota,
      max: config.maxNota,
      axisLabel: textStyle,
      splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
    },
    series: [
      {
        name: 'Promedio',
        type: 'line',
        smooth: true,
        data: Array.from(
          { length: config.periodosCount || 3 },
          (_, i) => promediosPorPeriodo?.[i + 1] || 0
        ),
        lineStyle: { color: '#38bdf8', width: 2.5 },
        itemStyle: { color: '#38bdf8' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#38bdf833' },
              { offset: 1, color: '#38bdf800' },
            ],
          },
        },
        markLine: {
          silent: true,
          data: [
            {
              yAxis: config.notaAprobatoria,
              lineStyle: { color: '#fbbf24', type: 'dashed' },
              label: { formatter: 'Aprobatoria', color: '#fbbf24' },
            },
          ],
        },
      },
    ],
  };

  const radarIndicadores =
    categorias.length > 0
      ? categorias.map(c => ({ name: c.nombre, max: config.maxNota }))
      : [{ name: 'General', max: config.maxNota }];

  const radarOption = {
    backgroundColor: 'transparent',
    tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    radar: {
      indicator: radarIndicadores,
      axisName: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1e293b' } },
      splitArea: { areaStyle: { color: ['#1e293b44', '#0f172a44'] } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value:
              categorias.length > 0
                ? categorias.map(c => promediosPorCategoria?.[c.id] || 0)
                : [promedioPeriodoActual],
            name: 'Desempeño',
            areaStyle: { color: '#38bdf833' },
            lineStyle: { color: '#38bdf8', width: 2 },
            itemStyle: { color: '#38bdf8' },
          },
        ],
      },
    ],
  };

  const getNotaBg = (nota: number) => {
    if (nota >= config.notaAprobatoria) return 'bg-emerald-500/20 text-emerald-400';
    if (nota >= config.notaAprobatoria * 0.85) return 'bg-amber-500/20 text-amber-400';
    return 'bg-rose-500/20 text-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full p-6 my-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white text-xl font-bold shadow">
              {(estudiante.nombre?.[0] || 'E')}
              {(estudiante.apellido?.[0] || '')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100">
                  {estudiante.apellido}, {estudiante.nombre}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingModalOpen(true)}
                  className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-700/50 rounded-lg transition"
                  title="Modificar datos del estudiante"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-500">{estudiante.codigo}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExpedienteModalOpen(true)}
              className="px-3 py-1.5 bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 rounded-xl text-xs font-semibold text-sky-300 flex items-center gap-1.5 transition shadow-sm"
              title="Consultar historial académico completo a lo largo de los distintos años"
            >
              <Award className="w-3.5 h-3.5 text-sky-400" />
              Historial Multianual
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold ${sc.bg} ${sc.color}`}>
              <StatusIcon className="w-4 h-4" /> {sc.label}
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-200 p-1 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Trayectoria Académica del estudiante (Año tras Año) */}
        {estudianteCursoIds.length > 0 ? (
          <div className="mb-6 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              Historial y Trayectoria Académica (Año y Curso):
            </span>
            <div className="flex gap-2 flex-wrap">
              {estudianteCursoIds.map(cId => {
                const c = cursos.find(x => x.id === cId);
                if (!c) return null;
                const anio = DatabaseService.getAnios().find(a => a.id === c.anioId);
                const isSelected = c.id === activeCursoId;
                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => setSelectedCursoId(c.id)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-sky-600 border-sky-500 text-white shadow font-semibold'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="opacity-70 text-[10px] uppercase font-bold tracking-wider">
                      Año {anio?.nombre || c.anio}:
                    </span>
                    <span>{c.nombre}</span>
                  </button>
                );
              })}
            </div>
            {asignaturasCurso.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400">Asignatura analizada:</span>
                {asignaturasCurso.map(asig => {
                  const activa = asig.id === activeAsignaturaId;
                  return (
                    <button
                      key={asig.id}
                      type="button"
                      onClick={() => setSelectedAsignaturaId(asig.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition ${
                        activa
                          ? 'bg-sky-600/30 border-sky-500 text-sky-200 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {asig.nombre}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
            Este estudiante no tiene ningún curso o año asignado actualmente.
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className={`p-4 rounded-xl border ${getNotaBg(promedioPeriodoActual)} border-current/20`}>
            <div className="text-xs font-medium opacity-70 mb-1">Promedio Periodo Actual</div>
            <div className="text-3xl font-black">{promedioPeriodoActual.toFixed(2)}</div>
          </div>
          {notaNecesariaEstimada !== undefined && estadoAprobacion !== 'aprobado' && (
            <div className="p-4 rounded-xl border bg-amber-500/20 text-amber-300 border-amber-500/30">
              <div className="text-xs font-medium opacity-70 mb-1">Necesita en el Periodo</div>
              <div className="text-3xl font-black">{notaNecesariaEstimada.toFixed(2)}</div>
              {notaNecesariaEstimada > config.maxNota && (
                <div className="text-xs mt-1 font-semibold text-rose-400">Supera el máximo posible</div>
              )}
            </div>
          )}
          {promedioAcumuladoAnio !== undefined && (
            <div className={`p-4 rounded-xl border ${getNotaBg(promedioAcumuladoAnio)} border-current/20`}>
              <div className="text-xs font-medium opacity-75 mb-1">Acumulado Año</div>
              <div className="text-3xl font-black">{promedioAcumuladoAnio.toFixed(2)}</div>
              <div className="text-[11px] opacity-75 mt-0.5">
                Vacíos asumidos en {config.minNota}
              </div>
            </div>
          )}
          {notaNecesariaAnio !== undefined && (
            <div
              className={`p-4 rounded-xl border ${
                yaAproboAnio
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : notaNecesariaAnio > config.maxNota
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
              }`}
            >
              <div className="text-xs font-medium opacity-80 mb-1">Meta Definitiva Año</div>
              <div className="text-3xl font-black">
                {yaAproboAnio ? '✓ Aprobado' : notaNecesariaAnio.toFixed(2)}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {yaAproboAnio
                  ? 'Ya superó la nota mínima anual'
                  : notaNecesariaAnio > config.maxNota
                  ? `Supera el máx. (${config.maxNota})`
                  : `Para aprobar el año (≥ ${config.notaAprobatoria})`}
              </div>
            </div>
          )}
          <div className="p-4 rounded-xl border bg-slate-700/50 border-slate-700 text-slate-300">
            <div className="text-xs font-medium text-slate-500 mb-1">Actividades</div>
            <div className="text-3xl font-black">{historial.length}</div>
          </div>
          <div className="p-4 rounded-xl border bg-slate-700/50 border-slate-700 text-slate-300">
            <div className="text-xs font-medium text-slate-500 mb-1">Escala</div>
            <div className="text-xl font-black">
              {config.minNota} — {config.maxNota}
            </div>
            <div className="text-xs text-slate-500">Aprobatoria: {config.notaAprobatoria}</div>
          </div>
        </div>

        {/* Plan de Mejora por Periodo y Habilitación Anual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Card: Plan de Mejora por Periodo */}
          <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-700/80 flex flex-col justify-between gap-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 leading-tight">Plan de Mejora</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {activeAsignaturaObj?.nombre || 'Materia'} · Periodo {periodoPM}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                {Array.from({ length: config.periodosCount || 4 }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodoPM(p)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                      periodoPM === p
                        ? 'bg-sky-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    P{p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-300 font-medium">¿Presentó en P{periodoPM}?</span>
                <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setPmPresenta(false);
                      setPmAprobo(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                      !pmPresenta
                        ? 'bg-slate-700 text-slate-100 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setPmPresenta(true)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                      pmPresenta
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sí presentó
                  </button>
                </div>
              </div>

              {pmPresenta && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-300 font-medium">Resultado:</span>
                  <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPmAprobo(false)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                        !pmAprobo
                          ? 'bg-rose-600/80 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      No aprobó
                    </button>
                    <button
                      type="button"
                      onClick={() => setPmAprobo(true)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                        pmAprobo
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Aprobó
                    </button>
                  </div>
                </div>
              )}

              {pmPresenta && pmAprobo && (
                <div className="flex items-center justify-between gap-3 bg-slate-800/70 border border-slate-700/80 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-300 font-medium">
                    Nota definitiva P{periodoPM}:
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min={config.minNota}
                    max={config.maxNota}
                    value={pmNotaStr}
                    onChange={e => setPmNotaStr(e.target.value)}
                    className="w-20 px-2.5 py-1 bg-slate-900 border border-sky-500/50 rounded-lg text-xs text-center font-black text-emerald-400 outline-none focus:border-sky-400"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              {pmSavedMsg ? (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Guardado
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">
                  {pmPresenta ? (pmAprobo ? 'Reemplaza definitiva' : 'Se marcará PM✗') : 'Sin novedad'}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  const raw = parseFloat(pmNotaStr.replace(',', '.'));
                  const clamped = isNaN(raw)
                    ? config.notaAprobatoria
                    : Math.min(config.maxNota, Math.max(config.minNota, raw));
                  DatabaseService.savePlanMejora(estudianteId, targetEvaluacionId, periodoPM, {
                    presenta: pmPresenta,
                    aprobo: pmPresenta ? pmAprobo : false,
                    nota: pmPresenta && pmAprobo ? Number(clamped.toFixed(2)) : undefined,
                  });
                  setPmSavedMsg(true);
                  setTimeout(() => setPmSavedMsg(false), 2000);
                  setRefreshCount(c => c + 1);
                  onUpdated?.();
                }}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Check className="w-3.5 h-3.5" /> Confirmar
              </button>
            </div>
          </div>

          {/* Card: Habilitación Final del Año */}
          <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-700/80 flex flex-col justify-between gap-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 leading-tight">Habilitación Anual</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Recuperación final de {activeAsignaturaObj?.nombre || 'la materia'}
                  </p>
                </div>
              </div>
              {habilitacionActual.presenta && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    habilitacionActual.aprobo
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {habilitacionActual.aprobo ? 'Habilitado ✓' : 'No aprobó ✗'}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-300 font-medium">¿Presentó Habilitación?</span>
                <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setHabPresenta(false);
                      setHabAprobo(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                      !habPresenta
                        ? 'bg-slate-700 text-slate-100 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabPresenta(true)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                      habPresenta
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sí presentó
                  </button>
                </div>
              </div>

              {habPresenta && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-300 font-medium">Resultado:</span>
                  <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setHabAprobo(false)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                        !habAprobo
                          ? 'bg-rose-600/80 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      No aprobó
                    </button>
                    <button
                      type="button"
                      onClick={() => setHabAprobo(true)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                        habAprobo
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Aprobó
                    </button>
                  </div>
                </div>
              )}

              {habPresenta && habAprobo && (
                <div className="flex items-center justify-between gap-3 bg-slate-800/70 border border-slate-700/80 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-300 font-medium">
                    Nota final del año:
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min={config.minNota}
                    max={config.maxNota}
                    value={habNotaStr}
                    onChange={e => setHabNotaStr(e.target.value)}
                    className="w-20 px-2.5 py-1 bg-slate-900 border border-emerald-500/50 rounded-lg text-xs text-center font-black text-emerald-400 outline-none focus:border-emerald-400"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              {habSavedMsg ? (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Guardado
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">
                  {habPresenta ? (habAprobo ? 'Aprueba el año' : 'Se marcará HAB✗') : 'Sin habilitación'}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  const raw = parseFloat(habNotaStr.replace(',', '.'));
                  const clamped = isNaN(raw)
                    ? config.notaAprobatoria
                    : Math.min(config.maxNota, Math.max(config.minNota, raw));
                  DatabaseService.saveHabilitacion(estudianteId, targetEvaluacionId, {
                    presenta: habPresenta,
                    aprobo: habPresenta ? habAprobo : false,
                    nota: habPresenta && habAprobo ? Number(clamped.toFixed(2)) : undefined,
                  });
                  setHabSavedMsg(true);
                  setTimeout(() => setHabSavedMsg(false), 2000);
                  setRefreshCount(c => c + 1);
                  onUpdated?.();
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Check className="w-3.5 h-3.5" /> Confirmar
              </button>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Evolución por Periodo</h3>
            <ReactECharts option={lineChartOption} style={{ height: '220px' }} />
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Desempeño por Categoría</h3>
            <ReactECharts option={radarOption} style={{ height: '220px' }} />
          </div>
        </div>

        {/* Historial */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-500" /> Historial Cronológico
          </h3>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {historial.length === 0 && (
              <p className="text-sm text-slate-600 text-center py-4">Sin calificaciones registradas.</p>
            )}
            {historial.map(
              (h, idx) =>
                h && (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-slate-600 transition"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: h.categoria?.color || '#64748b' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {h.actividad.titulo}
                      </div>
                      <div className="text-xs text-slate-500">
                        {h.categoria?.nombre} · P{h.actividad.periodo} · {h.actividad.fechaCalificacion}
                      </div>
                      {h.observaciones && (
                        <div className="text-xs text-slate-600 italic mt-0.5">
                          "{h.observaciones}"
                        </div>
                      )}
                    </div>
                    <div className={`text-sm font-bold px-3 py-1 rounded-lg ${getNotaBg(h.nota)}`}>
                      {h.nota.toFixed(1)}
                    </div>
                  </div>
                )
            )}
          </div>
        </div>
      </div>

      {editingModalOpen && (
        <EditarEstudianteModal
          isOpen={editingModalOpen}
          estudiante={estudiante}
          onClose={() => setEditingModalOpen(false)}
          onSaved={() => {
            setEditingModalOpen(false);
            setRefreshCount(r => r + 1);
            onUpdated?.();
          }}
        />
      )}

      {expedienteModalOpen && (
        <ExpedienteEstudianteModal
          isOpen={expedienteModalOpen}
          estudianteId={estudiante.id}
          onClose={() => setExpedienteModalOpen(false)}
        />
      )}
    </div>
  );
};
