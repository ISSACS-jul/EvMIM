import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import {
  X,
  GraduationCap,
  Calendar,
  BookOpen,
  Award,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Search,
  Printer,
  Layers,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

interface ExpedienteEstudianteModalProps {
  isOpen: boolean;
  estudianteId?: string | null;
  onClose: () => void;
}

export const ExpedienteEstudianteModal: React.FC<ExpedienteEstudianteModalProps> = ({
  isOpen,
  estudianteId: initialEstudianteId,
  onClose,
}) => {
  const todosEstudiantes = DatabaseService.getEstudiantes();
  const config = DatabaseService.getConfiguracion();

  const [estudianteSeleccionadoId, setEstudianteSeleccionadoId] = useState<string>(
    initialEstudianteId || todosEstudiantes[0]?.id || ''
  );
  const [busqueda, setBusqueda] = useState('');

  if (!isOpen) return null;

  const expediente = estudianteSeleccionadoId
    ? DatabaseService.getExpedienteEstudiante(estudianteSeleccionadoId)
    : null;

  const estudiantesFiltrados = todosEstudiantes.filter(e => {
    const q = busqueda.toLowerCase();
    return (
      e.nombre.toLowerCase().includes(q) ||
      e.apellido.toLowerCase().includes(q) ||
      e.codigo.toLowerCase().includes(q)
    );
  });

  const getNotaColor = (nota: number): string => {
    if (nota === 0) return 'text-base-500';
    if (nota >= config.notaAprobatoria) return 'text-emerald-400';
    if (nota >= config.notaAprobatoria * 0.85) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getNotaBg = (nota: number): string => {
    if (nota === 0) return 'bg-base-800 text-base-500 border-base-600';
    if (nota >= config.notaAprobatoria) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (nota >= config.notaAprobatoria * 0.85) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  };

  // Gráfico de evolución multianual
  const lineChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    grid: { left: '8%', right: '5%', top: '15%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: (expediente?.aniosCursados || []).map(a => `Año ${a.anioNombre}\n(${a.cursoNombre})`),
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      min: config.minNota,
      max: config.maxNota,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
    },
    series: [
      {
        name: 'Promedio Anual',
        type: 'line',
        smooth: true,
        data: (expediente?.aniosCursados || []).map(a => a.promedioAnio),
        lineStyle: { color: '#38bdf8', width: 3 },
        itemStyle: { color: '#38bdf8', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#38bdf844' },
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
              label: { formatter: 'Aprobación', color: '#fbbf24', fontSize: 10 },
            },
          ],
        },
      },
    ],
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-base-900 border border-base-600/80 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden">
        {/* Barra Superior */}
        <div className="bg-base-800/90 px-6 py-4 border-b border-base-600 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-light">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-base-100 flex items-center gap-2">
                Expediente y Ficha General del Estudiante
              </h2>
              <p className="text-xs text-base-400">
                Historial académico multianual a lo largo de todos sus años lectivos y cursos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-base-700 hover:bg-base-600 border border-base-600 text-base-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Imprimir expediente"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button
              onClick={onClose}
              className="text-base-400 hover:text-base-200 transition p-1.5 rounded-lg hover:bg-base-700/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selector de estudiante */}
        <div className="bg-slate-850 px-6 py-3 border-b border-base-800 flex items-center gap-3 flex-shrink-0 flex-wrap">
          <span className="text-xs font-semibold text-base-400 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-accent-light" /> Consultar Estudiante:
          </span>
          <div className="flex-1 max-w-sm relative">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Filtrar por nombre o código..."
              className="w-full pl-3 pr-3 py-1.5 bg-base-800 border border-base-600 rounded-lg text-xs text-base-100 placeholder-base-500 outline-none focus:border-accent"
            />
          </div>
          <select
            value={estudianteSeleccionadoId}
            onChange={e => setEstudianteSeleccionadoId(e.target.value)}
            className="px-3 py-1.5 bg-base-800 border border-base-600 rounded-lg text-xs text-base-100 outline-none focus:border-accent max-w-xs cursor-pointer font-medium"
          >
            {estudiantesFiltrados.map(e => (
              <option key={e.id} value={e.id} className="bg-base-800 text-base-100">
                {e.apellido}, {e.nombre} ({e.codigo})
              </option>
            ))}
          </select>
        </div>

        {/* Cuerpo Principal Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!expediente ? (
            <div className="text-center py-20 text-base-500">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-base-400">Selecciona un estudiante para consultar su expediente.</p>
            </div>
          ) : (
            <>
              {/* Tarjeta Perfil del Estudiante */}
              <div className="bg-base-800/80 border border-base-600/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                      {expediente.estudiante.nombre[0]}
                      {expediente.estudiante.apellido[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-base-100">
                        {expediente.estudiante.apellido}, {expediente.estudiante.nombre}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-base-400 mt-1">
                        <span className="font-mono bg-base-900/60 px-2 py-0.5 rounded border border-base-600">
                          {expediente.estudiante.codigo}
                        </span>
                        <span>·</span>
                        <span>{expediente.aniosCursados.length} años lectivos registrados</span>
                        <span>·</span>
                        <span>{expediente.totalMateriasCursadas} asignaturas cursadas</span>
                      </div>
                    </div>
                  </div>

                  {/* Badge de Promedio Histórico Global */}
                  <div className="bg-base-900/80 border border-base-600/80 rounded-xl p-3 px-5 text-right flex items-center gap-4">
                    <div>
                      <div className="text-[11px] font-semibold text-base-400 uppercase tracking-wider">
                        Promedio Histórico Global
                      </div>
                      <div
                        className={`text-3xl font-black ${
                          expediente.promedioHistoricoGlobal >= config.notaAprobatoria
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {expediente.promedioHistoricoGlobal > 0
                          ? expediente.promedioHistoricoGlobal.toFixed(2)
                          : '—'}
                      </div>
                      <div className="text-[10px] text-base-500 mt-0.5">
                        Escala {config.minNota} a {config.maxNota} (Min. {config.notaAprobatoria})
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-accent-light/10 border border-accent/30 flex items-center justify-center text-accent-light">
                      <Award className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico de Evolución Multianual */}
              {expediente.aniosCursados.length > 1 && (
                <div className="bg-base-800/80 border border-base-600/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-base-200 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-accent-light" /> Evolución del Rendimiento Multianual
                    </h4>
                    <span className="text-xs text-base-400">Comparativa año a año</span>
                  </div>
                  <ReactECharts option={lineChartOption} style={{ height: '240px' }} />
                </div>
              )}

              {/* Trayectoria Detallada Año tras Año */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-base-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent-light" /> Trayectoria Académica Detallada (Año tras Año)
                </h4>

                {expediente.aniosCursados.length === 0 ? (
                  <div className="p-6 bg-base-800/60 rounded-xl border border-base-600 text-center text-base-500 text-sm">
                    Este estudiante no cuenta con cursos o años asignados actualmente.
                  </div>
                ) : (
                  expediente.aniosCursados.map((item, idx) => {
                    const statusConfig = {
                      aprobado: {
                        icon: Award,
                        color: 'text-emerald-400',
                        bg: 'bg-emerald-500/20 border-emerald-500/40',
                        label: 'Aprobado / Promovido',
                      },
                      en_riesgo: {
                        icon: AlertTriangle,
                        color: 'text-amber-400',
                        bg: 'bg-amber-500/20 border-amber-500/40',
                        label: 'En Curso / En Riesgo',
                      },
                      reprobado: {
                        icon: XCircle,
                        color: 'text-rose-400',
                        bg: 'bg-rose-500/20 border-rose-500/40',
                        label: 'Reprobado',
                      },
                    };
                    const sc = statusConfig[item.estado];
                    const StatusIcon = sc.icon;

                    return (
                      <div
                        key={idx}
                        className="bg-base-800/80 border border-base-600/80 rounded-2xl p-5 shadow-sm space-y-4"
                      >
                        {/* Cabecera del Año */}
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-base-600/80 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent/20 text-accent-light rounded-xl border border-accent/30">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-base font-bold text-base-100 flex items-center gap-2">
                                <span>Año {item.anioNombre}</span>
                                <span className="text-base-500 font-normal">·</span>
                                <span className="text-accent-light font-semibold">{item.cursoNombre}</span>
                              </div>
                              <div className="text-xs text-base-500">
                                {item.materias.length} asignaturas evaluadas en este año lectivo
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-[10px] text-base-400 uppercase font-semibold">
                                Promedio Anual
                              </div>
                              <div className={`text-xl font-black ${getNotaColor(item.promedioAnio)}`}>
                                {item.promedioAnio > 0 ? item.promedioAnio.toFixed(2) : '—'}
                              </div>
                            </div>

                            <div
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${sc.bg} ${sc.color}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              <span>{sc.label}</span>
                            </div>
                          </div>
                        </div>

                        {/* Tabla de Materias de este año */}
                        {item.materias.length === 0 ? (
                          <p className="text-xs text-base-500 italic py-2">
                            Sin asignaturas vinculadas a este curso.
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-base-600/60">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-base-900/80 text-base-400 uppercase font-bold text-[10px] tracking-wider border-b border-base-600/60">
                                <tr>
                                  <th className="py-2.5 px-4">Asignatura / Materia</th>
                                  {Array.from({ length: config.periodosCount }, (_, i) => i + 1).map(p => (
                                    <th key={p} className="py-2.5 px-2 text-center">
                                      P{p}
                                    </th>
                                  ))}
                                  <th className="py-2.5 px-3 text-center">Definitiva</th>
                                  <th className="py-2.5 px-3 text-center">Calificaciones</th>
                                  <th className="py-2.5 px-3 text-center">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/40 text-base-300">
                                {item.materias.map(m => {
                                  return (
                                    <tr key={m.asignaturaId} className="hover:bg-base-700/30 transition">
                                      <td className="py-2.5 px-4 font-semibold text-base-200">
                                        <div className="flex items-center gap-2">
                                          <BookOpen className="w-3.5 h-3.5 text-accent-light flex-shrink-0" />
                                          <span>{m.asignaturaNombre}</span>
                                        </div>
                                      </td>
                                      {Array.from({ length: config.periodosCount }, (_, i) => i + 1).map(p => {
                                        const notaP = m.promediosPeriodo[p] || 0;
                                        return (
                                          <td key={p} className="py-2.5 px-2 text-center font-mono">
                                            {notaP > 0 ? (
                                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${getNotaBg(notaP)}`}>
                                                {notaP.toFixed(1)}
                                              </span>
                                            ) : (
                                              <span className="text-base-600">—</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      <td className="py-2.5 px-3 text-center">
                                        <span
                                          className={`px-2 py-1 rounded-lg text-xs font-black border ${getNotaBg(
                                            m.promedioFinal
                                          )}`}
                                        >
                                          {m.promedioFinal > 0 ? m.promedioFinal.toFixed(2) : '—'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center text-base-400 font-mono">
                                        {m.calificacionesCount}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            m.estado === 'aprobado'
                                              ? 'bg-emerald-500/20 text-emerald-400'
                                              : m.estado === 'reprobado'
                                              ? 'bg-rose-500/20 text-rose-400'
                                              : 'bg-amber-500/20 text-amber-400'
                                          }`}
                                        >
                                          {m.estado === 'aprobado'
                                            ? 'Aprobada'
                                            : m.estado === 'reprobado'
                                            ? 'Reprobada'
                                            : 'En curso'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-base-800/90 px-6 py-3 border-t border-base-600 flex items-center justify-between text-xs text-base-400 flex-shrink-0">
          <span>Sistema Académico Evaluador v0.1</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-base-700 hover:bg-base-600 text-white rounded-xl text-xs font-semibold transition"
          >
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
};
