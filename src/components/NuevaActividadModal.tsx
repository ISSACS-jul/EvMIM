import React, { useState, useEffect, useRef } from 'react';
import { Actividad, Curso } from '../types';
import { DatabaseService } from '../services/db';
import { confirmarAccion } from './ConfirmModal';
import { Plus, Calendar, FileText, Paperclip, X, Save, Trash2 } from 'lucide-react';

interface NuevaActividadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (actividad: Actividad) => void;
  curso: Curso;
  actividadParaEditar?: Actividad | null;
  onDeleted?: (actividadId: string) => void;
}

export const NuevaActividadModal: React.FC<NuevaActividadModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  curso,
  actividadParaEditar,
  onDeleted,
}) => {
  const categorias = DatabaseService.getCategorias();
  const config = DatabaseService.getConfiguracion();
  const fileRef = useRef<HTMLInputElement>(null);
  const hoy = new Date().toISOString().split('T')[0];

  const esEdicion = Boolean(actividadParaEditar);

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    categoriaId: categorias[0]?.id || '',
    periodo: curso.periodoActual,
    fechaActividad: hoy,
    fechaCalificacion: hoy,
    archivoNombre: '',
    archivoBase64: '',
  });

  useEffect(() => {
    if (actividadParaEditar) {
      setForm({
        titulo: actividadParaEditar.titulo,
        descripcion: actividadParaEditar.descripcion || '',
        categoriaId: actividadParaEditar.categoriaId,
        periodo: actividadParaEditar.periodo,
        fechaActividad: actividadParaEditar.fechaActividad,
        fechaCalificacion: actividadParaEditar.fechaCalificacion,
        archivoNombre: actividadParaEditar.archivoAdjuntoNombre || '',
        archivoBase64: actividadParaEditar.archivoAdjuntoBase64 || '',
      });
    } else {
      setForm({
        titulo: '',
        descripcion: '',
        categoriaId: categorias[0]?.id || '',
        periodo: curso.periodoActual,
        fechaActividad: hoy,
        fechaCalificacion: hoy,
        archivoNombre: '',
        archivoBase64: '',
      });
    }
  }, [actividadParaEditar, curso.periodoActual, isOpen]);

  if (!isOpen) return null;

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) =>
      setForm(prev => ({
        ...prev,
        archivoNombre: file.name,
        archivoBase64: evt.target?.result as string,
      }));
    reader.readAsDataURL(file);
  };

  const handleGuardar = () => {
    if (!form.titulo.trim()) return;

    if (esEdicion && actividadParaEditar) {
      const actividadActualizada: Actividad = {
        ...actividadParaEditar,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        categoriaId: form.categoriaId,
        periodo: form.periodo,
        fechaActividad: form.fechaActividad,
        fechaCalificacion: form.fechaCalificacion,
        archivoAdjuntoNombre: form.archivoNombre || undefined,
        archivoAdjuntoBase64: form.archivoBase64 || undefined,
      };
      DatabaseService.updateActividad(actividadActualizada);
      onSaved(actividadActualizada);
    } else {
      const nueva = DatabaseService.addActividad({
        cursoId: curso.id,
        periodo: form.periodo,
        categoriaId: form.categoriaId,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        fechaActividad: form.fechaActividad,
        fechaCalificacion: form.fechaCalificacion,
        archivoAdjuntoNombre: form.archivoNombre || undefined,
        archivoAdjuntoBase64: form.archivoBase64 || undefined,
      });
      onSaved(nueva);
    }
  };

  const handleEliminar = async () => {
    if (!actividadParaEditar) return;
    const ok = await confirmarAccion({
      titulo: 'Eliminar actividad',
      mensaje: `¿Eliminar la actividad "${actividadParaEditar.titulo}"? Sus calificaciones asociadas se borrarán permanentemente.`,
    });
    if (ok) {
      DatabaseService.deleteActividad(actividadParaEditar.id);
      onDeleted?.(actividadParaEditar.id);
      onClose();
    }
  };

  const catSeleccionada = categorias.find(c => c.id === form.categoriaId);
  const inp =
    "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-start mb-5 border-b border-slate-700 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              {esEdicion ? 'Editar Actividad' : 'Nueva Actividad'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {curso.nombre} · Periodo {form.periodo}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Título *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej: Quiz #1 — Fracciones, Tarea Capítulo 3..."
              className={inp}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Etiqueta / Categoría
              </label>
              <select
                value={form.categoriaId}
                onChange={e => setForm({ ...form, categoriaId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer"
              >
                {categorias.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-800 text-slate-100">
                    {c.nombre} ({c.pesoPorcentaje}%)
                  </option>
                ))}
              </select>
              {catSeleccionada && (
                <div
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: catSeleccionada.color + '33',
                    color: catSeleccionada.color,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: catSeleccionada.color }}
                  />
                  {catSeleccionada.nombre}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Periodo</label>
              <select
                value={form.periodo}
                onChange={e => setForm({ ...form, periodo: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer"
              >
                {Array.from({ length: config.periodosCount }, (_, i) => i + 1).map(p => (
                  <option key={p} value={p} className="bg-slate-800 text-slate-100">
                    Periodo {p}
                    {p === curso.periodoActual ? ' (actual)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fecha de Actividad
              </label>
              <input
                type="date"
                value={form.fechaActividad}
                onChange={e => setForm({ ...form, fechaActividad: e.target.value })}
                className={inp}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fecha de Calificación
              </label>
              <input
                type="date"
                value={form.fechaCalificacion}
                onChange={e => setForm({ ...form, fechaCalificacion: e.target.value })}
                className={inp}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Descripción
            </label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              placeholder="Breve descripción de la actividad, temas evaluados..."
              className={inp + ' resize-none'}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1">
              <Paperclip className="w-3 h-3" /> Archivo Adjunto (Rúbrica/Guía)
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-slate-600 hover:border-sky-500 hover:bg-sky-500/5 rounded-lg px-4 py-3 text-center transition"
            >
              {form.archivoNombre ? (
                <div className="text-sm text-sky-400 flex items-center justify-center gap-2">
                  <Paperclip className="w-4 h-4" /> {form.archivoNombre}
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  Clic para seleccionar archivo (PDF, imagen...)
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleArchivoChange}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-700">
          <div>
            {esEdicion && (
              <button
                type="button"
                onClick={handleEliminar}
                className="px-3 py-2 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-sm font-medium flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" /> Borrar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 rounded-xl text-sm text-slate-400 hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={!form.titulo.trim()}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow transition"
            >
              {esEdicion ? (
                <>
                  <Save className="w-4 h-4" /> Guardar Cambios
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Crear Actividad
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
