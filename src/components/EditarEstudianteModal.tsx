import React, { useState, useEffect } from 'react';
import { Estudiante } from '../types';
import { DatabaseService } from '../services/db';
import { X, Check, BookOpen, Save, UserCheck, AlertCircle } from 'lucide-react';

interface EditarEstudianteModalProps {
  isOpen: boolean;
  estudiante: Estudiante | null;
  onClose: () => void;
  onSaved: (est: Estudiante) => void;
}

export const EditarEstudianteModal: React.FC<EditarEstudianteModalProps> = ({
  isOpen,
  estudiante,
  onClose,
  onSaved,
}) => {
  const cursos = DatabaseService.getCursos();
  const anios = DatabaseService.getAnios();
  const todasAsignaturas = DatabaseService.getAsignaturas();

  const [nombre, setNombre] = useState(estudiante ? estudiante.nombre : '');
  const [apellido, setApellido] = useState(estudiante ? estudiante.apellido : '');
  const [codigo, setCodigo] = useState(estudiante ? estudiante.codigo : '');
  const [cursosSeleccionados, setCursosSeleccionados] = useState<string[]>(
    estudiante?.cursoIds || []
  );
  const [asignaturasSeleccionadas, setAsignaturasSeleccionadas] = useState<string[]>(
    estudiante?.asignaturaIds || []
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (estudiante) {
      setNombre(estudiante.nombre);
      setApellido(estudiante.apellido);
      setCodigo(estudiante.codigo);
      setCursosSeleccionados(estudiante.cursoIds || []);
      setAsignaturasSeleccionadas(estudiante.asignaturaIds || []);
      setError(null);
    }
  }, [estudiante]);

  if (!isOpen || !estudiante) return null;

  const toggleCurso = (cursoId: string) => {
    if (cursosSeleccionados.includes(cursoId)) {
      setCursosSeleccionados(prev => prev.filter(id => id !== cursoId));
      // También deseleccionar asignaturas de ese curso
      const asigsDelCurso = todasAsignaturas.filter(a => a.cursoId === cursoId).map(a => a.id);
      setAsignaturasSeleccionadas(prev => prev.filter(id => !asigsDelCurso.includes(id)));
    } else {
      setCursosSeleccionados(prev => [...prev, cursoId]);
      // Automáticamente seleccionar todas las asignaturas de ese curso por defecto
      const asigsDelCurso = todasAsignaturas.filter(a => a.cursoId === cursoId).map(a => a.id);
      setAsignaturasSeleccionadas(prev => Array.from(new Set([...prev, ...asigsDelCurso])));
    }
  };

  const toggleAsignatura = (asigId: string) => {
    setAsignaturasSeleccionadas(prev =>
      prev.includes(asigId) ? prev.filter(id => id !== asigId) : [...prev, asigId]
    );
  };

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim()) {
      setError('El nombre y el apellido son obligatorios');
      return;
    }

    // Reconstruir matrículas asociadas
    const matriculas = cursosSeleccionados.map(cId => {
      const c = cursos.find(x => x.id === cId);
      const anioId = c?.anioId || 'anio_2026';
      const asigsDelCurso = todasAsignaturas.filter(a => a.cursoId === cId).map(a => a.id);
      const materiasInscritas = asigsDelCurso.filter(aId => asignaturasSeleccionadas.includes(aId));
      return {
        anioId,
        cursoId: cId,
        materiaIds: materiasInscritas.length > 0 ? materiasInscritas : asigsDelCurso,
      };
    });

    const datosActualizados: Partial<Estudiante> = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      codigo: codigo.trim() || estudiante.codigo,
      cursoIds: cursosSeleccionados,
      asignaturaIds: asignaturasSeleccionadas,
      matriculas,
    };

    DatabaseService.updateEstudiante(estudiante.id, datosActualizados);

    const estudianteFinal: Estudiante = {
      ...estudiante,
      ...datosActualizados,
    };

    onSaved(estudianteFinal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full p-6 my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600/30 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Modificar Datos del Estudiante</h2>
              <p className="text-xs text-slate-400">
                Edita nombres, código y vinculación a cursos y materias
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleGuardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Nombre del estudiante"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Apellido *</label>
              <input
                type="text"
                value={apellido}
                onChange={e => setApellido(e.target.value)}
                placeholder="Apellido del estudiante"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Código / Matrícula
            </label>
            <input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              placeholder="Ej: EST-101"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>

          {/* Cursos a los que pertenece */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80">
            <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              Cursos asignados (uno o varios):
            </label>

            {cursos.length === 0 ? (
              <p className="text-xs text-slate-500">No hay cursos creados.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cursos.map(c => {
                  const anio = anios.find(a => a.id === c.anioId);
                  const seleccionado = cursosSeleccionados.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCurso(c.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition ${
                        seleccionado
                          ? 'bg-sky-600 border-sky-500 text-white shadow'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {seleccionado && <Check className="w-3.5 h-3.5" />}
                      <span>
                        {anio ? `[${anio.nombre}] ` : ''}
                        {c.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Asignaturas específicas */}
          {cursosSeleccionados.length > 0 && (
            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80 max-h-48 overflow-y-auto">
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Asignaturas / Materias inscritas:
              </label>
              <div className="space-y-2">
                {cursosSeleccionados.map(cId => {
                  const c = cursos.find(x => x.id === cId);
                  const asigsDelCurso = todasAsignaturas.filter(a => a.cursoId === cId);
                  if (asigsDelCurso.length === 0) return null;

                  return (
                    <div key={cId} className="pt-1">
                      <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-1">
                        {c?.nombre}:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {asigsDelCurso.map(a => {
                          const activa =
                            asignaturasSeleccionadas.length === 0 ||
                            asignaturasSeleccionadas.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => toggleAsignatura(a.id)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 transition ${
                                activa
                                  ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-200'
                                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                              }`}
                            >
                              {activa && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                              {a.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow flex items-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" /> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
