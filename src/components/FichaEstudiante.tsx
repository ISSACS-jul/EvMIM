import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { ResumenEstudiante } from '../types';
import { X, TrendingUp, Award, AlertTriangle, XCircle, BookOpen, Edit3 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { EditarEstudianteModal } from './EditarEstudianteModal';
import { ExpedienteEstudianteModal } from './ExpedienteEstudianteModal';

interface FichaEstudianteProps {
  estudianteId: string | null;
  cursoId?: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export const FichaEstudiante: React.FC<FichaEstudianteProps> = ({
  estudianteId,
  cursoId,
  onClose,
  onUpdated,
}) => {
  // DECLARAR TODOS LOS HOOKS ARRIBA SIN CONDICIONALES PARA CUMPLIR REGLAS DE REACT
  const [editingModalOpen, setEditingModalOpen] = useState(false);
  const [expedienteModalOpen, setExpedienteModalOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [selectedCursoId, setSelectedCursoId] = useState<string>('');

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

  const config = DatabaseService.getConfiguracion();
  const categorias = DatabaseService.getCategorias();
  const resumen = DatabaseService.getResumenEstudiante(estudianteId, activeCursoId);

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

  const actividades = DatabaseService.getActividades(activeCursoId);
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
