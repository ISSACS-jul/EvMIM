import React, { useState, useEffect, useMemo } from 'react';
import { Actividad, Curso, EvaluacionProfundaDetalle } from '../types';
import { DatabaseService } from '../services/db';
import {
  X,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Save,
  BookOpen,
  Calendar,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Info,
} from 'lucide-react';

interface EvaluadorProfundoModalProps {
  isOpen: boolean;
  onClose: () => void;
  actividadInicial?: Actividad | null;
  cursoInicial?: Curso | null;
  onSaved?: () => void;
}

export const EvaluadorProfundoModal: React.FC<EvaluadorProfundoModalProps> = ({
  isOpen,
  onClose,
  actividadInicial,
  cursoInicial,
  onSaved,
}) => {
  const config = DatabaseService.getConfiguracion();
  const anios = DatabaseService.getAnios();
  const todosCursos = DatabaseService.getCursos();
  const todasAsignaturas = DatabaseService.getAsignaturas();

  // Estados de navegación si no viene con actividad pre-fijada
  const [selectedAnioId, setSelectedAnioId] = useState<string>(
    cursoInicial ? (cursoInicial.anioId || anios[0]?.id || '') : (anios[0]?.id || '')
  );
  const cursosDelAnio = todosCursos.filter(c => c.anioId === selectedAnioId);

  const [selectedCursoId, setSelectedCursoId] = useState<string>(
    cursoInicial ? cursoInicial.id : (cursosDelAnio[0]?.id || '')
  );
  const cursoActivo = todosCursos.find(c => c.id === selectedCursoId) || cursosDelAnio[0];

  const asignaturasDelCurso = todasAsignaturas.filter(a => a.cursoId === selectedCursoId);
  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState<string>(
    asignaturasDelCurso[0]?.id || ''
  );

  const actividadesDisponibles = DatabaseService.getActividades(
    selectedAsignaturaId || selectedCursoId
  );

  const [selectedActividadId, setSelectedActividadId] = useState<string>(
    actividadInicial?.id || actividadesDisponibles[0]?.id || ''
  );
  const actividadActiva =
    DatabaseService.getActividades().find(a => a.id === selectedActividadId) ||
    actividadInicial ||
    actividadesDisponibles[0];

  // Estudiantes del curso
  const estudiantes = useMemo(() => {
    if (!cursoActivo) return [];
    return DatabaseService.getEstudiantes(selectedAsignaturaId || cursoActivo.id);
  }, [cursoActivo?.id, selectedAsignaturaId]);

  // Modo de evaluación: 'aciertos' o 'preguntas'
  const [modo, setModo] = useState<'aciertos' | 'preguntas'>('aciertos');

  // Configuración de la prueba
  const [totalPreguntasOriginal, setTotalPreguntasOriginal] = useState<number>(20);
  const [preguntasExcluidas, setPreguntasExcluidas] = useState<number[]>([]);
  const [normalizacionActiva, setNormalizacionActiva] = useState<boolean>(false);
  const [estudianteReferenciaId, setEstudianteReferenciaId] = useState<string>('auto');
  const [bonificacionPuntos, setBonificacionPuntos] = useState<number>(0);

  // Registro de respuestas por estudiante
  // aciertosDirectos: number | respuestasPorPregunta: { [num]: boolean }
  const [aciertosPorEstudiante, setAciertosPorEstudiante] = useState<{ [estudianteId: string]: number }>({});
  const [respuestasPorPregunta, setRespuestasPorPregunta] = useState<{
    [estudianteId: string]: { [preguntaNum: number]: boolean };
  }>({});

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Cargar borrador previo si existe para esta actividad
  useEffect(() => {
    if (actividadActiva) {
      const guardado = DatabaseService.getEvaluacionProfunda(actividadActiva.id);
      if (guardado) {
        setModo(guardado.modo);
        setTotalPreguntasOriginal(guardado.totalPreguntasOriginal || 20);
        setPreguntasExcluidas(guardado.preguntasExcluidas || []);
        setNormalizacionActiva(Boolean(guardado.normalizacionActiva));
        setEstudianteReferenciaId(guardado.estudianteReferenciaId || 'auto');
        setBonificacionPuntos(guardado.bonificacionPuntos || 0);

        const aciertosMap: { [id: string]: number } = {};
        const respuestasMap: { [id: string]: { [num: number]: boolean } } = {};

        for (const [eId, datos] of Object.entries(guardado.estudiantesDatos || {})) {
          if (datos.aciertosDirectos !== undefined) aciertosMap[eId] = datos.aciertosDirectos;
          if (datos.respuestasPorPregunta) respuestasMap[eId] = datos.respuestasPorPregunta;
        }

        setAciertosPorEstudiante(aciertosMap);
        setRespuestasPorPregunta(respuestasMap);
      } else {
        // Inicializar aciertos desde calificaciones existentes si las hay
        const calificacionesExistentes = DatabaseService.getCalificaciones(actividadActiva.id);
        if (calificacionesExistentes.length > 0) {
          const map: { [id: string]: number } = {};
          calificacionesExistentes.forEach(c => {
            // Estimar aciertos inversamente: (nota - min) / (max - min) * 20
            const ratio = (c.nota - config.minNota) / (config.maxNota - config.minNota);
            map[c.estudianteId] = Math.round(Math.max(0, Math.min(20, ratio * 20)));
          });
          setAciertosPorEstudiante(map);
        }
      }
    }
  }, [actividadActiva?.id]);

  // Preguntas activas (no excluidas)
  const totalPreguntasEvaluadas = Math.max(
    1,
    totalPreguntasOriginal - preguntasExcluidas.filter(p => p <= totalPreguntasOriginal).length
  );

  // Toggle excluir pregunta
  const toggleExcluirPregunta = (preguntaNum: number) => {
    setPreguntasExcluidas(prev =>
      prev.includes(preguntaNum) ? prev.filter(p => p !== preguntaNum) : [...prev, preguntaNum]
    );
  };

  // Obtener cantidad de aciertos válidos para un estudiante
  const getAciertosEstudiante = (estId: string): number => {
    if (modo === 'aciertos') {
      const raw = aciertosPorEstudiante[estId] ?? 0;
      return Math.min(raw, totalPreguntasEvaluadas);
    } else {
      const respuestas = respuestasPorPregunta[estId] || {};
      let correctas = 0;
      for (let i = 1; i <= totalPreguntasOriginal; i++) {
        if (!preguntasExcluidas.includes(i) && respuestas[i] === true) {
          correctas++;
        }
      }
      return correctas;
    }
  };

  // Identificar el estudiante de referencia para la normalización
  const mejorAciertoGrupo = useMemo(() => {
    if (estudiantes.length === 0) return 1;
    let max = 0;
    for (const est of estudiantes) {
      const aciertos = getAciertosEstudiante(est.id);
      if (aciertos > max) max = aciertos;
    }
    return max > 0 ? max : totalPreguntasEvaluadas;
  }, [estudiantes, aciertosPorEstudiante, respuestasPorPregunta, preguntasExcluidas, modo, totalPreguntasEvaluadas]);

  const aciertosReferencia = useMemo(() => {
    if (!normalizacionActiva) return totalPreguntasEvaluadas;
    if (estudianteReferenciaId === 'auto' || !estudianteReferenciaId) {
      return mejorAciertoGrupo;
    }
    const aciertosRef = getAciertosEstudiante(estudianteReferenciaId);
    return aciertosRef > 0 ? aciertosRef : mejorAciertoGrupo;
  }, [normalizacionActiva, estudianteReferenciaId, mejorAciertoGrupo, totalPreguntasEvaluadas]);

  // Fórmula matemática de cálculo:
  // Nota = ((NotaMax - NotaMin) / PreguntasEvaluadas) * Aciertos + NotaMin + Bonificacion
  const calcularNota = (estId: string): number => {
    const aciertos = getAciertosEstudiante(estId);
    const divisor = normalizacionActiva ? Math.max(1, aciertosReferencia) : Math.max(1, totalPreguntasEvaluadas);

    const notaBase = ((config.maxNota - config.minNota) / divisor) * aciertos + config.minNota;
    const notaFinal = Math.min(config.maxNota, Math.max(config.minNota, notaBase + bonificacionPuntos));

    return Number(notaFinal.toFixed(2));
  };

  // Estadísticas del grupo
  const notasCalculadas = useMemo(() => {
    return estudiantes.map(e => ({
      estudiante: e,
      aciertos: getAciertosEstudiante(e.id),
      nota: calcularNota(e.id),
    }));
  }, [estudiantes, aciertosPorEstudiante, respuestasPorPregunta, preguntasExcluidas, normalizacionActiva, aciertosReferencia, bonificacionPuntos, modo]);

  const promedioGrupo = useMemo(() => {
    if (notasCalculadas.length === 0) return 0;
    return Number((notasCalculadas.reduce((a, b) => a + b.nota, 0) / notasCalculadas.length).toFixed(2));
  }, [notasCalculadas]);

  const aprobadosCount = useMemo(() => {
    return notasCalculadas.filter(n => n.nota >= config.notaAprobatoria).length;
  }, [notasCalculadas, config.notaAprobatoria]);

  // Análisis por preguntas (para Modo Pregunta por Pregunta)
  const analisisPreguntas = useMemo(() => {
    if (modo !== 'preguntas' || estudiantes.length === 0) return [];
    const items = [];
    for (let p = 1; p <= totalPreguntasOriginal; p++) {
      const aciertos = estudiantes.filter(e => respuestasPorPregunta[e.id]?.[p] === true).length;
      const pct = Math.round((aciertos / estudiantes.length) * 100);
      const excluida = preguntasExcluidas.includes(p);
      items.push({
        numero: p,
        aciertos,
        total: estudiantes.length,
        porcentaje: pct,
        excluida,
      });
    }
    return items;
  }, [modo, totalPreguntasOriginal, estudiantes, respuestasPorPregunta, preguntasExcluidas]);

  // Marcar respuesta de una pregunta para un estudiante
  const toggleRespuestaPregunta = (estId: string, pregNum: number) => {
    setRespuestasPorPregunta(prev => {
      const estResp = { ...(prev[estId] || {}) };
      estResp[pregNum] = !estResp[pregNum];
      return { ...prev, [estId]: estResp };
    });
  };

  const marcarTodasPreguntasEstudiante = (estId: string, valor: boolean) => {
    setRespuestasPorPregunta(prev => {
      const estResp: { [n: number]: boolean } = {};
      for (let i = 1; i <= totalPreguntasOriginal; i++) {
        estResp[i] = valor;
      }
      return { ...prev, [estId]: estResp };
    });
  };

  // Guardar Borrador
  const handleGuardarBorrador = () => {
    if (!actividadActiva) return;

    const estudiantesDatos: EvaluacionProfundaDetalle['estudiantesDatos'] = {};
    for (const est of estudiantes) {
      estudiantesDatos[est.id] = {
        aciertosDirectos: aciertosPorEstudiante[est.id] || 0,
        respuestasPorPregunta: respuestasPorPregunta[est.id] || {},
        notaCalculada: calcularNota(est.id),
      };
    }

    const evaluacion: EvaluacionProfundaDetalle = {
      id: 'ep_' + actividadActiva.id,
      actividadId: actividadActiva.id,
      modo,
      totalPreguntasOriginal,
      totalPreguntasEvaluadas,
      preguntasExcluidas,
      normalizacionActiva,
      estudianteReferenciaId,
      bonificacionPuntos,
      estudiantesDatos,
      fechaModificacion: new Date().toISOString(),
    };

    DatabaseService.saveEvaluacionProfunda(evaluacion);
    setMensajeExito('¡Borrador de análisis guardado con éxito!');
    setTimeout(() => setMensajeExito(null), 2500);
  };

  // Guardar y Publicar Calificaciones en Planilla Oficial
  const handlePublicarCalificaciones = () => {
    if (!actividadActiva) return;

    // 1. Guardar estado profundo
    handleGuardarBorrador();

    // 2. Guardar en el libro de calificaciones oficial
    const lote = estudiantes.map(e => ({
      actividadId: actividadActiva.id,
      estudianteId: e.id,
      nota: calcularNota(e.id),
      observaciones: normalizacionActiva
        ? `Evaluador Profundo (${getAciertosEstudiante(e.id)}/${totalPreguntasEvaluadas} aciertos con curva normalizada)`
        : `Evaluador Profundo (${getAciertosEstudiante(e.id)}/${totalPreguntasEvaluadas} aciertos)`,
    }));

    DatabaseService.saveCalificacionesLote(lote);
    setMensajeExito('¡Calificaciones oficiales publicadas en la Planilla con éxito!');
    setTimeout(() => {
      onSaved?.();
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[94vh] flex flex-col my-auto overflow-hidden">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-sky-900 via-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Evaluador Profundo</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  Análisis & Normalización
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Calificación analítica por aciertos, reactivos pregunta por pregunta, ajuste de curvas y anulación de preguntas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notificación de éxito */}
        {mensajeExito && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Barra de Selección de Actividad */}
        <div className="bg-slate-850 px-6 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Selector de Año */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <select
                value={selectedAnioId}
                onChange={e => {
                  setSelectedAnioId(e.target.value);
                  const cursos = todosCursos.filter(c => c.anioId === e.target.value);
                  if (cursos.length > 0) setSelectedCursoId(cursos[0].id);
                }}
                className="bg-transparent text-slate-200 outline-none font-semibold cursor-pointer"
              >
                {anios.map(a => (
                  <option key={a.id} value={a.id} className="bg-slate-800 text-slate-200">
                    Año {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Curso */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-xl">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <select
                value={selectedCursoId}
                onChange={e => {
                  setSelectedCursoId(e.target.value);
                  const asigs = todasAsignaturas.filter(a => a.cursoId === e.target.value);
                  if (asigs.length > 0) setSelectedAsignaturaId(asigs[0].id);
                }}
                className="bg-transparent text-slate-200 outline-none font-semibold cursor-pointer"
              >
                {cursosDelAnio.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-800 text-slate-200">
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Asignatura */}
            {asignaturasDelCurso.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-xl">
                <span className="text-slate-400">Materia:</span>
                <select
                  value={selectedAsignaturaId}
                  onChange={e => setSelectedAsignaturaId(e.target.value)}
                  className="bg-transparent text-slate-200 outline-none font-semibold cursor-pointer"
                >
                  {asignaturasDelCurso.map(a => (
                    <option key={a.id} value={a.id} className="bg-slate-800 text-slate-200">
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector de Actividad */}
            <div className="flex items-center gap-1.5 bg-sky-950/60 border border-sky-600/60 px-3 py-1.5 rounded-xl text-sky-200">
              <span className="font-semibold text-sky-400">Actividad:</span>
              {actividadesDisponibles.length === 0 ? (
                <span className="italic text-slate-400">Sin actividades creadas</span>
              ) : (
                <select
                  value={selectedActividadId}
                  onChange={e => setSelectedActividadId(e.target.value)}
                  className="bg-transparent text-sky-100 font-bold outline-none cursor-pointer max-w-xs truncate"
                >
                  {actividadesDisponibles.map(act => (
                    <option key={act.id} value={act.id} className="bg-slate-800 text-slate-200">
                      P{act.periodo} - {act.titulo}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>{estudiantes.length} estudiantes matriculados</span>
          </div>
        </div>

        {/* Panel de Opciones y Configuración de Curva */}
        <div className="bg-slate-800/70 border-b border-slate-700/80 p-4 px-6 flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Modos de Calificación */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Modo de Ingreso:</span>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setModo('aciertos')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    modo === 'aciertos'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🔢 Total de Aciertos
                </button>
                <button
                  type="button"
                  onClick={() => setModo('preguntas')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    modo === 'preguntas'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📋 Pregunta por Pregunta
                </button>
              </div>
            </div>

            {/* Total de Preguntas Original */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-300">Total Preguntas de la Prueba:</label>
              <input
                type="number"
                min="1"
                max="100"
                value={totalPreguntasOriginal}
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setTotalPreguntasOriginal(Math.max(1, Math.min(100, val)));
                }}
                className="w-16 px-2 py-1 bg-slate-900 border border-slate-600 rounded-lg text-sm text-center text-white font-bold outline-none focus:border-sky-500"
              />
              <span className="text-xs text-slate-500">
                (Evaluadas: <b className="text-sky-400">{totalPreguntasEvaluadas}</b>
                {preguntasExcluidas.length > 0 && (
                  <span className="text-amber-400">, {preguntasExcluidas.length} anuladas</span>
                )}
                )
              </span>
            </div>

            {/* Bonificación adicional */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-300">Puntos Extra:</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={bonificacionPuntos}
                onChange={e => setBonificacionPuntos(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-slate-900 border border-slate-600 rounded-lg text-sm text-center text-white font-bold outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Ajuste de Normalización por Referencia (Curva) */}
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={normalizacionActiva}
                  onChange={e => setNormalizacionActiva(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Normalizar Notas por Estudiante de Referencia (Curva)
                </span>
                <p className="text-[11px] text-slate-400">
                  Ajusta la escala para que el mejor estudiante obtenga la nota máxima ({config.maxNota}) y escala a los demás proporcionalmente.
                </p>
              </div>
            </div>

            {normalizacionActiva && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Estudiante de Referencia:</span>
                <select
                  value={estudianteReferenciaId}
                  onChange={e => setEstudianteReferenciaId(e.target.value)}
                  className="bg-slate-800 border border-amber-500/60 text-xs text-amber-300 px-3 py-1.5 rounded-lg outline-none font-semibold cursor-pointer"
                >
                  <option value="auto">
                    ⭐ Automático: Mejor del Grupo ({mejorAciertoGrupo} aciertos)
                  </option>
                  {estudiantes.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.apellido}, {e.nombre} ({getAciertosEstudiante(e.id)} aciertos)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Resumen KPI en Vivo */}
        <div className="bg-slate-850 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs flex-wrap gap-3 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">
              Promedio Resultante: <b className="text-sky-400 text-sm">{promedioGrupo.toFixed(2)}</b>
            </span>
            <span className="text-slate-400">
              Aprobados: <b className="text-emerald-400 text-sm">{aprobadosCount}</b> de {estudiantes.length} ({estudiantes.length > 0 ? Math.round((aprobadosCount / estudiantes.length) * 100) : 0}%)
            </span>
            <span className="text-slate-400">
              Fórmula activa: <code className="text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded text-[11px] font-mono">
                (({config.maxNota} - {config.minNota}) / {normalizacionActiva ? aciertosReferencia : totalPreguntasEvaluadas}) × Aciertos + {config.minNota}
              </code>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('¿Restablecer todas las respuestas a cero?')) {
                  setAciertosPorEstudiante({});
                  setRespuestasPorPregunta({});
                }
              }}
              className="text-slate-400 hover:text-rose-300 text-xs flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" /> Limpiar Todo
            </button>
          </div>
        </div>

        {/* Contenido Central: Tablas según el Modo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {estudiantes.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-400">No hay estudiantes en este curso/materia.</p>
            </div>
          ) : modo === 'aciertos' ? (
            /* =================== MODO 1: TOTAL DE ACIERTOS =================== */
            <div className="rounded-xl border border-slate-700/80 overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-slate-300 uppercase font-bold text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Estudiante</th>
                    <th className="py-3 px-3 text-center">Código</th>
                    <th className="py-3 px-4 text-center">
                      Aciertos (de {totalPreguntasEvaluadas})
                    </th>
                    <th className="py-3 px-3 text-center">% Rendimiento</th>
                    <th className="py-3 px-4 text-center">Nota Calculada</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {estudiantes.map(est => {
                    const aciertos = aciertosPorEstudiante[est.id] ?? 0;
                    const nota = calcularNota(est.id);
                    const pct = totalPreguntasEvaluadas > 0 ? Math.round((aciertos / totalPreguntasEvaluadas) * 100) : 0;
                    const aprueba = nota >= config.notaAprobatoria;

                    return (
                      <tr key={est.id} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white text-[10px] font-bold shadow">
                              {est.nombre[0]}{est.apellido[0]}
                            </div>
                            <span>{est.apellido}, {est.nombre}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {est.codigo}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAciertosPorEstudiante(prev => ({
                                  ...prev,
                                  [est.id]: Math.max(0, (prev[est.id] ?? 0) - 1),
                                }));
                              }}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={totalPreguntasEvaluadas}
                              value={aciertosPorEstudiante[est.id] ?? ''}
                              placeholder="0"
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setAciertosPorEstudiante(prev => ({
                                  ...prev,
                                  [est.id]: Math.max(0, Math.min(totalPreguntasOriginal, val)),
                                }));
                              }}
                              className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-sm text-center font-bold text-sky-300 outline-none focus:border-sky-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setAciertosPorEstudiante(prev => ({
                                  ...prev,
                                  [est.id]: Math.min(totalPreguntasOriginal, (prev[est.id] ?? 0) + 1),
                                }));
                              }}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span className={`font-bold ${pct >= 60 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-xl text-sm font-black border ${
                              aprueba
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {nota.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              aprueba ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {aprueba ? 'Aprobado' : 'Reprobado'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* =================== MODO 2: PREGUNTA POR PREGUNTA (REACTIVOS) =================== */
            <div className="space-y-4">
              {/* Alerta de análisis pedagógico por reactivos */}
              {analisisPreguntas.some(p => !p.excluida && p.porcentaje < 30) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                      <b>Alerta Pedagógica:</b> Algunas preguntas tienen menos del 30% de aciertos en todo el grupo. Puedes hacer clic en "Anular" en la cabecera para excluirlas de la calificación sin perjudicar al grupo.
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-700/80 overflow-x-auto shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-800 text-slate-300 uppercase font-bold text-[10px] tracking-wider border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-4 min-w-[180px] sticky left-0 bg-slate-800 z-10">Estudiante</th>
                      {Array.from({ length: totalPreguntasOriginal }, (_, i) => i + 1).map(p => {
                        const excluida = preguntasExcluidas.includes(p);
                        const stat = analisisPreguntas.find(a => a.numero === p);
                        const pct = stat ? stat.porcentaje : 0;

                        return (
                          <th
                            key={p}
                            className={`py-2 px-1 text-center min-w-[48px] border-l border-slate-700/60 ${
                              excluida ? 'bg-rose-950/40 text-slate-500 line-through' : ''
                            }`}
                          >
                            <div className="text-[10px] font-bold">P{p}</div>
                            <div
                              className={`text-[9px] font-mono mt-0.5 ${
                                excluida
                                  ? 'text-slate-600'
                                  : pct >= 60
                                  ? 'text-emerald-400'
                                  : pct >= 40
                                  ? 'text-amber-400'
                                  : 'text-rose-400 font-black'
                              }`}
                            >
                              {pct}%
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleExcluirPregunta(p)}
                              className={`mt-1 text-[8px] px-1 py-0.5 rounded transition ${
                                excluida
                                  ? 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50'
                                  : 'bg-slate-700 text-slate-400 hover:text-rose-300 hover:bg-rose-950/50'
                              }`}
                              title={excluida ? 'Restaurar pregunta' : 'Anular esta pregunta para el cálculo'}
                            >
                              {excluida ? 'Activar' : 'Anular'}
                            </button>
                          </th>
                        );
                      })}
                      <th className="py-3 px-3 text-center min-w-[70px] border-l border-slate-700">Aciertos</th>
                      <th className="py-3 px-3 text-center min-w-[80px]">Nota</th>
                      <th className="py-3 px-2 text-center min-w-[70px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {estudiantes.map(est => {
                      const respuestas = respuestasPorPregunta[est.id] || {};
                      const aciertos = getAciertosEstudiante(est.id);
                      const nota = calcularNota(est.id);
                      const aprueba = nota >= config.notaAprobatoria;

                      return (
                        <tr key={est.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-4 font-semibold text-slate-200 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 truncate max-w-[200px]">
                            {est.apellido}, {est.nombre}
                          </td>

                          {Array.from({ length: totalPreguntasOriginal }, (_, i) => i + 1).map(p => {
                            const correcta = Boolean(respuestas[p]);
                            const excluida = preguntasExcluidas.includes(p);

                            return (
                              <td
                                key={p}
                                className={`py-2 px-1 text-center border-l border-slate-800 ${
                                  excluida ? 'bg-slate-900/60 opacity-40' : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  disabled={excluida}
                                  onClick={() => toggleRespuestaPregunta(est.id, p)}
                                  className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center mx-auto ${
                                    excluida
                                      ? 'text-slate-600 cursor-not-allowed'
                                      : correcta
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-sm'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-600 hover:text-slate-400 border border-slate-700/60'
                                  }`}
                                  title={excluida ? 'Pregunta anulada' : correcta ? 'Correcta' : 'Incorrecta'}
                                >
                                  {correcta ? '✓' : '—'}
                                </button>
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-3 text-center font-bold text-sky-400 border-l border-slate-800">
                            {aciertos} / {totalPreguntasEvaluadas}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black border ${
                                aprueba
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              {nota.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => marcarTodasPreguntasEstudiante(est.id, true)}
                                className="p-1 text-slate-400 hover:text-emerald-300 text-[10px] bg-slate-800 rounded"
                                title="Marcar todas correctas"
                              >
                                ✓ Todos
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Acciones y Guardado */}
        <div className="bg-slate-800/90 px-6 py-3.5 border-t border-slate-700 flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400" />
            <span>Al publicar, las notas calculadas se sincronizan de inmediato con la Planilla y Fichas.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleGuardarBorrador}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-600"
            >
              <Save className="w-3.5 h-3.5" /> Guardar Borrador
            </button>

            <button
              type="button"
              onClick={handlePublicarCalificaciones}
              className="px-5 py-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition"
            >
              <CheckCircle className="w-4 h-4" /> Aplicar y Publicar en Planilla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
