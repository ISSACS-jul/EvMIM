export interface ConfiguracionSistema {
  id: number;
  minNota: number;
  maxNota: number;
  notaAprobatoria: number;
  periodosCount: number;
  pesosPeriodos: number[]; // e.g. [25, 25, 25, 25]
  rangoBajoMax?: number; // Límite superior Desempeño Bajo (ej: 2.9)
  rangoBasicoMax?: number; // Límite superior Desempeño Básico (ej: 3.9)
  rangoAltoMax?: number; // Límite superior Desempeño Alto (ej: 4.5)
}

export interface CategoriaEvaluacion {
  id: string;
  nombre: string;
  pesoPorcentaje: number; // e.g. 20 para 20%
  color: string;
}

export interface AnioLectivo {
  id: string;
  nombre: string; // e.g. "2026", "2025" o "Año 2026"
}

export interface Curso {
  id: string;
  nombre: string; // e.g. "Séptimo A", "Octavo", "Noveno", "10°A"
  anioId: string;
  anio?: number; // Para compatibilidad
  periodoActual: number;
}

export interface Asignatura {
  id: string;
  cursoId: string; // Curso/Grado al que pertenece (ej: Séptimo)
  nombre: string; // e.g. "Matemáticas", "Física", "Lenguaje"
  periodoActual: number;
}

export interface MatriculaEstudiante {
  anioId: string;
  cursoId: string;
  materiaIds: string[]; // Asignaturas inscritas en ese curso y año
}

export interface Estudiante {
  id: string;
  codigo: string;
  nombre: string;
  apellido: string;
  matriculas?: MatriculaEstudiante[]; // Historial académico del estudiante a lo largo de los años
  cursoIds: string[]; // Cursos a los que ha pertenecido / pertenece
  asignaturaIds?: string[]; // IDs de asignaturas a las que está vinculado
  cursoId?: string; // Para compatibilidad hacia atrás
}

export interface Actividad {
  id: string;
  cursoId: string; // ID del curso o asignatura evaluada
  asignaturaId?: string; // ID específico de asignatura si aplica
  periodo: number;
  categoriaId: string;
  titulo: string;
  descripcion: string;
  fechaActividad: string;
  fechaCalificacion: string;
  archivoAdjuntoNombre?: string;
  archivoAdjuntoBase64?: string; // Para almacenar pdf/rúbrica localmente
}

export interface Calificacion {
  id: string;
  actividadId: string;
  estudianteId: string;
  nota: number;
  observaciones?: string;
}

// Interfaz enriquecida para el modelo de objeto Estudiante
export interface ResumenEstudiante {
  estudiante: Estudiante;
  cursoId?: string;
  cursoNombre?: string;
  promedioGeneral: number;
  promedioPeriodoActual: number;
  promediosPorPeriodo: { [periodo: number]: number };
  promediosPorCategoria: { [categoriaId: string]: number };
  calificacionesCount: number;
  estadoAprobacion: 'aprobado' | 'en_riesgo' | 'reprobado';
  notaNecesariaEstimada?: number; // Cuánto necesita para alcanzar la nota aprobatoria
}

// Historial y Expediente General del Estudiante (Multianual)
export interface ResumenMateriaHistorial {
  asignaturaId: string;
  asignaturaNombre: string;
  promedioFinal: number;
  promediosPeriodo: { [periodo: number]: number };
  calificacionesCount: number;
  estado: 'aprobado' | 'en_riesgo' | 'reprobado';
}

export interface HistorialAnioEstudiante {
  anioId: string;
  anioNombre: string;
  cursoId: string;
  cursoNombre: string;
  promedioAnio: number;
  materias: ResumenMateriaHistorial[];
  estado: 'aprobado' | 'en_riesgo' | 'reprobado';
}

export interface ExpedienteEstudiante {
  estudiante: Estudiante;
  promedioHistoricoGlobal: number;
  totalMateriasCursadas: number;
  aniosCursados: HistorialAnioEstudiante[];
}

// Evaluador Profundo: estructura para análisis detallado y curvas de notas
export interface EstudianteDatosEvaluacionProfunda {
  aciertosDirectos?: number;
  respuestasPorPregunta?: { [preguntaNum: number]: boolean };
  notaCalculada: number;
}

export interface EvaluacionProfundaDetalle {
  id: string;
  actividadId: string;
  modo: 'aciertos' | 'preguntas';
  totalPreguntasOriginal: number;
  totalPreguntasEvaluadas: number;
  preguntasExcluidas?: number[]; // Lista de preguntas anuladas/excluidas (1-based)
  normalizacionActiva: boolean;
  estudianteReferenciaId?: string; // ID del estudiante usado como referencia
  bonificacionPuntos?: number;
  estudiantesDatos: {
    [estudianteId: string]: EstudianteDatosEvaluacionProfunda;
  };
  fechaModificacion: string;
}

// Estructura completa para respaldo y restauración de datos
export interface BackupData {
  version: string;
  fechaExportacion: string;
  sistema: string;
  config: ConfiguracionSistema;
  categorias: CategoriaEvaluacion[];
  anios: AnioLectivo[];
  cursos: Curso[];
  asignaturas: Asignatura[];
  estudiantes: Estudiante[];
  actividades: Actividad[];
  calificaciones: Calificacion[];
  evaluacionesProfundas?: EvaluacionProfundaDetalle[];
}



