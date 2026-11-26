import React, { useState } from 'react';
import { Estudiante, Curso } from '../types';
import { DatabaseService } from '../services/db';
import { confirmarAccion } from './ConfirmModal';
import { UserPlus, Search, Trash2, X, Check, BookOpen, Plus, Edit3, Award } from 'lucide-react';
import { EditarEstudianteModal } from './EditarEstudianteModal';
import { ExpedienteEstudianteModal } from './ExpedienteEstudianteModal';

interface EstudiantesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  cursoFiltro?: Curso; // Si se pasa, muestra contexto para ese curso
  onChanged: () => void;
}

export const EstudiantesManager: React.FC<EstudiantesManagerProps> = ({
  isOpen,
  onClose,
  cursoFiltro,
  onChanged,
}) => {
  const cursos = DatabaseService.getCursos();
  const [todosEstudiantes, setTodosEstudiantes] = useState<Estudiante[]>(
    DatabaseService.getEstudiantes()
  );
  const [busqueda, setBusqueda] = useState('');
  const [filtroCursoId, setFiltroCursoId] = useState<string>(cursoFiltro ? cursoFiltro.id : 'todos');
  const [tab, setTab] = useState<'crear' | 'asignar'>('crear');

  // Form nuevo estudiante
  const [formNombre, setFormNombre] = useState('');
  const [formApellido, setFormApellido] = useState('');
  const [formCodigo, setFormCodigo] = useState('');
  const [formCursosSeleccionados, setFormCursosSeleccionados] = useState<string[]>(
    cursoFiltro ? [cursoFiltro.id] : []
  );
  const [exito, setExito] = useState(false);

  // Estado para editar estudiante existente
  const [estudianteEditando, setEstudianteEditando] = useState<Estudiante | null>(null);
  const [expedienteEstudianteId, setExpedienteEstudianteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const refresh = () => {
    setTodosEstudiantes(DatabaseService.getEstudiantes());
    onChanged();
  };

  const toggleCursoEnForm = (cursoId: string) => {
    setFormCursosSeleccionados(prev =>
      prev.includes(cursoId) ? prev.filter(id => id !== cursoId) : [...prev, cursoId]
    );
  };

  const handleSeleccionarTodosCursos = () => {
    setFormCursosSeleccionados(cursos.map(c => c.id));
  };

  const handleLimpiarCursosForm = () => {
    setFormCursosSeleccionados([]);
  };

  const handleCrear = () => {
    if (!formNombre.trim() || !formApellido.trim()) return;
    DatabaseService.addEstudiante({
      nombre: formNombre.trim(),
      apellido: formApellido.trim(),
      codigo: formCodigo.trim() || `EST-${Date.now().toString().slice(-4)}`,
      cursoIds: formCursosSeleccionados,
    });
    setFormNombre('');
    setFormApellido('');
    setFormCodigo('');
    setFormCursosSeleccionados(cursoFiltro ? [cursoFiltro.id] : []);
    setExito(true);
    setTimeout(() => setExito(false), 1500);
    refresh();
  };

  const iniciarEdicion = (est: Estudiante) => {
    setEstudianteEditando(est);
  };

  const handleEliminar = async (id: string) => {
    const ok = await confirmarAccion({
      titulo: 'Eliminar estudiante',
      mensaje: '¿Eliminar este estudiante del sistema? Sus notas en todos los cursos se perderán.',
    });
    if (!ok) return;
    DatabaseService.deleteEstudiante(id);
    refresh();
  };

  const handleAgregarCurso = (estudianteId: string, cursoId: string) => {
    if (!cursoId) return;
    DatabaseService.agregarCursoEstudiante(estudianteId, cursoId);
    refresh();
  };

  const handleRemoverCurso = (estudianteId: string, cursoId: string) => {
    DatabaseService.removerCursoEstudiante(estudianteId, cursoId);
    refresh();
  };

  // Filtrado de estudiantes
  const estudiantesFiltrados = todosEstudiantes.filter(e => {
    const q = busqueda.toLowerCase();
    const coincideTexto =
      e.nombre.toLowerCase().includes(q) ||
      e.apellido.toLowerCase().includes(q) ||
      e.codigo.toLowerCase().includes(q);

    if (!coincideTexto) return false;

    if (filtroCursoId === 'todos') return true;
    if (filtroCursoId === 'sin_curso') {
      return !e.cursoIds || e.cursoIds.length === 0;
    }
    return e.cursoIds && e.cursoIds.includes(filtroCursoId);
  });

  const sinCurso = todosEstudiantes.filter(e => !e.cursoIds || e.cursoIds.length === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Gestión de Estudiantes</h2>
            {cursoFiltro && (
              <p className="text-xs text-slate-400 mt-0.5">
                Viendo desde: <span className="text-sky-400 font-semibold">{cursoFiltro.nombre}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 flex-shrink-0">
          {(['crear', 'asignar'] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setEstudianteEditando(null);
              }}
              className={`flex-1 py-2.5 text-sm font-medium transition ${
                tab === t ? 'text-sky-400 border-b-2 border-sky-500 font-semibold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'crear' ? '+ Crear Estudiante' : '📋 Lista y Asignación de Cursos'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* TAB: CREAR */}
          {tab === 'crear' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={formNombre}
                    onChange={e => setFormNombre(e.target.value)}
                    placeholder="Ej: Ana Sofía"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Apellido *</label>
                  <input
                    type="text"
                    value={formApellido}
                    onChange={e => setFormApellido(e.target.value)}
                    placeholder="Ej: Gómez Ruiz"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Código (opcional)</label>
                <input
                  type="text"
                  value={formCodigo}
                  onChange={e => setFormCodigo(e.target.value)}
                  placeholder="Ej: EST-2026-001"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              {/* Selección de uno o varios cursos */}
              <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                    Asignar a Cursos (uno o varios):
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSeleccionarTodosCursos}
                      className="text-sky-400 hover:text-sky-300 font-medium"
                    >
                      Todos
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={handleLimpiarCursosForm}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                {cursos.length === 0 ? (
                  <p className="text-xs text-slate-500">No hay cursos creados aún.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {cursos.map(c => {
                      const seleccionado = formCursosSeleccionados.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCursoEnForm(c.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                            seleccionado
                              ? 'bg-sky-600 border-sky-500 text-white shadow'
                              : 'bg-slate-700/70 border-slate-600 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {seleccionado && <Check className="w-3.5 h-3.5" />}
                          {c.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}

                <p className="text-[11px] text-slate-500 mt-2">
                  {formCursosSeleccionados.length === 0
                    ? 'El estudiante quedará sin cursos asignados (podrás inscribirlo luego).'
                    : `Inscribiendo en ${formCursosSeleccionados.length} curso(s).`}
                </p>
              </div>

              <button
                onClick={handleCrear}
                disabled={!formNombre.trim() || !formApellido.trim()}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  exito
                    ? 'bg-emerald-600 text-white'
                    : 'bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:text-slate-400 text-white shadow'
                }`}
              >
                {exito ? (
                  <>
                    <Check className="w-4 h-4" /> ¡Estudiante creado con éxito!
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Crear Estudiante
                  </>
                )}
              </button>

              {/* Alerta de estudiantes sin curso */}
              {sinCurso.length > 0 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <p className="text-xs font-semibold text-amber-400 mb-2">
                    ⚠️ {sinCurso.length} estudiante(s) sin curso asignado actualmente
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {sinCurso.map(e => (
                      <div key={e.id} className="flex items-center gap-2">
                        <span className="text-xs text-slate-300 flex-1 truncate">
                          {e.apellido}, {e.nombre}
                        </span>
                        <select
                          onChange={ev => {
                            if (ev.target.value) handleAgregarCurso(e.id, ev.target.value);
                          }}
                          className="text-xs bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-slate-100 outline-none cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" className="bg-slate-800 text-slate-100">+ Inscribir a curso...</option>
                          {cursos.map(c => (
                            <option key={c.id} value={c.id} className="bg-slate-800 text-slate-100">
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: LISTA Y ASIGNACIÓN */}
          {tab === 'asignar' && (
            <div>
              {/* Barra de búsqueda y filtros */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar estudiante por nombre o código..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div className="relative">
                  <select
                    value={filtroCursoId}
                    onChange={e => setFiltroCursoId(e.target.value)}
                    className="h-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-slate-100 focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer"
                  >
                    <option value="todos" className="bg-slate-800 text-slate-100">Todos los cursos</option>
                    {cursos.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-800 text-slate-100">
                        {c.nombre}
                      </option>
                    ))}
                    <option value="sin_curso" className="bg-slate-800 text-slate-100">Sin curso asignado ({sinCurso.length})</option>
                  </select>
                </div>
              </div>

              {estudiantesFiltrados.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No se encontraron estudiantes</p>
              ) : (
                <div className="space-y-2">
                  {estudiantesFiltrados.map(est => {
                    const cursosDelEstudiante = cursos.filter(c => est.cursoIds?.includes(c.id));
                    const cursosDisponiblesParaAgregar = cursos.filter(
                      c => !est.cursoIds?.includes(c.id)
                    );
                    const estaEnCursoFiltro = cursoFiltro && est.cursoIds?.includes(cursoFiltro.id);

                    return (
                      <div
                        key={est.id}
                        className="bg-slate-700/50 hover:bg-slate-700/80 rounded-xl p-3 border border-slate-700 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow">
                            {est.nombre[0]}
                            {est.apellido[0]}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-200 truncate">
                              {est.apellido}, {est.nombre}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">{est.codigo}</div>
                          </div>

                          {/* Botón rápido si cursoFiltro está activo y el estudiante no está en él */}
                          {cursoFiltro && !estaEnCursoFiltro && (
                            <button
                              onClick={() => handleAgregarCurso(est.id, cursoFiltro.id)}
                              className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow"
                              title={`Inscribir a ${cursoFiltro.nombre}`}
                            >
                              <Plus className="w-3.5 h-3.5" /> Inscribir aquí
                            </button>
                          )}

                          {/* Botón de ver expediente histórico general */}
                          <button
                            onClick={() => setExpedienteEstudianteId(est.id)}
                            className="text-slate-400 hover:text-sky-300 transition p-1.5 rounded-lg hover:bg-slate-600/50 flex-shrink-0"
                            title="Ver expediente e historial académico multianual"
                          >
                            <Award className="w-4 h-4 text-sky-400" />
                          </button>

                          {/* Botón de editar datos del estudiante */}
                          <button
                            onClick={() => iniciarEdicion(est)}
                            className="text-slate-400 hover:text-sky-300 transition p-1.5 rounded-lg hover:bg-slate-600/50 flex-shrink-0"
                            title="Modificar datos del estudiante"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleEliminar(est.id)}
                            className="text-slate-500 hover:text-rose-400 transition p-1.5 rounded-lg hover:bg-slate-600/50 flex-shrink-0"
                            title="Eliminar estudiante del sistema"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Cursos asignados y selector de nuevos cursos */}
                        <div className="mt-2.5 pt-2 border-t border-slate-600/40 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-medium mr-1">
                            Cursos:
                          </span>

                          {cursosDelEstudiante.length === 0 ? (
                            <span className="text-xs text-amber-400 italic">Sin cursos</span>
                          ) : (
                            cursosDelEstudiante.map(c => {
                              const anioObj = DatabaseService.getAnios().find(a => a.id === c.anioId);
                              return (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center gap-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs px-2 py-0.5 rounded-md"
                                >
                                  {anioObj && (
                                    <span className="opacity-60 text-[10px] uppercase font-bold">
                                      {anioObj.nombre}:
                                    </span>
                                  )}
                                  {c.nombre}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoverCurso(est.id, c.id)}
                                    className="text-sky-400 hover:text-rose-300 transition"
                                    title={`Quitar de ${c.nombre}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })
                          )}

                          {/* Selector para añadir a más cursos */}
                          {cursosDisponiblesParaAgregar.length > 0 && (
                            <select
                              value=""
                              onChange={e => {
                                if (e.target.value) handleAgregarCurso(est.id, e.target.value);
                              }}
                              className="text-xs bg-slate-800 hover:bg-slate-750 border border-slate-600 rounded-lg px-2 py-1 text-slate-100 outline-none cursor-pointer transition"
                            >
                              <option value="" className="bg-slate-800 text-slate-100">+ Inscribir en curso...</option>
                              {cursosDisponiblesParaAgregar.map(c => {
                                const anioObj = DatabaseService.getAnios().find(a => a.id === c.anioId);
                                return (
                                  <option key={c.id} value={c.id} className="bg-slate-800 text-slate-100">
                                    {anioObj ? `[Año ${anioObj.nombre}] ` : ''}{c.nombre}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-700 flex-shrink-0 text-xs text-slate-500 text-right">
          {todosEstudiantes.length} estudiante(s) en total en el sistema
        </div>
      </div>

      <EditarEstudianteModal
        isOpen={estudianteEditando !== null}
        estudiante={estudianteEditando}
        onClose={() => setEstudianteEditando(null)}
        onSaved={() => {
          setEstudianteEditando(null);
          refresh();
        }}
      />

      <ExpedienteEstudianteModal
        isOpen={Boolean(expedienteEstudianteId)}
        estudianteId={expedienteEstudianteId}
        onClose={() => setExpedienteEstudianteId(null)}
      />
    </div>
  );
};
