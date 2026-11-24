import React, { useState, useEffect } from 'react';
import { Curso } from '../types';
import { DatabaseService } from '../services/db';
import { Save, X, Edit3 } from 'lucide-react';

interface EditarCursoModalProps {
  isOpen: boolean;
  onClose: () => void;
  curso: Curso | null;
  onSaved: (cursoActualizado: Curso) => void;
}

export const EditarCursoModal: React.FC<EditarCursoModalProps> = ({
  isOpen,
  onClose,
  curso,
  onSaved,
}) => {
  const anios = DatabaseService.getAnios();
  const config = DatabaseService.getConfiguracion();

  const [nombre, setNombre] = useState(curso ? curso.nombre : '');
  const [anioId, setAnioId] = useState(curso?.anioId || anios[0]?.id || 'anio_2026');
  const [periodoActual, setPeriodoActual] = useState(curso?.periodoActual || 1);

  useEffect(() => {
    if (curso) {
      setNombre(curso.nombre);
      setAnioId(curso.anioId || anios[0]?.id || 'anio_2026');
      setPeriodoActual(curso.periodoActual || 1);
    }
  }, [curso]);

  if (!isOpen || !curso) return null;

  const handleGuardar = () => {
    if (!nombre.trim()) return;
    const anioObj = anios.find(a => a.id === anioId);
    const updated: Curso = {
      ...curso,
      nombre: nombre.trim(),
      anioId,
      anio: parseInt(anioObj?.nombre || '2026') || 2026,
      periodoActual,
    };
    DatabaseService.updateCurso(updated);
    onSaved(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-sky-400" /> Modificar Curso
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Nombre del Curso / Grado *</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Séptimo A, Octavo B, 10°A..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Año Lectivo</label>
              <select
                value={anioId}
                onChange={e => setAnioId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer"
              >
                {anios.map(a => (
                  <option key={a.id} value={a.id} className="bg-slate-800 text-slate-100">
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Periodo Activo</label>
              <select
                value={periodoActual}
                onChange={e => setPeriodoActual(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer"
              >
                {Array.from({ length: config.periodosCount }, (_, i) => i + 1).map(p => (
                  <option key={p} value={p} className="bg-slate-800 text-slate-100">
                    Periodo {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 rounded-xl text-sm text-slate-400 hover:bg-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!nombre.trim()}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow transition"
          >
            <Save className="w-4 h-4" /> Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};
