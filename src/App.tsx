import { useState } from 'react';
import { Curso, AnioLectivo } from './types';
import { DatabaseService } from './services/db';
import { CursoView } from './components/CursoView';
import { SettingsModal } from './components/SettingsModal';
import { EstudiantesManager } from './components/EstudiantesManager';
import { EditarCursoModal } from './components/EditarCursoModal';
import { ExpedienteEstudianteModal } from './components/ExpedienteEstudianteModal';
import {
  GraduationCap,
  Settings,
  Plus,
  Search,
  BookOpen,
  ChevronRight,
  Users,
  X,
  Trash2,
  Edit3,
  Calendar,
  Check,
  Award,
} from 'lucide-react';
import './index.css';

function App() {
  const [anios, setAnios] = useState<AnioLectivo[]>(DatabaseService.getAnios());
  const [selectedAnioId, setSelectedAnioId] = useState<string>(
    anios[0]?.id || 'anio_2026'
  );

  const [cursos, setCursos] = useState<Curso[]>(DatabaseService.getCursos(selectedAnioId));
  const [cursoSeleccionado, setCursoSeleccionado] = useState<Curso | null>(null);
  const [cursoParaEditar, setCursoParaEditar] = useState<Curso | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [estudiantesOpen, setEstudiantesOpen] = useState(false);
  const [expedienteOpen, setExpedienteOpen] = useState(false);
  const [expedienteEstudianteId, setExpedienteEstudianteId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Form nuevo año
  const [mostrarFormAnio, setMostrarFormAnio] = useState(false);
  const [nuevoAnioNombre, setNuevoAnioNombre] = useState('');

  // Form nuevo curso
  const [nuevoCursoNombre, setNuevoCursoNombre] = useState('');
  const [mostrarFormCurso, setMostrarFormCurso] = useState(false);

  const refreshAll = () => {
    const listaAnios = DatabaseService.getAnios();
    setAnios(listaAnios);

    let anioActivoId = selectedAnioId;
    if (!listaAnios.some(a => a.id === anioActivoId) && listaAnios.length > 0) {
      anioActivoId = listaAnios[0].id;
      setSelectedAnioId(anioActivoId);
    }

    setCursos(DatabaseService.getCursos(anioActivoId));
  };

  const handleSeleccionarAnio = (id: string) => {
    setSelectedAnioId(id);
    setCursos(DatabaseService.getCursos(id));
  };

  const handleCrearAnio = () => {
    if (!nuevoAnioNombre.trim()) return;
    const nuevo = DatabaseService.addAnio(nuevoAnioNombre.trim());
    setNuevoAnioNombre('');
    setMostrarFormAnio(false);
    setSelectedAnioId(nuevo.id);
    setAnios(DatabaseService.getAnios());
    setCursos(DatabaseService.getCursos(nuevo.id));
  };

  const handleEliminarAnio = (id: string, nombre: string) => {
    if (
      confirm(
        `¿Eliminar el Año "${nombre}"? Se eliminarán todos los cursos, asignaturas y actividades asociadas a este año.`
      )
    ) {
      DatabaseService.deleteAnio(id);
      refreshAll();
    }
  };

  const handleCrearCurso = () => {
    if (!nuevoCursoNombre.trim()) return;
    const nuevo = DatabaseService.addCurso(nuevoCursoNombre.trim(), selectedAnioId);
    setNuevoCursoNombre('');
    setMostrarFormCurso(false);
    refreshAll();
    setCursoSeleccionado(nuevo);
  };

  const handleCursoUpdated = (cursoActualizado: Curso) => {
    if (cursoSeleccionado?.id === cursoActualizado.id) {
      setCursoSeleccionado(cursoActualizado);
    }
    refreshAll();
  };

  const anioActualObj = anios.find(a => a.id === selectedAnioId) || anios[0];

  const cursosFiltrados = cursos.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  /* ---- Vista de un curso específico ---- */
  if (cursoSeleccionado) {
    return (
      <div className="h-screen flex flex-col bg-slate-900">
        <header className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => {
                setCursoSeleccionado(null);
                refreshAll();
              }}
              className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-medium transition"
            >
              <GraduationCap className="w-5 h-5" />
              Mis Cursos
            </button>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-slate-400 text-xs">Año {anioActualObj?.nombre || cursoSeleccionado.anio}</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-slate-200 font-semibold">{cursoSeleccionado.nombre}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setExpedienteEstudianteId(null);
                setExpedienteOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs text-sky-300 hover:text-white bg-sky-950/60 hover:bg-sky-900 border border-sky-700/60 px-3 py-1.5 rounded-xl font-semibold transition"
              title="Consultar historial académico general y expedientes"
            >
              <Award className="w-4 h-4 text-sky-400" />
              Expediente Estudiantes
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition"
              title="Configuración"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <CursoView
            curso={cursoSeleccionado}
            onCursoUpdated={handleCursoUpdated}
            onCursoDeleted={() => {
              setCursoSeleccionado(null);
              refreshAll();
            }}
          />
        </div>
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={refreshAll}
        />
        <ExpedienteEstudianteModal
          isOpen={expedienteOpen}
          estudianteId={expedienteEstudianteId}
          onClose={() => setExpedienteOpen(false)}
        />
      </div>
    );
  }

  /* ---- Pantalla inicio: lista de años y cursos ---- */
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Topbar */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-sky-600 text-white w-9 h-9 rounded-xl flex items-center justify-center shadow">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base leading-none">Evaluador</h1>
            <p className="text-xs text-slate-500 leading-none mt-0.5">Gestión Académica de Cursos y Notas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setExpedienteEstudianteId(null);
              setExpedienteOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs text-sky-300 hover:text-white bg-sky-950/60 hover:bg-sky-900 border border-sky-700/60 px-3.5 py-2 rounded-xl font-semibold transition shadow-sm"
            title="Consultar expediente general de estudiantes"
          >
            <Award className="w-4 h-4 text-sky-400" />
            Expediente General
          </button>
          <button
            onClick={() => setEstudiantesOpen(true)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-700 px-3 py-2 rounded-lg transition"
          >
            <Users className="w-4 h-4" />
            Estudiantes
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-700 px-3 py-2 rounded-lg transition"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-7">
        {/* BARRA DE SELECCIÓN Y CREACIÓN DE AÑOS LECTIVOS */}
        <div className="mb-7 bg-slate-800/80 border border-slate-700 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <Calendar className="w-4 h-4 text-sky-400" />
              Año Lectivo:
            </div>
            {!mostrarFormAnio && (
              <button
                onClick={() => setMostrarFormAnio(true)}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Crear Año
              </button>
            )}
          </div>

          {/* Formulario rápido para nuevo año */}
          {mostrarFormAnio && (
            <div className="flex gap-2 mb-3 bg-slate-700/60 p-2.5 rounded-xl border border-sky-500/50">
              <input
                type="text"
                value={nuevoAnioNombre}
                onChange={e => setNuevoAnioNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCrearAnio()}
                placeholder="Nombre del año (ej: 2026, 2027, 2026-2027)..."
                className="flex-1 px-3 py-1.5 bg-slate-800 text-xs text-slate-100 rounded-lg outline-none"
                autoFocus
              />
              <button
                onClick={handleCrearAnio}
                disabled={!nuevoAnioNombre.trim()}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Crear
              </button>
              <button
                onClick={() => setMostrarFormAnio(false)}
                className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Pestañas de Años */}
          <div className="flex gap-2 flex-wrap items-center">
            {anios.map(a => {
              const activo = a.id === selectedAnioId;
              return (
                <div
                  key={a.id}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                    activo
                      ? 'bg-sky-600 border-sky-500 text-white shadow'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <button onClick={() => handleSeleccionarAnio(a.id)}>
                    Año {a.nombre}
                  </button>

                  {anios.length > 1 && (
                    <button
                      onClick={() => handleEliminarAnio(a.id, a.nombre)}
                      className={`p-0.5 rounded hover:bg-black/20 ${
                        activo ? 'text-sky-200 hover:text-rose-200' : 'text-slate-400 hover:text-rose-400'
                      }`}
                      title={`Eliminar año ${a.nombre}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Búsqueda + botón nuevo curso */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder={`Buscar curso en Año ${anioActualObj?.nombre || ''}...`}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none shadow-sm"
            />
          </div>
          <button
            onClick={() => setMostrarFormCurso(true)}
            className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow transition"
          >
            <Plus className="w-4 h-4" /> Nuevo Curso
          </button>
        </div>

        {/* Formulario nuevo curso */}
        {mostrarFormCurso && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-5 shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-200">
                Nuevo Curso en Año {anioActualObj?.nombre}
              </h3>
              <button
                onClick={() => setMostrarFormCurso(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={nuevoCursoNombre}
                onChange={e => setNuevoCursoNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCrearCurso()}
                placeholder="Ej: Séptimo A, Octavo, Noveno, Décimo B..."
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 outline-none"
                autoFocus
              />
              <button
                onClick={handleCrearCurso}
                disabled={!nuevoCursoNombre.trim()}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-sm font-semibold transition"
              >
                Crear Curso
              </button>
            </div>
          </div>
        )}

        {/* Lista de cursos del año seleccionado */}
        <div className="mb-3 flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
          <span>Cursos / Grados — Año {anioActualObj?.nombre}</span>
          <span>{cursosFiltrados.length} curso(s)</span>
        </div>

        {cursosFiltrados.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/40 border border-slate-800 rounded-2xl text-slate-600">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-slate-500">
              {busqueda
                ? `No se encontró "${busqueda}" en este año`
                : `No hay cursos registrados en el Año ${anioActualObj?.nombre}`}
            </p>
            {!busqueda && (
              <p className="text-sm mt-1 text-slate-600">
                Crea cursos (como Séptimo, Octavo, Noveno...) con el botón "+ Nuevo Curso".
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {cursosFiltrados.map(curso => {
              const estudiantesCurso = DatabaseService.getEstudiantes(curso.id);
              const asignaturasCurso = DatabaseService.getAsignaturas(curso.id);
              const actividades = DatabaseService.getActividades(curso.id, curso.periodoActual);

              return (
                <div
                  key={curso.id}
                  onClick={() => setCursoSeleccionado(curso)}
                  className="flex items-center gap-4 bg-slate-800 hover:bg-slate-700/80 p-4 rounded-2xl border border-slate-700 hover:border-sky-700 cursor-pointer transition group shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow">
                    {curso.nombre.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-100 group-hover:text-sky-300 transition truncate text-base">
                      {curso.nombre}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>👥 {estudiantesCurso.length} estudiantes</span>
                      <span>·</span>
                      <span>📘 {asignaturasCurso.length} asignaturas</span>
                      <span>·</span>
                      <span>📝 {actividades.length} actividades (P{curso.periodoActual})</span>
                    </div>
                  </div>

                  {/* Acciones de curso: Editar y Borrar */}
                  <div className="flex items-center gap-1 pl-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setCursoParaEditar(curso);
                      }}
                      className="p-2 text-slate-400 hover:text-sky-300 hover:bg-slate-700 rounded-xl transition"
                      title="Modificar nombre y datos del curso"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `¿Eliminar el curso "${curso.nombre}"? Se perderán todas sus asignaturas, actividades y notas.`
                          )
                        ) {
                          DatabaseService.deleteCurso(curso.id);
                          refreshAll();
                        }
                      }}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-700 rounded-xl transition"
                      title="Eliminar curso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-sky-500 flex-shrink-0 transition ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={refreshAll}
      />
      <EstudiantesManager
        isOpen={estudiantesOpen}
        onClose={() => setEstudiantesOpen(false)}
        onChanged={refreshAll}
      />
      <EditarCursoModal
        isOpen={Boolean(cursoParaEditar)}
        onClose={() => setCursoParaEditar(null)}
        curso={cursoParaEditar}
        onSaved={() => {
          setCursoParaEditar(null);
          refreshAll();
        }}
      />
      <ExpedienteEstudianteModal
        isOpen={expedienteOpen}
        estudianteId={expedienteEstudianteId}
        onClose={() => setExpedienteOpen(false)}
      />
    </div>
  );
}

export default App;
