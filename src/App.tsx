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

  const [mostrarFormAnio, setMostrarFormAnio] = useState(false);
  const [nuevoAnioNombre, setNuevoAnioNombre] = useState('');
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
    if (confirm(`¿Eliminar el Año "${nombre}"? Se eliminarán todos los cursos, asignaturas y actividades asociadas a este año.`)) {
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

  /* ── Vista de curso ── */
  if (cursoSeleccionado) {
    return (
      <div className="h-screen flex flex-col bg-base-950">
        {/* Topbar breadcrumb */}
        <header className="bg-base-900 border-b border-base-600 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={() => { setCursoSeleccionado(null); refreshAll(); }}
              className="flex items-center gap-1.5 text-accent-light hover:text-white font-medium transition-colors"
            >
              <GraduationCap className="w-4 h-4" />
              Mis Cursos
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-base-500" />
            <span className="text-base-400 text-xs">{anioActualObj?.nombre || cursoSeleccionado.anio}</span>
            <ChevronRight className="w-3.5 h-3.5 text-base-500" />
            <span className="text-base-200 font-semibold">{cursoSeleccionado.nombre}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setExpedienteEstudianteId(null); setExpedienteOpen(true); }}
              className="btn-secondary text-xs py-1 px-2.5"
              title="Expediente académico"
            >
              <Award className="w-3.5 h-3.5" />
              Expediente
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 text-base-400 hover:text-base-200 hover:bg-base-700 rounded-md transition-colors"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <CursoView
            curso={cursoSeleccionado}
            onCursoUpdated={handleCursoUpdated}
            onCursoDeleted={() => { setCursoSeleccionado(null); refreshAll(); }}
          />
        </div>

        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={refreshAll} />
        <ExpedienteEstudianteModal isOpen={expedienteOpen} estudianteId={expedienteEstudianteId} onClose={() => setExpedienteOpen(false)} />
      </div>
    );
  }

  /* ── Pantalla inicio ── */
  return (
    <div className="min-h-screen bg-base-950">

      {/* Topbar */}
      <header className="bg-base-900 border-b border-base-600 px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-accent w-8 h-8 rounded-md flex items-center justify-center shadow">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base-100 text-sm leading-none tracking-tight">Evaluador</h1>
            <p className="text-xs text-base-500 leading-none mt-0.5">Gestión Académica</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setExpedienteEstudianteId(null); setExpedienteOpen(true); }}
            className="btn-secondary text-xs py-1 px-2.5"
          >
            <Award className="w-3.5 h-3.5" />
            Expediente
          </button>
          <button
            onClick={() => setEstudiantesOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-base-400 hover:text-base-200 hover:bg-base-700 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Estudiantes
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 text-base-400 hover:text-base-200 hover:bg-base-700 rounded-md transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6">

        {/* Selector de Año Lectivo */}
        <div className="mb-5 card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-base-300 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-accent-light" />
              Año Lectivo
            </div>
            {!mostrarFormAnio && (
              <button
                onClick={() => setMostrarFormAnio(true)}
                className="inline-flex items-center gap-1 text-xs text-accent-light hover:text-white transition-colors"
              >
                <Plus className="w-3 h-3" /> Nuevo año
              </button>
            )}
          </div>

          {mostrarFormAnio && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={nuevoAnioNombre}
                onChange={e => setNuevoAnioNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCrearAnio()}
                placeholder="Ej: 2026-2027"
                className="input-ide flex-1 text-xs"
                autoFocus
              />
              <button onClick={handleCrearAnio} disabled={!nuevoAnioNombre.trim()} className="btn-primary text-xs py-1 px-3">
                <Check className="w-3 h-3" /> Crear
              </button>
              <button onClick={() => setMostrarFormAnio(false)} className="text-xs text-base-400 hover:text-base-200 px-2">
                Cancelar
              </button>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {anios.map(a => {
              const activo = a.id === selectedAnioId;
              return (
                <div
                  key={a.id}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${
                    activo
                      ? 'bg-accent text-white border-accent'
                      : 'bg-base-700 border-base-600 text-base-300 hover:border-base-500'
                  }`}
                >
                  <button onClick={() => handleSeleccionarAnio(a.id)}>
                    {a.nombre}
                  </button>
                  {anios.length > 1 && (
                    <button
                      onClick={() => handleEliminarAnio(a.id, a.nombre)}
                      className={`ml-1 rounded hover:opacity-70 ${activo ? 'text-white/70' : 'text-base-500'}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Búsqueda + nuevo curso */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-base-500" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder={`Buscar en Año ${anioActualObj?.nombre || ''}…`}
              className="input-ide pl-8"
            />
          </div>
          <button
            onClick={() => setMostrarFormCurso(true)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Curso
          </button>
        </div>

        {/* Formulario nuevo curso */}
        {mostrarFormCurso && (
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-base-300">Nuevo Curso — Año {anioActualObj?.nombre}</span>
              <button onClick={() => setMostrarFormCurso(false)} className="text-base-500 hover:text-base-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoCursoNombre}
                onChange={e => setNuevoCursoNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCrearCurso()}
                placeholder="Ej: Séptimo A, Octavo, Décimo B…"
                className="input-ide flex-1"
                autoFocus
              />
              <button
                onClick={handleCrearCurso}
                disabled={!nuevoCursoNombre.trim()}
                className="btn-primary disabled:opacity-40"
              >
                Crear
              </button>
            </div>
          </div>
        )}

        {/* Encabezado lista */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-semibold text-base-500 uppercase tracking-wider">
            Cursos — {anioActualObj?.nombre}
          </span>
          <span className="text-xs text-base-500">{cursosFiltrados.length} curso(s)</span>
        </div>

        {/* Lista de cursos */}
        {cursosFiltrados.length === 0 ? (
          <div className="text-center py-16 card">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-base-600" />
            <p className="text-sm text-base-500 font-medium">
              {busqueda
                ? `Sin resultados para "${busqueda}"`
                : `No hay cursos en el Año ${anioActualObj?.nombre}`}
            </p>
            {!busqueda && (
              <p className="text-xs text-base-600 mt-1">
                Usa "+ Nuevo Curso" para agregar el primero.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {cursosFiltrados.map(curso => {
              const estudiantesCurso = DatabaseService.getEstudiantes(curso.id);
              const asignaturasCurso = DatabaseService.getAsignaturas(curso.id);
              const actividades = DatabaseService.getActividades(curso.id, curso.periodoActual);

              return (
                <div
                  key={curso.id}
                  onClick={() => setCursoSeleccionado(curso)}
                  className="flex items-center gap-3 bg-base-800 hover:bg-base-700 px-4 py-3 rounded-lg border border-base-600 hover:border-accent/50 cursor-pointer transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {curso.nombre.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base-200 group-hover:text-white transition-colors truncate text-sm">
                      {curso.nombre}
                    </div>
                    <div className="text-xs text-base-500 mt-0.5 flex flex-wrap gap-x-3">
                      <span>{estudiantesCurso.length} estudiantes</span>
                      <span>·</span>
                      <span>{asignaturasCurso.length} asignaturas</span>
                      <span>·</span>
                      <span>{actividades.length} actividades (P{curso.periodoActual})</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setCursoParaEditar(curso); }}
                      className="p-1.5 text-base-400 hover:text-accent-light hover:bg-base-600 rounded transition-colors"
                      title="Editar curso"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`¿Eliminar el curso "${curso.nombre}"?`)) {
                          DatabaseService.deleteCurso(curso.id);
                          refreshAll();
                        }
                      }}
                      className="p-1.5 text-base-400 hover:text-error hover:bg-base-600 rounded transition-colors"
                      title="Eliminar curso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ChevronRight className="w-4 h-4 text-base-600 group-hover:text-base-400 flex-shrink-0 transition-colors" />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {settingsOpen && <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={refreshAll} />}
      {estudiantesOpen && <EstudiantesManager isOpen={estudiantesOpen} onClose={() => setEstudiantesOpen(false)} onChanged={refreshAll} />}
      {cursoParaEditar && (
        <EditarCursoModal
          isOpen={Boolean(cursoParaEditar)}
          onClose={() => setCursoParaEditar(null)}
          curso={cursoParaEditar}
          onSaved={() => { setCursoParaEditar(null); refreshAll(); }}
        />
      )}
      {expedienteOpen && (
        <ExpedienteEstudianteModal
          isOpen={expedienteOpen}
          estudianteId={expedienteEstudianteId}
          onClose={() => setExpedienteOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
