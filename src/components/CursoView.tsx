import React, { useState } from 'react';
import { Curso, Actividad, Asignatura, Estudiante } from '../types';
import { DatabaseService } from '../services/db';
import { exportarPlanillaExcel } from '../services/excelExport';
import { Planilla } from './Planilla';
import { IngresarNotasModal } from './IngresarNotasModal';
import { NuevaActividadModal } from './NuevaActividadModal';
import { EditarCursoModal } from './EditarCursoModal';
import { FichaEstudiante } from './FichaEstudiante';
import { EstudiantesManager } from './EstudiantesManager';
import { EditarEstudianteModal } from './EditarEstudianteModal';
import { EvaluadorProfundoModal } from './EvaluadorProfundoModal';
import { confirmarAccion } from './ConfirmModal';
import { BoxPlotChart, PieChart, RadarChart, BarChartSimple } from './Charts';
import {
  Plus,
  ClipboardList,
  BarChart2,
  Users,
  TableIcon,
  Trash2,
  Edit3,
  BookOpen,
  Check,
  X,
  Save,
  Activity,
  Layers,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

interface CursoViewProps {
  curso: Curso;
  onCursoUpdated: (curso: Curso) => void;
  onCursoDeleted?: () => void;
}

type Tab = 'planilla' | 'actividades' | 'estudiantes' | 'analitica';

export const CursoView: React.FC<CursoViewProps> = ({
  curso,
  onCursoUpdated,
  onCursoDeleted,
}) => {
  const [tab, setTab] = useState<Tab>('planilla');
  const [actividadModal, setActividadModal] = useState<Actividad | null>(null);
  const [actividadParaEditar, setActividadParaEditar] = useState<Actividad | null>(null);
  const [nuevaActividadOpen, setNuevaActividadOpen] = useState(false);
  const [fichaEstudianteId, setFichaEstudianteId] = useState<string | null>(null);
  const [estudiantesOpen, setEstudiantesOpen] = useState(false);
  const [editarCursoOpen, setEditarCursoOpen] = useState(false);
  const [estudianteParaEditar, setEstudianteParaEditar] = useState<Estudiante | null>(null);
  const [evaluadorProfundoOpen, setEvaluadorProfundoOpen] = useState(false);
  const [actividadParaEvaluadorProfundo, setActividadParaEvaluadorProfundo] = useState<Actividad | null>(null);
  const [periodo, setPeriodo] = useState<number>(curso.periodoActual);
  const [refresh, setRefresh] = useState(0);

  // Sub-pestañas de analítica
  const [analiticaModo, setAnaliticaModo] = useState<'general' | 'categoria' | 'actividad'>('general');
  const [analiticaCatId, setAnaliticaCatId] = useState<string>('');
  const [analiticaActId, setAnaliticaActId] = useState<string>('');

  // Asignaturas del curso
  const asignaturas = DatabaseService.getAsignaturas(curso.id);
  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState<string | null>(
    asignaturas[0]?.id || null
  );

  // Modal / Input para crear/editar Asignatura
  const [creandoAsignatura, setCreandoAsignatura] = useState(false);
  const [nuevaAsigNombre, setNuevaAsigNombre] = useState('');
  const [asignaturaEditando, setAsignaturaEditando] = useState<Asignatura | null>(null);
  const [editAsigNombre, setEditAsigNombre] = useState('');

  const activeAsignatura = asignaturas.find(a => a.id === selectedAsignaturaId) || asignaturas[0] || null;
  const currentTargetId = activeAsignatura?.id || curso.id;

  const config = DatabaseService.getConfiguracion();
  const categorias = DatabaseService.getCategorias();
  const estudiantes = DatabaseService.getEstudiantes(curso.id);
  const actividades = DatabaseService.getActividades(currentTargetId, periodo);

  const handlePeriodoChange = (nuevoPeriodo: number) => {
    setPeriodo(nuevoPeriodo);
    const cursoActualizado = { ...curso, periodoActual: nuevoPeriodo };
    DatabaseService.updateCurso(cursoActualizado);
    onCursoUpdated(cursoActualizado);
  };

  const handleEliminarCurso = async () => {
    const ok = await confirmarAccion({
      titulo: `Eliminar curso "${curso.nombre}"`,
      mensaje: `¿Eliminar el curso "${curso.nombre}"? Se perderán todas sus asignaturas, actividades y notas asociadas.`,
    });
    if (ok) {
      DatabaseService.deleteCurso(curso.id);
      onCursoDeleted?.();
    }
  };

  const handleRefresh = () => setRefresh(r => r + 1);

  // Crear asignatura
  const handleCrearAsignatura = () => {
    if (!nuevaAsigNombre.trim()) return;
    const nueva = DatabaseService.addAsignatura(curso.id, nuevaAsigNombre.trim());
    setNuevaAsigNombre('');
    setCreandoAsignatura(false);
    setSelectedAsignaturaId(nueva.id);
    handleRefresh();
  };

  // Editar asignatura
  const handleGuardarEditAsignatura = () => {
    if (!asignaturaEditando || !editAsigNombre.trim()) return;
    DatabaseService.updateAsignatura({
      ...asignaturaEditando,
      nombre: editAsigNombre.trim(),
    });
    setAsignaturaEditando(null);
    handleRefresh();
  };

  // Eliminar asignatura
  const handleEliminarAsignatura = async (asigId: string, asigNombre: string) => {
    const ok = await confirmarAccion({
      titulo: `Eliminar asignatura "${asigNombre}"`,
      mensaje: `¿Eliminar la asignatura "${asigNombre}"? Se borrarán sus actividades y calificaciones asociadas.`,
    });
    if (ok) {
      DatabaseService.deleteAsignatura(asigId);
      if (selectedAsignaturaId === asigId) {
        const restantes = asignaturas.filter(a => a.id !== asigId);
        setSelectedAsignaturaId(restantes[0]?.id || null);
      }
      handleRefresh();
    }
  };

  // Eliminar actividad
  const handleEliminarActividad = async (actId: string, actTitulo: string) => {
    const ok = await confirmarAccion({
      titulo: `Eliminar actividad "${actTitulo}"`,
      mensaje: `¿Eliminar la actividad "${actTitulo}"? Se borrarán todas sus calificaciones.`,
    });
    if (ok) {
      DatabaseService.deleteActividad(actId);
      handleRefresh();
    }
  };

  // Toggle vinculación estudiante a asignatura
  const handleToggleEstudianteAsignatura = (estudianteId: string, asigId: string) => {
    const est = estudiantes.find(e => e.id === estudianteId);
    if (!est) return;
    const asigIds = est.asignaturaIds || [];
    if (asigIds.includes(asigId)) {
      DatabaseService.desvincularAsignatura(estudianteId, asigId);
    } else {
      DatabaseService.vincularAsignatura(estudianteId, asigId);
    }
    handleRefresh();
  };

  // ==================== CÁLCULOS DE ANALÍTICA EXACTOS A PLANILLA ====================
  // 1. Promedio final ponderado por estudiante en el periodo actual
  const calificacionesDelTarget = DatabaseService.getCalificaciones();

  const getEstudianteNotaEnAct = (estId: string, actId: string): number | undefined => {
    return calificacionesDelTarget.find(c => c.actividadId === actId && c.estudianteId === estId)?.nota;
  };

  const resumenesEstudiantes = estudiantes.map(e => {
    let sumaPonderada = 0;
    let pesoTotal = 0;
    const notasPorCat: { [catId: string]: number } = {};

    for (const cat of categorias) {
      const actsCat = actividades.filter(a => a.categoriaId === cat.id);
      const notas = actsCat
        .map(a => getEstudianteNotaEnAct(e.id, a.id))
        .filter((n): n is number => n !== undefined);

      if (notas.length > 0) {
        const promCat = notas.reduce((acc, curr) => acc + curr, 0) / notas.length;
        notasPorCat[cat.id] = promCat;
        sumaPonderada += promCat * (cat.pesoPorcentaje / 100);
        pesoTotal += cat.pesoPorcentaje;
      }
    }

    const notaFinal = pesoTotal > 0 ? (sumaPonderada / (pesoTotal / 100)) : null;
    return { estudiante: e, notaFinal, notasPorCat };
  });

  const estudiantesConNota = resumenesEstudiantes.filter(
    (r): r is { estudiante: Estudiante; notaFinal: number; notasPorCat: { [catId: string]: number } } =>
      r.notaFinal !== null
  );

  // Promedio general de la asignatura/curso exactamente como en Planilla
  const promedioGeneralPeriodo = estudiantesConNota.length > 0
    ? estudiantesConNota.reduce((acc, r) => acc + r.notaFinal, 0) / estudiantesConNota.length
    : 0;

  const aprobadosCount = estudiantesConNota.filter(r => r.notaFinal >= config.notaAprobatoria).length;
  const tasaAprobacion = estudiantesConNota.length > 0
    ? ((aprobadosCount / estudiantesConNota.length) * 100).toFixed(1)
    : '0';

  const todasLasNotas = actividades.flatMap(act =>
    calificacionesDelTarget.filter(c => c.actividadId === act.id).map(c => c.nota)
  );

  const notaMaxima = todasLasNotas.length > 0 ? Math.max(...todasLasNotas).toFixed(1) : '—';
  const notaMinima = todasLasNotas.length > 0 ? Math.min(...todasLasNotas).toFixed(1) : '—';

  // Actividades con notas
  const actividadesConNotas = actividades
    .map(act => ({
      act,
      notas: calificacionesDelTarget.filter(c => c.actividadId === act.id).map(c => c.nota),
    }))
    .filter(x => x.notas.length > 0);

  // Rangos de desempeño basados en la configuración institucional
  const rBajoMax = config.rangoBajoMax !== undefined ? config.rangoBajoMax : (config.notaAprobatoria - 0.1);
  const rBasicoMax = config.rangoBasicoMax !== undefined ? config.rangoBasicoMax : 3.9;
  const rAltoMax = config.rangoAltoMax !== undefined ? config.rangoAltoMax : 4.5;

  const rangos = [
    {
      name: `Bajo (≤ ${rBajoMax})`,
      value: estudiantesConNota.filter(r => r.notaFinal <= rBajoMax).length,
      itemStyle: { color: '#f87171' },
    },
    {
      name: `Básico (>${rBajoMax} - ${rBasicoMax})`,
      value: estudiantesConNota.filter(
        r => r.notaFinal > rBajoMax && r.notaFinal <= rBasicoMax
      ).length,
      itemStyle: { color: '#fbbf24' },
    },
    {
      name: `Alto (>${rBasicoMax} - ${rAltoMax})`,
      value: estudiantesConNota.filter(
        r => r.notaFinal > rBasicoMax && r.notaFinal <= rAltoMax
      ).length,
      itemStyle: { color: '#60a5fa' },
    },
    {
      name: `Superior (>${rAltoMax})`,
      value: estudiantesConNota.filter(
        r => r.notaFinal > rAltoMax
      ).length,
      itemStyle: { color: '#34d399' },
    },
  ].filter(r => r.value > 0);

  // Gráfico Telaraña (Radar) por Categoría
  const radarIndicadores = categorias.map(c => ({
    name: `${c.nombre} (${c.pesoPorcentaje}%)`,
    max: config.maxNota,
  }));

  const radarValores = categorias.map(cat => {
    const notasCat = estudiantesConNota
      .map(e => e.notasPorCat[cat.id])
      .filter((n): n is number => n !== undefined);
    if (notasCat.length === 0) return 0;
    return Number((notasCat.reduce((acc, curr) => acc + curr, 0) / notasCat.length).toFixed(2));
  });

  const radarDatos = [
    {
      name: 'Promedio del Grupo',
      value: radarValores,
    },
  ];

  // Boxplot de categorías
  const nombresCategoriasBoxPlot: string[] = [];
  const datosBoxPlotCategorias: number[][] = [];
  for (const cat of categorias) {
    const actsCat = actividades.filter(a => a.categoriaId === cat.id);
    const notasCat = actsCat.flatMap(a =>
      calificacionesDelTarget.filter(c => c.actividadId === a.id).map(c => c.nota)
    );
    if (notasCat.length > 0) {
      nombresCategoriasBoxPlot.push(`${cat.nombre} (${cat.pesoPorcentaje}%)`);
      datosBoxPlotCategorias.push(notasCat);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'planilla', label: 'Planilla', icon: TableIcon },
    { id: 'actividades', label: `Actividades (${actividades.length})`, icon: ClipboardList },
    { id: 'estudiantes', label: `Estudiantes (${estudiantes.length})`, icon: Users },
    { id: 'analitica', label: 'Analítica', icon: BarChart2 },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header del curso */}
      <div className="bg-gradient-to-r from-sky-700 to-sky-800 px-6 py-4 text-white flex-shrink-0 flex items-center justify-between shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{curso.nombre}</h2>
            <button
              onClick={() => setEditarCursoOpen(true)}
              className="p-1 text-sky-200 hover:text-white hover:bg-sky-600/50 rounded-lg transition"
              title="Modificar nombre y datos del curso"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sky-200 text-xs">
            <span>Año {curso.anio}</span>
            <span>·</span>
            <span>{estudiantes.length} estudiantes</span>
            <span>·</span>
            <span>{asignaturas.length} asignaturas</span>
            {activeAsignatura && (
              <>
                <span>·</span>
                <span className="font-semibold text-white bg-sky-900/60 px-2 py-0.5 rounded">
                  {activeAsignatura.nombre}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de Periodo Académico Activo */}
          <div className="flex items-center gap-2 bg-sky-900/60 border border-sky-600/50 rounded-xl px-3 py-1.5">
            <span className="text-sky-200 text-xs font-semibold uppercase tracking-wide">
              Periodo
            </span>
            <div className="flex gap-1">
              {Array.from({ length: config.periodosCount }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodoChange(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                    periodo === p
                      ? 'bg-white text-sky-800 shadow'
                      : 'text-sky-200 hover:bg-sky-700/60'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {onCursoDeleted && (
            <button
              onClick={handleEliminarCurso}
              className="p-2 bg-sky-900/60 hover:bg-rose-600 border border-sky-600/50 hover:border-rose-500 rounded-xl text-sky-200 hover:text-white transition"
              title="Eliminar este curso"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE ASIGNATURAS / MATERIAS */}
      <div className="bg-slate-800/95 border-b border-slate-700 px-6 py-2.5 flex items-center justify-between gap-3 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" /> Asignaturas:
          </span>

          {asignaturas.length === 0 ? (
            <span className="text-xs text-slate-500 italic">No hay asignaturas creadas aún.</span>
          ) : (
            asignaturas.map(asig => {
              const activa = (activeAsignatura?.id === asig.id);
              return (
                <div
                  key={asig.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition border ${
                    activa
                      ? 'bg-sky-600 border-sky-500 text-white shadow'
                      : 'bg-slate-700/70 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <button
                    onClick={() => setSelectedAsignaturaId(asig.id)}
                    className="truncate max-w-[150px]"
                  >
                    {asig.nombre}
                  </button>

                  <button
                    onClick={() => {
                      setAsignaturaEditando(asig);
                      setEditAsigNombre(asig.nombre);
                    }}
                    className={`p-0.5 rounded hover:bg-black/20 ${activa ? 'text-sky-200' : 'text-slate-400 hover:text-sky-300'}`}
                    title="Modificar nombre de asignatura"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => handleEliminarAsignatura(asig.id, asig.nombre)}
                    className={`p-0.5 rounded hover:bg-black/20 ${activa ? 'text-sky-200 hover:text-rose-200' : 'text-slate-400 hover:text-rose-400'}`}
                    title="Eliminar asignatura"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!creandoAsignatura ? (
            <button
              onClick={() => setCreandoAsignatura(true)}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-sky-300 hover:text-white border border-slate-600 px-3 py-1 rounded-xl font-medium flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Asignatura
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-700 p-1 rounded-xl border border-sky-500">
              <input
                type="text"
                value={nuevaAsigNombre}
                onChange={e => setNuevaAsigNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCrearAsignatura()}
                placeholder="Nombre materia..."
                className="px-2 py-0.5 bg-slate-800 text-xs text-white rounded outline-none w-36"
                autoFocus
              />
              <button
                onClick={handleCrearAsignatura}
                className="p-1 bg-sky-600 hover:bg-sky-500 text-white rounded"
                title="Guardar"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setCreandoAsignatura(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
                title="Cancelar"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL / POPUP RÁPIDO PARA EDITAR ASIGNATURA */}
      {asignaturaEditando && (
        <div className="bg-slate-800 border-b border-sky-600/50 px-6 py-2 flex items-center gap-3">
          <span className="text-xs text-sky-400 font-semibold flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Modificar Asignatura:
          </span>
          <input
            type="text"
            value={editAsigNombre}
            onChange={e => setEditAsigNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGuardarEditAsignatura()}
            className="px-3 py-1 bg-slate-700 border border-slate-600 text-xs text-white rounded-lg outline-none w-56"
            autoFocus
          />
          <button
            onClick={handleGuardarEditAsignatura}
            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition shadow"
          >
            <Save className="w-3 h-3" /> Guardar
          </button>
          <button
            onClick={() => setAsignaturaEditando(null)}
            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex gap-0 px-6">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  tab === t.id
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* =========== PLANILLA =========== */}
        {tab === 'planilla' && (
          <div>
            {!activeAsignatura ? (
              <div className="text-center py-20 bg-slate-800/40 border border-slate-800 rounded-2xl text-slate-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-25 text-sky-400" />
                <p className="font-semibold text-slate-300">No hay asignaturas en este curso</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Crea primero una asignatura en la barra superior para poder registrar actividades y calificaciones.
                </p>
                <button
                  onClick={() => setCreandoAsignatura(true)}
                  className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition shadow"
                >
                  <Plus className="w-4 h-4" /> Nueva Asignatura
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-slate-400">
                    Planilla — {activeAsignatura.nombre} (Periodo {periodo}) &nbsp;
                    <span className="text-slate-600">· Clic en celda para calificar · Enter/Tab para avanzar</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportarPlanillaExcel(curso, periodo, activeAsignatura)}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-sm font-medium transition shadow"
                      title="Descargar únicamente esta planilla de notas en formato Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
                    </button>
                    <button
                      onClick={() => {
                        setActividadParaEditar(null);
                        setNuevaActividadOpen(true);
                      }}
                      className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
                    >
                      <Plus className="w-4 h-4" /> Nueva Actividad
                    </button>
                  </div>
                </div>
                <Planilla
                  key={`${curso.id}-${currentTargetId}-${periodo}`}
                  curso={curso}
                  periodo={periodo}
                  asignaturaId={activeAsignatura.id}
                  refreshTrigger={refresh}
                  onRefresh={handleRefresh}
                />
              </>
            )}
          </div>
        )}

        {/* =========== ACTIVIDADES =========== */}
        {tab === 'actividades' && (
          <div>
            {!activeAsignatura ? (
              <div className="text-center py-20 bg-slate-800/40 border border-slate-800 rounded-2xl text-slate-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-25 text-sky-400" />
                <p className="font-semibold text-slate-300">No hay asignaturas en este curso</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Para crear actividades primero debes crear al menos una asignatura.
                </p>
                <button
                  onClick={() => setCreandoAsignatura(true)}
                  className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition shadow"
                >
                  <Plus className="w-4 h-4" /> Nueva Asignatura
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-slate-400">
                    Actividades de {activeAsignatura.nombre} — Periodo {periodo}
                  </h3>
                  <button
                    onClick={() => {
                      setActividadParaEditar(null);
                      setNuevaActividadOpen(true);
                    }}
                    className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
                  >
                    <Plus className="w-4 h-4" /> Nueva Actividad
                  </button>
                </div>

                {actividades.length === 0 ? (
                  <div className="text-center py-16 text-slate-600">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-slate-500">
                      Sin actividades para {activeAsignatura.nombre} en el Periodo {periodo}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Crea una nueva actividad usando el botón superior
                    </p>
                  </div>
                ) : (
              <div className="space-y-3">
                {categorias.map(cat => {
                  const actsDeCategoria = actividades.filter(a => a.categoriaId === cat.id);
                  if (actsDeCategoria.length === 0) return null;
                  return (
                    <div key={cat.id} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {cat.nombre} · {cat.pesoPorcentaje}%
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {actsDeCategoria.map(act => {
                          const califs = DatabaseService.getCalificaciones(act.id);
                          const prom =
                            califs.length > 0
                              ? califs.reduce((a, c) => a + c.nota, 0) / califs.length
                              : null;
                          return (
                            <div
                              key={act.id}
                              className="flex items-center gap-3 p-3.5 bg-slate-800 hover:bg-slate-700/80 rounded-xl border border-slate-700 hover:border-sky-700 transition group"
                            >
                              <div
                                className="w-1 h-10 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => setActividadModal(act)}
                              >
                                <div className="font-semibold text-slate-200 text-sm group-hover:text-sky-300 transition truncate">
                                  {act.titulo}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-2">
                                  <span>📅 {act.fechaActividad}</span>
                                  <span>· P{act.periodo}</span>
                                  <span>
                                    · {califs.length}/{estudiantes.length} calificados
                                  </span>
                                  {act.archivoAdjuntoNombre && <span>📎 {act.archivoAdjuntoNombre}</span>}
                                </div>
                                {act.descripcion && (
                                  <div className="text-xs text-slate-600 mt-0.5 italic truncate">
                                    "{act.descripcion}"
                                  </div>
                                )}
                              </div>

                              {prom !== null ? (
                                <div
                                  onClick={() => setActividadModal(act)}
                                  className={`text-sm font-bold px-3 py-1 rounded-lg cursor-pointer ${
                                    prom >= config.notaAprobatoria
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  x̄ {prom.toFixed(2)}
                                </div>
                              ) : (
                                <div
                                  onClick={() => setActividadModal(act)}
                                  className="text-xs text-slate-600 bg-slate-700 px-3 py-1 rounded-lg cursor-pointer"
                                >
                                  Sin notas
                                </div>
                              )}

                              {/* Botones de acción directa para editar y borrar la actividad */}
                              <div className="flex items-center gap-1 pl-2 border-l border-slate-700/80">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setActividadParaEvaluadorProfundo(act);
                                    setEvaluadorProfundoOpen(true);
                                  }}
                                  className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-slate-700 rounded-lg transition"
                                  title="Calificar con Evaluador Profundo (Aciertos y Curvas)"
                                >
                                  <Sparkles className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setActividadParaEditar(act);
                                    setNuevaActividadOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-700 rounded-lg transition"
                                  title="Modificar actividad"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleEliminarActividad(act.id, act.titulo);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition"
                                  title="Borrar actividad"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* =========== ESTUDIANTES =========== */}
        {tab === 'estudiantes' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-300">
                  {estudiantes.length} estudiantes en {curso.nombre}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Marca o desmarca las casillas para vincular o desvincular a cada estudiante de las asignaturas.
                </p>
              </div>
              <button
                onClick={() => setEstudiantesOpen(true)}
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" /> Gestionar Estudiantes
              </button>
            </div>

            {estudiantes.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-500">Sin estudiantes en este curso</p>
                <p className="text-sm mt-1 text-slate-600">Agrega estudiantes con el botón de arriba</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {estudiantes.map(est => {
                  const resumen = DatabaseService.getResumenEstudiante(est.id, currentTargetId);
                  const prom = resumen?.promedioPeriodoActual || 0;
                  const estado = resumen?.estadoAprobacion || 'en_riesgo';
                  const statusBg = {
                    aprobado: 'border-emerald-700/50 bg-emerald-500/10',
                    en_riesgo: 'border-amber-700/50 bg-amber-500/10',
                    reprobado: 'border-rose-700/50 bg-rose-500/10',
                  };
                  const promColor = {
                    aprobado: 'text-emerald-400',
                    en_riesgo: 'text-amber-400',
                    reprobado: 'text-rose-400',
                  };

                  return (
                    <div
                      key={est.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${statusBg[estado]}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow cursor-pointer"
                          onClick={() => setFichaEstudianteId(est.id)}
                          title="Ver ficha académica detallada"
                        >
                          {est.nombre[0]}
                          {est.apellido[0]}
                        </div>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setFichaEstudianteId(est.id)}
                          title="Ver ficha académica detallada"
                        >
                          <div className="font-semibold text-slate-200 truncate hover:text-sky-300">
                            {est.apellido}, {est.nombre}
                          </div>
                          <div className="text-xs text-slate-500">{est.codigo}</div>
                        </div>
                        <div
                          className={`text-base font-black ${promColor[estado]} cursor-pointer`}
                          onClick={() => setFichaEstudianteId(est.id)}
                          title="Ver ficha académica detallada"
                        >
                          {prom > 0 ? prom.toFixed(1) : '—'}
                        </div>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setEstudianteParaEditar(est);
                          }}
                          className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-700/60 rounded-lg transition"
                          title="Modificar datos de este estudiante"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Asignaturas vinculadas del curso */}
                      {asignaturas.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-700/60">
                          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                            <span>Asignaturas inscritas:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {asignaturas.map(asig => {
                              const estaInscrito =
                                !est.asignaturaIds ||
                                est.asignaturaIds.length === 0 ||
                                est.asignaturaIds.includes(asig.id);

                              return (
                                <button
                                  key={asig.id}
                                  type="button"
                                  onClick={() => handleToggleEstudianteAsignatura(est.id, asig.id)}
                                  className={`text-[11px] px-2 py-0.5 rounded-md border font-medium flex items-center gap-1 transition ${
                                    estaInscrito
                                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-200'
                                      : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:border-slate-500'
                                  }`}
                                  title={
                                    estaInscrito
                                      ? `Inscrito en ${asig.nombre} (clic para quitar)`
                                      : `No inscrito en ${asig.nombre} (clic para vincular)`
                                  }
                                >
                                  {estaInscrito && <Check className="w-2.5 h-2.5 text-sky-400" />}
                                  {asig.nombre}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========== ANALÍTICA =========== */}
        {tab === 'analitica' && (
          <div>
            {todasLasNotas.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-500">
                  Sin datos para analizar en {activeAsignatura?.nombre || curso.nombre} (Periodo {periodo})
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Ingresa calificaciones en las actividades para desbloquear las métricas y gráficos.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selector de sub-vistas de análisis */}
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Modo de Análisis:</span>
                    <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                      {[
                        { id: 'general', label: 'General y Resumen', icon: Layers },
                        { id: 'categoria', label: 'Por Tipo de Trabajo', icon: Activity },
                        { id: 'actividad', label: 'Por Actividad Específica', icon: ClipboardList },
                      ].map(m => {
                        const Icon = m.icon;
                        const activo = analiticaModo === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setAnaliticaModo(m.id as any)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                              activo
                                ? 'bg-sky-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                      Periodo <b className="text-sky-400">{periodo}</b>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                      {activeAsignatura?.nombre || curso.nombre}
                    </span>
                  </div>
                </div>

                {/* VISTA 1: GENERAL */}
                {analiticaModo === 'general' && (
                  <div className="space-y-6">
                    {/* Tarjetas KPI con Promedio Ponderado idéntico a Planilla */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                        <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                          <span>Promedio General</span>
                          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Planilla
                          </span>
                        </div>
                        <div className="text-2xl font-black text-sky-400">
                          {promedioGeneralPeriodo.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Ponderado exacto de {estudiantesConNota.length} estudiantes
                        </div>
                      </div>

                      <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                        <div className="text-xs text-slate-400 mb-1">Tasa de Aprobación</div>
                        <div className="text-2xl font-black text-emerald-400">{tasaAprobacion}%</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {aprobadosCount} de {estudiantesConNota.length} aprobados (≥ {config.notaAprobatoria})
                        </div>
                      </div>

                      <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                        <div className="text-xs text-slate-400 mb-1">Rango de Notas</div>
                        <div className="text-2xl font-black text-slate-100">
                          {notaMinima} — {notaMaxima}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Escala: {config.minNota} a {config.maxNota}
                        </div>
                      </div>

                      <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                        <div className="text-xs text-slate-400 mb-1">Actividades Calificadas</div>
                        <div className="text-2xl font-black text-slate-100">
                          {actividadesConNotas.length} / {actividades.length}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {todasLasNotas.length} calificaciones registradas
                        </div>
                      </div>
                    </div>

                    {/* Fila superior: Gráfico Telaraña + Gráfico Circular */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-sm">
                        <RadarChart
                          titulo="Desempeño Promedio por Tipo de Trabajo (Telaraña)"
                          indicadores={radarIndicadores}
                          datos={radarDatos}
                        />
                      </div>
                      <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-sm">
                        <PieChart titulo="Distribución de Rendimiento Académico" datos={rangos} />
                      </div>
                    </div>

                    {/* Fila inferior: Diagrama de Caja y Bigotes con bigotes perfectamente calculados y visibles */}
                    <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-sm">
                      <BoxPlotChart
                        titulo="Diagrama de Caja y Bigotes: Dispersión por Tipo de Actividad"
                        nombresCategorias={nombresCategoriasBoxPlot}
                        datos={datosBoxPlotCategorias}
                        minNota={config.minNota}
                        maxNota={config.maxNota}
                      />
                    </div>
                  </div>
                )}

                {/* VISTA 2: POR TIPO DE TRABAJO / CATEGORÍA */}
                {analiticaModo === 'categoria' && (() => {
                  const currentCatId = analiticaCatId || categorias[0]?.id || '';
                  const catActiva = categorias.find(c => c.id === currentCatId) || categorias[0];
                  const actsDeCat = actividades.filter(a => a.categoriaId === currentCatId);
                  const actsDeCatConNotas = actsDeCat
                    .map(act => ({
                      act,
                      notas: calificacionesDelTarget.filter(c => c.actividadId === act.id).map(c => c.nota),
                    }))
                    .filter(x => x.notas.length > 0);

                  const estudiantesConNotaCat = estudiantes
                    .map(est => {
                      const notas = actsDeCat
                        .map(a => getEstudianteNotaEnAct(est.id, a.id))
                        .filter((n): n is number => n !== undefined);
                      if (notas.length === 0) return null;
                      return {
                        estudiante: est,
                        nota: notas.reduce((a, b) => a + b, 0) / notas.length,
                      };
                    })
                    .filter((x): x is { estudiante: Estudiante; nota: number } => x !== null);

                  const promCatActual = estudiantesConNotaCat.length > 0
                    ? estudiantesConNotaCat.reduce((acc, curr) => acc + curr.nota, 0) / estudiantesConNotaCat.length
                    : 0;

                  return (
                    <div className="space-y-5">
                      {/* Selector de Categoría */}
                      <div className="flex gap-2 flex-wrap items-center">
                        <span className="text-xs text-slate-400 font-semibold mr-1">Seleccionar Tipo:</span>
                        {categorias.map(cat => {
                          const activa = cat.id === currentCatId;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setAnaliticaCatId(cat.id)}
                              className={`text-xs px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition ${
                                activa
                                  ? 'bg-sky-600 border-sky-500 text-white shadow'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.nombre} ({cat.pesoPorcentaje}%)
                            </button>
                          );
                        })}
                      </div>

                      {/* Métricas de la categoría seleccionada */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                          <div className="text-xs text-slate-400 mb-1">Promedio en {catActiva?.nombre}</div>
                          <div className="text-2xl font-black text-sky-400">{promCatActual.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                          <div className="text-xs text-slate-400 mb-1">Peso en el Periodo</div>
                          <div className="text-2xl font-black text-slate-100">{catActiva?.pesoPorcentaje}%</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                          <div className="text-xs text-slate-400 mb-1">Actividades de este Tipo</div>
                          <div className="text-2xl font-black text-slate-100">{actsDeCat.length}</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                          <div className="text-xs text-slate-400 mb-1">Estudiantes Evaluados</div>
                          <div className="text-2xl font-black text-slate-100">{estudiantesConNotaCat.length}</div>
                        </div>
                      </div>

                      {/* Gráficos de la categoría */}
                      {actsDeCatConNotas.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-slate-800 rounded-xl border border-slate-700">
                          Sin actividades calificadas en {catActiva?.nombre} para el Periodo {periodo}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-sm">
                            <BoxPlotChart
                              titulo={`Caja y Bigotes de Actividades en ${catActiva?.nombre}`}
                              nombresCategorias={actsDeCatConNotas.map(x => x.act.titulo.slice(0, 14) + '…')}
                              datos={actsDeCatConNotas.map(x => x.notas)}
                              minNota={config.minNota}
                              maxNota={config.maxNota}
                            />
                          </div>
                          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-sm">
                            <BarChartSimple
                              titulo={`Promedio por Estudiante en ${catActiva?.nombre}`}
                              categorias={estudiantesConNotaCat.map(e => e.estudiante.apellido)}
                              valores={estudiantesConNotaCat.map(e => Number(e.nota.toFixed(2)))}
                              color={catActiva?.color || '#38bdf8'}
                              min={config.minNota}
                              max={config.maxNota}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* VISTA 3: POR ACTIVIDAD ESPECÍFICA */}
                {analiticaModo === 'actividad' && (() => {
                  const currentActId = analiticaActId || actividades[0]?.id || '';
                  const actividadActiva = actividades.find(a => a.id === currentActId) || actividades[0];
                  const notasDeActividadActiva = actividadActiva
                    ? calificacionesDelTarget.filter(c => c.actividadId === actividadActiva.id).map(c => c.nota)
                    : [];

                  const califsActividadActiva = actividadActiva
                    ? estudiantes
                        .map(est => {
                          const cal = calificacionesDelTarget.find(
                            c => c.actividadId === actividadActiva.id && c.estudianteId === est.id
                          );
                          return cal ? { estudiante: est, nota: cal.nota } : null;
                        })
                        .filter((x): x is { estudiante: Estudiante; nota: number } => x !== null)
                    : [];

                  const promAct = notasDeActividadActiva.length > 0
                    ? notasDeActividadActiva.reduce((a, b) => a + b, 0) / notasDeActividadActiva.length
                    : 0;

                  const calcMediana = (arr: number[]): number => {
                    if (arr.length === 0) return 0;
                    const sorted = [...arr].sort((a, b) => a - b);
                    const mid = Math.floor(sorted.length / 2);
                    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
                  };

                  const medAct = calcMediana(notasDeActividadActiva);
                  const maxAct = notasDeActividadActiva.length > 0 ? Math.max(...notasDeActividadActiva) : 0;
                  const minAct = notasDeActividadActiva.length > 0 ? Math.min(...notasDeActividadActiva) : 0;

                  return (
                    <div className="space-y-5">
                      {/* Selector de Actividad */}
                      <div className="flex gap-2 flex-wrap items-center">
                        <span className="text-xs text-slate-400 font-semibold mr-1">Seleccionar Actividad:</span>
                        {actividades.map(act => {
                          const activa = act.id === (actividadActiva?.id || '');
                          return (
                            <button
                              key={act.id}
                              onClick={() => setAnaliticaActId(act.id)}
                              className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition truncate max-w-xs ${
                                activa
                                  ? 'bg-sky-600 border-sky-500 text-white shadow'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {act.titulo}
                            </button>
                          );
                        })}
                      </div>

                      {/* Métricas de la actividad seleccionada */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                          <div className="text-xs text-slate-400 mb-1">Promedio</div>
                          <div className="text-2xl font-black text-sky-400">{promAct.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                          <div className="text-xs text-slate-400 mb-1">Mediana (Q2)</div>
                          <div className="text-2xl font-black text-amber-400">{medAct.toFixed(1)}</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                          <div className="text-xs text-slate-400 mb-1">Nota Máxima</div>
                          <div className="text-2xl font-black text-emerald-400">{maxAct.toFixed(1)}</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                          <div className="text-xs text-slate-400 mb-1">Nota Mínima</div>
                          <div className="text-2xl font-black text-rose-400">{minAct.toFixed(1)}</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                          <div className="text-xs text-slate-400 mb-1">Estudiantes Calificados</div>
                          <div className="text-2xl font-black text-slate-100">
                            {califsActividadActiva.length} / {estudiantes.length}
                          </div>
                        </div>
                      </div>

                      {/* Gráficos de la actividad */}
                      {notasDeActividadActiva.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-slate-800 rounded-xl border border-slate-700">
                          Sin notas registradas para esta actividad
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-sm">
                            <BoxPlotChart
                              titulo={`Caja y Bigotes: ${actividadActiva?.titulo}`}
                              nombresCategorias={[actividadActiva?.titulo || 'Actividad']}
                              datos={[notasDeActividadActiva]}
                              minNota={config.minNota}
                              maxNota={config.maxNota}
                            />
                          </div>
                          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-sm">
                            <BarChartSimple
                              titulo={`Notas Individuales de Estudiantes`}
                              categorias={califsActividadActiva.map(c => c.estudiante.apellido)}
                              valores={califsActividadActiva.map(c => c.nota)}
                              color="#38bdf8"
                              min={config.minNota}
                              max={config.maxNota}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {actividadModal && (
        <IngresarNotasModal
          isOpen={true}
          onClose={() => {
            setActividadModal(null);
            handleRefresh();
          }}
          actividad={actividadModal}
          cursoId={curso.id}
          asignaturaId={activeAsignatura?.id}
        />
      )}

      {nuevaActividadOpen && (
        <NuevaActividadModal
          isOpen={nuevaActividadOpen}
          onClose={() => {
            setNuevaActividadOpen(false);
            setActividadParaEditar(null);
          }}
          onSaved={() => {
            setNuevaActividadOpen(false);
            setActividadParaEditar(null);
            handleRefresh();
          }}
          onDeleted={() => {
            setNuevaActividadOpen(false);
            setActividadParaEditar(null);
            handleRefresh();
          }}
          curso={{ ...curso, id: currentTargetId, periodoActual: periodo }}
          actividadParaEditar={actividadParaEditar}
        />
      )}

      {editarCursoOpen && (
        <EditarCursoModal
          isOpen={editarCursoOpen}
          onClose={() => setEditarCursoOpen(false)}
          curso={curso}
          onSaved={c => {
            onCursoUpdated(c);
            handleRefresh();
          }}
        />
      )}

      {estudianteParaEditar && (
        <EditarEstudianteModal
          isOpen={estudianteParaEditar !== null}
          estudiante={estudianteParaEditar}
          onClose={() => setEstudianteParaEditar(null)}
          onSaved={() => {
            setEstudianteParaEditar(null);
            handleRefresh();
          }}
        />
      )}

      {fichaEstudianteId && (
        <FichaEstudiante
          estudianteId={fichaEstudianteId}
          cursoId={curso.id}
          asignaturaId={activeAsignatura?.id}
          periodo={periodo}
          onClose={() => setFichaEstudianteId(null)}
          onUpdated={handleRefresh}
        />
      )}

      {estudiantesOpen && (
        <EstudiantesManager
          isOpen={estudiantesOpen}
          onClose={() => setEstudiantesOpen(false)}
          cursoFiltro={curso}
          onChanged={handleRefresh}
        />
      )}

      {evaluadorProfundoOpen && (
        <EvaluadorProfundoModal
          isOpen={evaluadorProfundoOpen}
          onClose={() => {
            setEvaluadorProfundoOpen(false);
            setActividadParaEvaluadorProfundo(null);
          }}
          actividadInicial={actividadParaEvaluadorProfundo}
          cursoInicial={curso}
          onSaved={handleRefresh}
        />
      )}
    </div>
  );
};
