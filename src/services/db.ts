import {
  ConfiguracionSistema,
  CategoriaEvaluacion,
  AnioLectivo,
  Curso,
  Asignatura,
  Estudiante,
  Actividad,
  Calificacion,
  ResumenEstudiante,
  ExpedienteEstudiante,
  HistorialAnioEstudiante,
  ResumenMateriaHistorial,
  EvaluacionProfundaDetalle,
  BackupData,
} from '../types';

const STORAGE_KEYS = {
  CONFIG: 'evaluador_config',
  CATEGORIAS: 'evaluador_categorias',
  ANIOS: 'evaluador_anios',
  CURSOS: 'evaluador_cursos',
  ASIGNATURAS: 'evaluador_asignaturas',
  ESTUDIANTES: 'evaluador_estudiantes',
  ACTIVIDADES: 'evaluador_actividades',
  CALIFICACIONES: 'evaluador_calificaciones',
  EVALUACIONES_PROFUNDAS: 'evaluador_evaluaciones_profundas',
};

// Datos iniciales por defecto si está vacío
const DEFAULT_CONFIG: ConfiguracionSistema = {
  id: 1,
  minNota: 0.0,
  maxNota: 5.0,
  notaAprobatoria: 3.0,
  periodosCount: 4,
  pesosPeriodos: [25, 25, 25, 25],
};

const DEFAULT_CATEGORIAS: CategoriaEvaluacion[] = [
  { id: 'cat_clase', nombre: 'Trabajo en clase', pesoPorcentaje: 20, color: '#3b82f6' },
  { id: 'cat_tareas', nombre: 'Tareas', pesoPorcentaje: 15, color: '#10b981' },
  { id: 'cat_quices', nombre: 'Quices', pesoPorcentaje: 25, color: '#f59e0b' },
  { id: 'cat_auto', nombre: 'Autoevaluación', pesoPorcentaje: 10, color: '#8b5cf6' },
  { id: 'cat_final', nombre: 'Evaluación final', pesoPorcentaje: 30, color: '#ef4444' },
];

export class DatabaseService {
  private static get<T>(key: string, defaultValue: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  private static set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // --- CONFIGURACIÓN ---
  static getConfiguracion(): ConfiguracionSistema {
    return this.get<ConfiguracionSistema>(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
  }

  static saveConfiguracion(config: ConfiguracionSistema): void {
    this.set(STORAGE_KEYS.CONFIG, config);
  }

  // --- CATEGORÍAS ---
  static getCategorias(): CategoriaEvaluacion[] {
    return this.get<CategoriaEvaluacion[]>(STORAGE_KEYS.CATEGORIAS, DEFAULT_CATEGORIAS);
  }

  static saveCategorias(cats: CategoriaEvaluacion[]): void {
    this.set(STORAGE_KEYS.CATEGORIAS, cats);
  }

  // --- AÑOS LECTIVOS ---
  static getAnios(): AnioLectivo[] {
    const anios = this.get<AnioLectivo[]>(STORAGE_KEYS.ANIOS, []);
    if (anios.length === 0) {
      const demoAnios: AnioLectivo[] = [
        { id: 'anio_2026', nombre: '2026' },
      ];
      this.set(STORAGE_KEYS.ANIOS, demoAnios);
      return demoAnios;
    }
    return anios;
  }

  static addAnio(nombre: string): AnioLectivo {
    const anios = this.getAnios();
    const nuevo: AnioLectivo = {
      id: 'anio_' + Date.now(),
      nombre,
    };
    anios.push(nuevo);
    this.set(STORAGE_KEYS.ANIOS, anios);
    return nuevo;
  }

  static updateAnio(id: string, nombre: string): void {
    const anios = this.getAnios().map(a => a.id === id ? { ...a, nombre } : a);
    this.set(STORAGE_KEYS.ANIOS, anios);
  }

  static deleteAnio(id: string): void {
    const anios = this.getAnios().filter(a => a.id !== id);
    this.set(STORAGE_KEYS.ANIOS, anios);
    const cursosDelAnio = this.getCursos(id);
    for (const c of cursosDelAnio) {
      this.deleteCurso(c.id);
    }
  }

  // --- CURSOS (GRADOS / NIVELES) ---
  static getCursos(anioId?: string): Curso[] {
    let cursos = this.get<Curso[]>(STORAGE_KEYS.CURSOS, []);
    if (cursos.length === 0) {
      // Demo inicial
      const demoCursos: Curso[] = [
        { id: 'c1', nombre: 'Séptimo A', anioId: 'anio_2026', anio: 2026, periodoActual: 1 },
        { id: 'c2', nombre: 'Octavo B', anioId: 'anio_2026', anio: 2026, periodoActual: 1 },
      ];
      this.set(STORAGE_KEYS.CURSOS, demoCursos);
      return demoCursos;
    }
    // Normalizar cursos existentes que tengan anio numérico y no anioId
    cursos = cursos.map(c => {
      if (!c.anioId) {
        c.anioId = 'anio_2026';
      }
      return c;
    });
    if (anioId) {
      return cursos.filter(c => c.anioId === anioId);
    }
    return cursos;
  }

  static addCurso(nombre: string, anioIdOrNumber: string | number): Curso {
    const cursos = this.getCursos();
    const anios = this.getAnios();
    let anioId = typeof anioIdOrNumber === 'string' ? anioIdOrNumber : ('anio_' + anioIdOrNumber);
    if (!anios.some(a => a.id === anioId)) {
      if (anios.length > 0) anioId = anios[0].id;
    }
    const newCurso: Curso = {
      id: 'c_' + Date.now(),
      nombre,
      anioId,
      anio: typeof anioIdOrNumber === 'number' ? anioIdOrNumber : parseInt(anios.find(a => a.id === anioId)?.nombre || '2026') || 2026,
      periodoActual: 1,
    };
    cursos.push(newCurso);
    this.set(STORAGE_KEYS.CURSOS, cursos);
    return newCurso;
  }

  static updateCurso(curso: Curso): void {
    const cursos = this.getCursos().map(c => c.id === curso.id ? curso : c);
    this.set(STORAGE_KEYS.CURSOS, cursos);
  }

  static deleteCurso(id: string): void {
    // 1. Eliminar el curso
    const cursos = this.getCursos().filter(c => c.id !== id);
    this.set(STORAGE_KEYS.CURSOS, cursos);

    // 2. Eliminar asignaturas del curso
    const asignaturas = this.getAsignaturas(id);
    for (const a of asignaturas) {
      this.deleteAsignatura(a.id);
    }

    // 3. Desvincular el curso de todos los estudiantes
    const estudiantes = this.getEstudiantes().map(e => {
      if (e.cursoIds.includes(id)) {
        return {
          ...e,
          cursoIds: e.cursoIds.filter(cId => cId !== id),
        };
      }
      return e;
    });
    this.set(STORAGE_KEYS.ESTUDIANTES, estudiantes);

    // 4. Obtener actividades de este curso para limpiar sus notas
    const actividades = this.get<Actividad[]>(STORAGE_KEYS.ACTIVIDADES, []);
    const actividadesDelCurso = actividades.filter(a => a.cursoId === id);
    const idsActividadesDelCurso = new Set(actividadesDelCurso.map(a => a.id));

    // 5. Eliminar las actividades del curso
    const restantesActividades = actividades.filter(a => a.cursoId !== id);
    this.set(STORAGE_KEYS.ACTIVIDADES, restantesActividades);

    // 6. Eliminar calificaciones asociadas a las actividades del curso
    const calificaciones = this.get<Calificacion[]>(STORAGE_KEYS.CALIFICACIONES, []);
    const restantesCalificaciones = calificaciones.filter(c => !idsActividadesDelCurso.has(c.actividadId));
    this.set(STORAGE_KEYS.CALIFICACIONES, restantesCalificaciones);
  }

  // --- ASIGNATURAS / MATERIAS ---
  static getAsignaturas(cursoId?: string): Asignatura[] {
    let list = this.get<Asignatura[]>(STORAGE_KEYS.ASIGNATURAS, []);
    if (list.length === 0) {
      const demoAsignaturas: Asignatura[] = [
        { id: 'asig_1', cursoId: 'c1', nombre: 'Matemáticas', periodoActual: 1 },
        { id: 'asig_2', cursoId: 'c1', nombre: 'Lenguaje', periodoActual: 1 },
        { id: 'asig_3', cursoId: 'c2', nombre: 'Física', periodoActual: 1 },
      ];
      this.set(STORAGE_KEYS.ASIGNATURAS, demoAsignaturas);
      list = demoAsignaturas;
    }
    if (cursoId) {
      return list.filter(a => a.cursoId === cursoId);
    }
    return list;
  }

  static addAsignatura(cursoId: string, nombre: string): Asignatura {
    const list = this.getAsignaturas();
    const nueva: Asignatura = {
      id: 'asig_' + Date.now(),
      cursoId,
      nombre,
      periodoActual: 1,
    };
    list.push(nueva);
    this.set(STORAGE_KEYS.ASIGNATURAS, list);
    return nueva;
  }

  static updateAsignatura(asig: Asignatura): void {
    const list = this.getAsignaturas().map(a => a.id === asig.id ? asig : a);
    this.set(STORAGE_KEYS.ASIGNATURAS, list);
  }

  static deleteAsignatura(id: string): void {
    const list = this.getAsignaturas().filter(a => a.id !== id);
    this.set(STORAGE_KEYS.ASIGNATURAS, list);

    // Desvincular de estudiantes
    const estudiantes = this.getEstudiantes().map(e => ({
      ...e,
      asignaturaIds: (e.asignaturaIds || []).filter(aId => aId !== id),
    }));
    this.set(STORAGE_KEYS.ESTUDIANTES, estudiantes);

    // Eliminar actividades de esta asignatura
    const actividades = this.get<Actividad[]>(STORAGE_KEYS.ACTIVIDADES, []);
    const actividadesDeAsig = actividades.filter(a => a.asignaturaId === id || a.cursoId === id);
    const idsActs = new Set(actividadesDeAsig.map(a => a.id));

    const restantesActs = actividades.filter(a => a.asignaturaId !== id && a.cursoId !== id);
    this.set(STORAGE_KEYS.ACTIVIDADES, restantesActs);

    const calificaciones = this.get<Calificacion[]>(STORAGE_KEYS.CALIFICACIONES, []);
    const restantesCalifs = calificaciones.filter(c => !idsActs.has(c.actividadId));
    this.set(STORAGE_KEYS.CALIFICACIONES, restantesCalifs);
  }

  // --- ESTUDIANTES ---
  static getEstudiantes(cursoId?: string, anioId?: string): Estudiante[] {
    let list = this.get<Estudiante[]>(STORAGE_KEYS.ESTUDIANTES, []);
    if (list.length === 0) {
      const demoEstudiantes: Estudiante[] = [
        {
          id: 'e1',
          codigo: 'EST-101',
          nombre: 'Ana Sofía',
          apellido: 'Gómez',
          cursoIds: ['c1'],
          matriculas: [{ anioId: 'anio_2026', cursoId: 'c1', materiaIds: ['asig_1', 'asig_2'] }],
        },
        {
          id: 'e2',
          codigo: 'EST-102',
          nombre: 'Carlos Andrés',
          apellido: 'Ramírez',
          cursoIds: ['c1'],
          matriculas: [{ anioId: 'anio_2026', cursoId: 'c1', materiaIds: ['asig_1', 'asig_2'] }],
        },
        {
          id: 'e3',
          codigo: 'EST-103',
          nombre: 'Diana Marcela',
          apellido: 'Pérez',
          cursoIds: ['c1'],
          matriculas: [{ anioId: 'anio_2026', cursoId: 'c1', materiaIds: ['asig_1', 'asig_2'] }],
        },
        {
          id: 'e4',
          codigo: 'EST-104',
          nombre: 'Esteban',
          apellido: 'Morales',
          cursoIds: ['c1'],
          matriculas: [{ anioId: 'anio_2026', cursoId: 'c1', materiaIds: ['asig_1', 'asig_2'] }],
        },
        {
          id: 'e5',
          codigo: 'EST-105',
          nombre: 'Valentina',
          apellido: 'Castro',
          cursoIds: ['c1'],
          matriculas: [{ anioId: 'anio_2026', cursoId: 'c1', materiaIds: ['asig_1', 'asig_2'] }],
        },
      ];
      this.set(STORAGE_KEYS.ESTUDIANTES, demoEstudiantes);
      list = demoEstudiantes;
    }

    // Normalizar estudiantes para asegurar estructura de historial/matrículas
    const cursosList = this.get<Curso[]>(STORAGE_KEYS.CURSOS, []);
    const asignaturasList = this.get<Asignatura[]>(STORAGE_KEYS.ASIGNATURAS, []);

    list = list.map(e => {
      let cursoIds = e.cursoIds;
      if (!Array.isArray(cursoIds)) {
        cursoIds = (e as any).cursoId ? [(e as any).cursoId] : [];
      }

      let matriculas = Array.isArray(e.matriculas) ? [...e.matriculas] : [];

      // Si no tiene matrículas pero tiene cursos, reconstruir su trayectoria histórica
      if (matriculas.length === 0 && cursoIds.length > 0) {
        for (const cId of cursoIds) {
          const c = cursosList.find(x => x.id === cId);
          const anio = c?.anioId || 'anio_2026';
          const materiasCurso = asignaturasList.filter(a => a.cursoId === cId).map(a => a.id);
          const materiasInscritas = materiasCurso.filter(mId => (e.asignaturaIds || []).includes(mId));
          matriculas.push({
            anioId: anio,
            cursoId: cId,
            materiaIds: materiasInscritas.length > 0 ? materiasInscritas : materiasCurso,
          });
        }
      }

      // Asegurar sincronización bidireccional
      const allCursos = Array.from(new Set([...cursoIds, ...matriculas.map(m => m.cursoId)]));
      const allAsigs = Array.from(new Set([...(e.asignaturaIds || []), ...matriculas.flatMap(m => m.materiaIds)]));

      return {
        ...e,
        cursoIds: allCursos,
        asignaturaIds: allAsigs,
        matriculas,
      };
    });

    // Ordenar siempre alfabéticamente por apellido y luego nombre
    list.sort((a, b) => {
      const cmp = (a.apellido || '').localeCompare(b.apellido || '', 'es', { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
    });

    if (cursoId && anioId) {
      return list.filter(e =>
        e.matriculas?.some(m => m.cursoId === cursoId && m.anioId === anioId) ||
        (e.cursoIds.includes(cursoId) && (!e.matriculas || e.matriculas.length === 0))
      );
    }

    if (cursoId) {
      // Verificar si es un ID de Asignatura / Materia
      const asig = asignaturasList.find(a => a.id === cursoId);
      if (asig) {
        const estsCurso = list.filter(e => e.cursoIds.includes(asig.cursoId));
        return estsCurso.filter(
          e => !e.asignaturaIds || e.asignaturaIds.length === 0 || e.asignaturaIds.includes(asig.id)
        );
      }
      return list.filter(e => e.cursoIds.includes(cursoId));
    }

    if (anioId) {
      return list.filter(e => e.matriculas?.some(m => m.anioId === anioId));
    }

    return list;
  }

  static addEstudiante(e: Omit<Estudiante, 'id'>): Estudiante {
    const list = this.getEstudiantes();
    let cursoIds = e.cursoIds;
    if (!Array.isArray(cursoIds)) {
      cursoIds = (e as any).cursoId ? [(e as any).cursoId] : [];
    }
    const nuevo: Estudiante = {
      ...e,
      id: 'est_' + Date.now(),
      cursoIds,
      asignaturaIds: Array.isArray(e.asignaturaIds) ? e.asignaturaIds : [],
      matriculas: Array.isArray(e.matriculas) ? e.matriculas : [],
    };
    list.push(nuevo);
    this.set(STORAGE_KEYS.ESTUDIANTES, list);
    return nuevo;
  }

  static updateEstudiante(id: string, cambios: Partial<Omit<Estudiante, 'id'>>): void {
    const list = this.getEstudiantes().map(e => {
      if (e.id !== id) return e;
      const updated = { ...e, ...cambios };
      if (!Array.isArray(updated.cursoIds)) {
        updated.cursoIds = (updated as any).cursoId ? [(updated as any).cursoId] : [];
      }
      if (!Array.isArray(updated.asignaturaIds)) {
        updated.asignaturaIds = [];
      }
      if (!Array.isArray(updated.matriculas)) {
        updated.matriculas = [];
      }
      return updated;
    });
    this.set(STORAGE_KEYS.ESTUDIANTES, list);
  }

  // --- GESTIÓN DE TRAYECTORIA ACADÉMICA (ESTUDIANTE -> AÑO -> CURSO -> MATERIAS) ---
  static inscribirEstudiante(
    estudianteId: string,
    anioId: string,
    cursoId: string,
    materiaIds: string[] = []
  ): void {
    const estudiantes = this.getEstudiantes();
    const estudiante = estudiantes.find(e => e.id === estudianteId);
    if (!estudiante) return;

    let matriculas = [...(estudiante.matriculas || [])];
    const idx = matriculas.findIndex(m => m.anioId === anioId && m.cursoId === cursoId);

    if (idx >= 0) {
      matriculas[idx] = { anioId, cursoId, materiaIds };
    } else {
      matriculas.push({ anioId, cursoId, materiaIds });
    }

    const cursoIds = Array.from(new Set([...estudiante.cursoIds, cursoId]));
    const asignaturaIds = Array.from(new Set([...(estudiante.asignaturaIds || []), ...materiaIds]));

    this.updateEstudiante(estudianteId, {
      matriculas,
      cursoIds,
      asignaturaIds,
    });
  }

  static desvincularEstudiante(estudianteId: string, cursoId: string, anioId?: string): void {
    const estudiante = this.getEstudiantes().find(e => e.id === estudianteId);
    if (!estudiante) return;

    const matriculas = (estudiante.matriculas || []).filter(
      m => !(m.cursoId === cursoId && (!anioId || m.anioId === anioId))
    );
    const cursoIds = Array.from(new Set(matriculas.map(m => m.cursoId)));
    const asignaturaIds = Array.from(new Set(matriculas.flatMap(m => m.materiaIds)));

    this.updateEstudiante(estudianteId, {
      matriculas,
      cursoIds,
      asignaturaIds,
    });
  }

  static vincularMateriaEstudiante(
    estudianteId: string,
    anioId: string,
    cursoId: string,
    materiaId: string
  ): void {
    const estudiante = this.getEstudiantes().find(e => e.id === estudianteId);
    if (!estudiante) return;

    let matriculas = [...(estudiante.matriculas || [])];
    let mat = matriculas.find(m => m.cursoId === cursoId && m.anioId === anioId);
    if (!mat) {
      mat = { anioId, cursoId, materiaIds: [materiaId] };
      matriculas.push(mat);
    } else if (!mat.materiaIds.includes(materiaId)) {
      mat.materiaIds = [...mat.materiaIds, materiaId];
    }

    const cursoIds = Array.from(new Set([...estudiante.cursoIds, cursoId]));
    const asignaturaIds = Array.from(new Set([...(estudiante.asignaturaIds || []), materiaId]));

    this.updateEstudiante(estudianteId, { matriculas, cursoIds, asignaturaIds });
  }

  static desvincularMateriaEstudiante(
    estudianteId: string,
    anioId: string,
    cursoId: string,
    materiaId: string
  ): void {
    const estudiante = this.getEstudiantes().find(e => e.id === estudianteId);
    if (!estudiante) return;

    const matriculas = (estudiante.matriculas || []).map(m => {
      if (m.cursoId === cursoId && (!anioId || m.anioId === anioId)) {
        return { ...m, materiaIds: m.materiaIds.filter(id => id !== materiaId) };
      }
      return m;
    });

    const asignaturaIds = (estudiante.asignaturaIds || []).filter(id => id !== materiaId);
    this.updateEstudiante(estudianteId, { matriculas, asignaturaIds });
  }

  static agregarCursoEstudiante(estudianteId: string, cursoId: string): void {
    const curso = this.getCursos().find(c => c.id === cursoId);
    const anioId = curso?.anioId || 'anio_2026';
    const materias = this.getAsignaturas(cursoId).map(a => a.id);
    this.inscribirEstudiante(estudianteId, anioId, cursoId, materias);
  }

  static removerCursoEstudiante(estudianteId: string, cursoId: string): void {
    this.desvincularEstudiante(estudianteId, cursoId);
  }

  static vincularAsignatura(estudianteId: string, asignaturaId: string): void {
    const asig = this.getAsignaturas().find(a => a.id === asignaturaId);
    const curso = this.getCursos().find(c => c.id === asig?.cursoId);
    const anioId = curso?.anioId || 'anio_2026';
    const cursoId = asig?.cursoId || '';
    this.vincularMateriaEstudiante(estudianteId, anioId, cursoId, asignaturaId);
  }

  static desvincularAsignatura(estudianteId: string, asignaturaId: string): void {
    const asig = this.getAsignaturas().find(a => a.id === asignaturaId);
    const curso = this.getCursos().find(c => c.id === asig?.cursoId);
    const anioId = curso?.anioId || 'anio_2026';
    const cursoId = asig?.cursoId || '';
    this.desvincularMateriaEstudiante(estudianteId, anioId, cursoId, asignaturaId);
  }

  static deleteEstudiante(id: string): void {
    const list = this.getEstudiantes().filter(e => e.id !== id);
    this.set(STORAGE_KEYS.ESTUDIANTES, list);
    // Eliminar calificaciones del estudiante
    const califs = this.get<Calificacion[]>(STORAGE_KEYS.CALIFICACIONES, []).filter(c => c.estudianteId !== id);
    this.set(STORAGE_KEYS.CALIFICACIONES, califs);
  }

  // --- ACTIVIDADES ---
  static getActividades(cursoOrAsignaturaId?: string, periodo?: number): Actividad[] {
    let list = this.get<Actividad[]>(STORAGE_KEYS.ACTIVIDADES, []);
    if (cursoOrAsignaturaId) {
      const asignaturas = this.getAsignaturas();
      const asigIdsDelCurso = asignaturas.filter(a => a.cursoId === cursoOrAsignaturaId).map(a => a.id);

      list = list.filter(a =>
        a.cursoId === cursoOrAsignaturaId ||
        a.asignaturaId === cursoOrAsignaturaId ||
        asigIdsDelCurso.includes(a.cursoId) ||
        (a.asignaturaId ? asigIdsDelCurso.includes(a.asignaturaId) : false)
      );
    }
    if (periodo) list = list.filter(a => a.periodo === periodo);
    return list;
  }

  static addActividad(a: Omit<Actividad, 'id'>): Actividad {
    const list = this.get<Actividad[]>(STORAGE_KEYS.ACTIVIDADES, []);
    const nueva: Actividad = { ...a, id: 'act_' + Date.now() };
    list.push(nueva);
    this.set(STORAGE_KEYS.ACTIVIDADES, list);
    return nueva;
  }

  static updateActividad(actividad: Actividad): void {
    const list = this.get<Actividad[]>(STORAGE_KEYS.ACTIVIDADES, []).map(a =>
      a.id === actividad.id ? actividad : a
    );
    this.set(STORAGE_KEYS.ACTIVIDADES, list);
  }

  static deleteActividad(id: string): void {
    const list = this.get<Actividad[]>(STORAGE_KEYS.ACTIVIDADES, []).filter(a => a.id !== id);
    this.set(STORAGE_KEYS.ACTIVIDADES, list);
    const califs = this.get<Calificacion[]>(STORAGE_KEYS.CALIFICACIONES, []).filter(c => c.actividadId !== id);
    this.set(STORAGE_KEYS.CALIFICACIONES, califs);
  }

  // --- CALIFICACIONES ---
  static getCalificaciones(actividadId?: string): Calificacion[] {
    let list = this.get<Calificacion[]>(STORAGE_KEYS.CALIFICACIONES, []);
    if (actividadId) list = list.filter(c => c.actividadId === actividadId);
    return list;
  }

  static saveCalificacionesLote(califs: { estudianteId: string; actividadId: string; nota: number; observaciones?: string }[]): void {
    const existing = this.get<Calificacion[]>(STORAGE_KEYS.CALIFICACIONES, []);
    // Map existing by composite key
    const map = new Map<string, Calificacion>();
    for (const c of existing) {
      map.set(`${c.actividadId}_${c.estudianteId}`, c);
    }

    for (const item of califs) {
      const key = `${item.actividadId}_${item.estudianteId}`;
      const found = map.get(key);
      if (found) {
        found.nota = item.nota;
        found.observaciones = item.observaciones;
      } else {
        map.set(key, {
          id: 'cal_' + Math.random().toString(36).substring(2, 9),
          actividadId: item.actividadId,
          estudianteId: item.estudianteId,
          nota: item.nota,
          observaciones: item.observaciones,
        });
      }
    }

    this.set(STORAGE_KEYS.CALIFICACIONES, Array.from(map.values()));
  }

  // --- MODELADO ORIENTADO A OBJETOS: CÁLCULOS ESTADÍSTICOS Y PREDICTIVOS ---
  static getResumenEstudiante(estudianteId: string, cursoId?: string): ResumenEstudiante | null {
    const estudiantes = this.getEstudiantes();
    const estudiante = estudiantes.find(e => e.id === estudianteId);
    if (!estudiante) return null;

    const config = this.getConfiguracion();
    const categorias = this.getCategorias();
    const todosCursos = this.getCursos();
    const todasAsignaturas = this.getAsignaturas();

    const targetCursoId = cursoId || estudiante.cursoIds[0];
    let curso = todosCursos.find(c => c.id === targetCursoId);
    if (!curso) {
      const asig = todasAsignaturas.find(a => a.id === targetCursoId);
      if (asig) {
        curso = todosCursos.find(c => c.id === asig.cursoId);
      }
    }
    const periodoActual = curso?.periodoActual || 1;

    const actividadesCurso = targetCursoId ? this.getActividades(targetCursoId) : [];
    const todasCalificaciones = this.get<Calificacion[]>(STORAGE_KEYS.CALIFICACIONES, [])
      .filter(c => c.estudianteId === estudianteId && actividadesCurso.some(a => a.id === c.actividadId));

    const promediosPorPeriodo: { [p: number]: number } = {};
    const promediosPorCategoria: { [catId: string]: number } = {};

    // Calificaciones del periodo actual
    let sumaPonderadaPeriodoActual = 0;
    let pesoTotalEvaluadoActual = 0;

    for (const cat of categorias) {
      const actsCat = actividadesCurso.filter(a => a.periodo === periodoActual && a.categoriaId === cat.id);
      if (actsCat.length > 0) {
        const califsCat = todasCalificaciones.filter(c => actsCat.some(a => a.id === c.actividadId));
        if (califsCat.length > 0) {
          const promCat = califsCat.reduce((acc, curr) => acc + curr.nota, 0) / califsCat.length;
          promediosPorCategoria[cat.id] = Number(promCat.toFixed(2));
          sumaPonderadaPeriodoActual += promCat * (cat.pesoPorcentaje / 100);
          pesoTotalEvaluadoActual += cat.pesoPorcentaje;
        }
      }
    }

    // Promedio del periodo actual normalizado a lo calificado
    const promPeriodoActual = pesoTotalEvaluadoActual > 0
      ? Number(((sumaPonderadaPeriodoActual / (pesoTotalEvaluadoActual / 100))).toFixed(2))
      : 0;

    // Calcular periodos pasados
    for (let p = 1; p <= config.periodosCount; p++) {
      if (p === periodoActual) {
        promediosPorPeriodo[p] = promPeriodoActual;
      } else {
        const actsP = actividadesCurso.filter(a => a.periodo === p);
        const califsP = todasCalificaciones.filter(c => actsP.some(a => a.id === c.actividadId));
        promediosPorPeriodo[p] = califsP.length > 0
          ? Number((califsP.reduce((acc, cur) => acc + cur.nota, 0) / califsP.length).toFixed(2))
          : 0;
      }
    }

    // Cálculo predictivo: ¿Cuánto necesita para aprobar el periodo?
    let notaNecesaria: number | undefined = undefined;
    const pesoFaltante = 100 - pesoTotalEvaluadoActual;
    if (pesoFaltante > 0) {
      const objetivo = config.notaAprobatoria;
      // objetivo <= sumaPonderadaPeriodoActual + (notaReq * (pesoFaltante / 100))
      // notaReq = (objetivo - sumaPonderadaPeriodoActual) / (pesoFaltante / 100)
      const req = (objetivo - sumaPonderadaPeriodoActual) / (pesoFaltante / 100);
      notaNecesaria = Number(Math.max(0, req).toFixed(2));
    }

    // Estado
    let estado: 'aprobado' | 'en_riesgo' | 'reprobado' = 'aprobado';
    if (promPeriodoActual < config.notaAprobatoria) {
      estado = (notaNecesaria && notaNecesaria > config.maxNota) ? 'reprobado' : 'en_riesgo';
    }

    return {
      estudiante,
      cursoId: targetCursoId,
      cursoNombre: curso?.nombre,
      promedioGeneral: promPeriodoActual,
      promedioPeriodoActual: promPeriodoActual,
      promediosPorPeriodo,
      promediosPorCategoria,
      calificacionesCount: todasCalificaciones.length,
      estadoAprobacion: estado,
      notaNecesariaEstimada: notaNecesaria,
    };
  }

  // --- EXPEDIENTE ACADÉMICO GLOBAL (MULTIANUAL A LO LARGO DE TODOS LOS AÑOS) ---
  static getExpedienteEstudiante(estudianteId: string): ExpedienteEstudiante | null {
    const estudiantes = this.getEstudiantes();
    const estudiante = estudiantes.find(e => e.id === estudianteId);
    if (!estudiante) return null;

    const anios = this.getAnios();
    const cursos = this.getCursos();
    const asignaturas = this.getAsignaturas();
    const config = this.getConfiguracion();
    const categorias = this.getCategorias();
    const todasCalificaciones = this.get<Calificacion[]>(STORAGE_KEYS.CALIFICACIONES, [])
      .filter(c => c.estudianteId === estudianteId);

    // Identificar todos los cursos en los que ha estado matriculado el estudiante
    const cursosIds = estudiante.cursoIds || [];
    const aniosCursados: HistorialAnioEstudiante[] = [];

    for (const cId of cursosIds) {
      const curso = cursos.find(c => c.id === cId);
      if (!curso) continue;

      const anio = anios.find(a => a.id === curso.anioId) || {
        id: curso.anioId || 'anio',
        nombre: `${curso.anio || ''}`,
      };

      // Materias vinculadas al estudiante en este curso
      const materiasDelCurso = asignaturas.filter(a => a.cursoId === cId);
      const materiasInscritas = materiasDelCurso.filter(
        m =>
          !estudiante.asignaturaIds ||
          estudiante.asignaturaIds.length === 0 ||
          estudiante.asignaturaIds.includes(m.id)
      );

      const materiasResumen: ResumenMateriaHistorial[] = [];

      for (const mat of materiasInscritas.length > 0 ? materiasInscritas : materiasDelCurso) {
        const actsMat = this.getActividades(mat.id);
        const califsMat = todasCalificaciones.filter(c => actsMat.some(a => a.id === c.actividadId));

        const promediosPeriodo: { [p: number]: number } = {};
        const periodosConNota: number[] = [];

        for (let p = 1; p <= config.periodosCount; p++) {
          const actsP = actsMat.filter(a => a.periodo === p);
          let sumaP = 0;
          let pesoP = 0;

          for (const cat of categorias) {
            const actsCat = actsP.filter(a => a.categoriaId === cat.id);
            if (actsCat.length > 0) {
              const califsCat = califsMat.filter(c => actsCat.some(a => a.id === c.actividadId));
              if (califsCat.length > 0) {
                const promCat = califsCat.reduce((acc, curr) => acc + curr.nota, 0) / califsCat.length;
                sumaP += promCat * (cat.pesoPorcentaje / 100);
                pesoP += cat.pesoPorcentaje;
              }
            }
          }

          if (pesoP > 0) {
            const promPeriodo = Number((sumaP / (pesoP / 100)).toFixed(2));
            promediosPeriodo[p] = promPeriodo;
            periodosConNota.push(promPeriodo);
          } else {
            promediosPeriodo[p] = 0;
          }
        }

        const promFinalMateria =
          periodosConNota.length > 0
            ? Number((periodosConNota.reduce((a, b) => a + b, 0) / periodosConNota.length).toFixed(2))
            : 0;

        materiasResumen.push({
          asignaturaId: mat.id,
          asignaturaNombre: mat.nombre,
          promedioFinal: promFinalMateria,
          promediosPeriodo,
          calificacionesCount: califsMat.length,
          estado:
            promFinalMateria >= config.notaAprobatoria
              ? 'aprobado'
              : promFinalMateria > 0
              ? 'reprobado'
              : 'en_riesgo',
        });
      }

      // Promedio del año (promedio de las definitivas de sus materias)
      const materiasConNota = materiasResumen.filter(m => m.promedioFinal > 0);
      const promAnio =
        materiasConNota.length > 0
          ? Number(
              (
                materiasConNota.reduce((a, b) => a + b.promedioFinal, 0) / materiasConNota.length
              ).toFixed(2)
            )
          : 0;

      aniosCursados.push({
        anioId: anio.id,
        anioNombre: anio.nombre,
        cursoId: curso.id,
        cursoNombre: curso.nombre,
        promedioAnio: promAnio,
        materias: materiasResumen,
        estado:
          promAnio >= config.notaAprobatoria
            ? 'aprobado'
            : promAnio > 0
            ? 'reprobado'
            : 'en_riesgo',
      });
    }

    // Promedio histórico global
    const aniosConNota = aniosCursados.filter(a => a.promedioAnio > 0);
    const promGlobal =
      aniosConNota.length > 0
        ? Number(
            (aniosConNota.reduce((a, b) => a + b.promedioAnio, 0) / aniosConNota.length).toFixed(2)
          )
        : 0;

    const totalMaterias = aniosCursados.reduce((acc, a) => acc + a.materias.length, 0);

    return {
      estudiante,
      promedioHistoricoGlobal: promGlobal,
      totalMateriasCursadas: totalMaterias,
      aniosCursados,
    };
  }

  // --- EVALUACIONES PROFUNDAS (ANÁLISIS DE PREGUNTAS Y CURVAS) ---
  static getEvaluacionProfunda(actividadId: string): EvaluacionProfundaDetalle | null {
    const list = this.get<EvaluacionProfundaDetalle[]>(STORAGE_KEYS.EVALUACIONES_PROFUNDAS, []);
    return list.find(e => e.actividadId === actividadId) || null;
  }

  static saveEvaluacionProfunda(evaluacion: EvaluacionProfundaDetalle): void {
    const list = this.get<EvaluacionProfundaDetalle[]>(STORAGE_KEYS.EVALUACIONES_PROFUNDAS, []);
    const idx = list.findIndex(e => e.actividadId === evaluacion.actividadId);
    if (idx >= 0) {
      list[idx] = evaluacion;
    } else {
      list.push(evaluacion);
    }
    this.set(STORAGE_KEYS.EVALUACIONES_PROFUNDAS, list);
  }

  static deleteEvaluacionProfunda(actividadId: string): void {
    const list = this.get<EvaluacionProfundaDetalle[]>(STORAGE_KEYS.EVALUACIONES_PROFUNDAS, []);
    this.set(STORAGE_KEYS.EVALUACIONES_PROFUNDAS, list.filter(e => e.actividadId !== actividadId));
  }

  // --- COPIA DE SEGURIDAD Y RESTAURACIÓN (BACKUP & RESTORE) ---
  static exportarBackup(): BackupData {
    return {
      version: '0.1.0',
      fechaExportacion: new Date().toISOString(),
      sistema: 'Evaluador - Sistema de Gestión Académica',
      config: this.getConfiguracion(),
      categorias: this.getCategorias(),
      anios: this.getAnios(),
      cursos: this.getCursos(),
      asignaturas: this.getAsignaturas(),
      estudiantes: this.getEstudiantes(),
      actividades: this.get<Actividad[]>(STORAGE_KEYS.ACTIVIDADES, []),
      calificaciones: this.get<Calificacion[]>(STORAGE_KEYS.CALIFICACIONES, []),
      evaluacionesProfundas: this.get<EvaluacionProfundaDetalle[]>(STORAGE_KEYS.EVALUACIONES_PROFUNDAS, []),
    };
  }

  static importarBackup(jsonString: string): {
    ok: boolean;
    mensaje: string;
    count?: {
      anios: number;
      cursos: number;
      estudiantes: number;
      actividades: number;
      calificaciones: number;
    };
  } {
    try {
      const data = JSON.parse(jsonString);

      if (!data || typeof data !== 'object') {
        return { ok: false, mensaje: 'El archivo no contiene un JSON válido.' };
      }

      // Validar presencia mínima de colecciones
      if (!Array.isArray(data.cursos) || !Array.isArray(data.estudiantes)) {
        return {
          ok: false,
          mensaje: 'El archivo no tiene el formato de copia de seguridad de Evaluador (faltan colecciones principales).',
        };
      }

      if (data.config) this.set(STORAGE_KEYS.CONFIG, data.config);
      if (Array.isArray(data.categorias)) this.set(STORAGE_KEYS.CATEGORIAS, data.categorias);
      if (Array.isArray(data.anios)) this.set(STORAGE_KEYS.ANIOS, data.anios);
      if (Array.isArray(data.cursos)) this.set(STORAGE_KEYS.CURSOS, data.cursos);
      if (Array.isArray(data.asignaturas)) this.set(STORAGE_KEYS.ASIGNATURAS, data.asignaturas);
      if (Array.isArray(data.estudiantes)) this.set(STORAGE_KEYS.ESTUDIANTES, data.estudiantes);
      if (Array.isArray(data.actividades)) this.set(STORAGE_KEYS.ACTIVIDADES, data.actividades);
      if (Array.isArray(data.calificaciones)) this.set(STORAGE_KEYS.CALIFICACIONES, data.calificaciones);
      if (Array.isArray(data.evaluacionesProfundas)) {
        this.set(STORAGE_KEYS.EVALUACIONES_PROFUNDAS, data.evaluacionesProfundas);
      }

      return {
        ok: true,
        mensaje: 'Copia de seguridad restaurada exitosamente.',
        count: {
          anios: Array.isArray(data.anios) ? data.anios.length : 0,
          cursos: data.cursos.length,
          estudiantes: data.estudiantes.length,
          actividades: Array.isArray(data.actividades) ? data.actividades.length : 0,
          calificaciones: Array.isArray(data.calificaciones) ? data.calificaciones.length : 0,
        },
      };
    } catch (err: any) {
      return {
        ok: false,
        mensaje: `Error al procesar el archivo de respaldo: ${err.message || 'Formato inválido'}`,
      };
    }
  }
}
