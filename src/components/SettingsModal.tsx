import React, { useState, useRef } from 'react';
import { ConfiguracionSistema, CategoriaEvaluacion } from '../types';
import { DatabaseService } from '../services/db';
import { Save, Plus, Trash2, CheckCircle, AlertCircle, X, Download, Upload, Database, Paperclip } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [config, setConfig] = useState<ConfiguracionSistema>(DatabaseService.getConfiguracion());
  const [categorias, setCategorias] = useState<CategoriaEvaluacion[]>(DatabaseService.getCategorias());
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const sumaPesosCategorias = categorias.reduce((sum, c) => sum + Number(c.pesoPorcentaje || 0), 0);
  const sumaPesosPeriodos = config.pesosPeriodos.reduce((sum, p) => sum + Number(p || 0), 0);

  const handleUpdateCategoria = (index: number, campo: keyof CategoriaEvaluacion, valor: any) => {
    const updated = [...categorias];
    updated[index] = { ...updated[index], [campo]: valor };
    setCategorias(updated);
  };

  const handlePeriodosCountChange = (count: number) => {
    if (count < 1 || count > 6) return;
    let pesos = [...config.pesosPeriodos];
    while (pesos.length < count) pesos.push(Math.round(100 / count));
    pesos = pesos.slice(0, count);
    setConfig({ ...config, periodosCount: count, pesosPeriodos: pesos });
  };

  const handleGuardar = () => {
    if (sumaPesosCategorias !== 100) {
      setMensaje({ tipo: 'error', texto: `Los pesos de categorías deben sumar 100% (actual: ${sumaPesosCategorias}%)` });
      return;
    }
    if (sumaPesosPeriodos !== 100) {
      setMensaje({ tipo: 'error', texto: `Los pesos de periodos deben sumar 100% (actual: ${sumaPesosPeriodos}%)` });
      return;
    }
    DatabaseService.saveConfiguracion(config);
    DatabaseService.saveCategorias(categorias);
    setMensaje({ tipo: 'ok', texto: '¡Configuración guardada!' });
    setTimeout(() => { onSaved(); onClose(); }, 900);
  };

  // Exportar Copia de Seguridad (Backup)
  const handleExportarBackup = (incluirAdjuntos: boolean) => {
    try {
      const data = DatabaseService.exportarBackup(incluirAdjuntos);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const hoy = new Date().toISOString().split('T')[0];
      const tipo = incluirAdjuntos ? 'completo' : 'ligero';

      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluador-respaldo-${tipo}-${hoy}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus(`✓ Copia de seguridad (${incluirAdjuntos ? 'completa con adjuntos' : 'ligera sin base64 pesado'}) descargada.`);
      setTimeout(() => setBackupStatus(null), 3500);
    } catch (err: any) {
      setBackupStatus(`Error al exportar: ${err.message || 'desconocido'}`);
    }
  };

  // Descargar individualmente los archivos de la carpeta Adjuntos
  const handleDescargarAdjuntos = () => {
    try {
      const adjuntos = DatabaseService.getAdjuntos();
      if (adjuntos.length === 0) {
        setBackupStatus('No hay documentos ni imágenes adjuntos en las actividades actualmente.');
        setTimeout(() => setBackupStatus(null), 3000);
        return;
      }

      adjuntos.forEach((adj, idx) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = adj.base64;
          a.download = adj.nombre;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, idx * 250);
      });

      setBackupStatus(`✓ Exportando ${adjuntos.length} archivo(s) para tu carpeta local "Adjuntos".`);
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      setBackupStatus(`Error al descargar adjuntos: ${err.message || 'desconocido'}`);
    }
  };

  // Importar / Restaurar Copia de Seguridad
  const handleImportarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        if (
          confirm(
            '¿Estás seguro de que deseas importar esta copia de seguridad? Todos los datos actuales del sistema se actualizarán con los datos del archivo.'
          )
        ) {
          const res = DatabaseService.importarBackup(text);
          if (res.ok) {
            setBackupStatus(
              `✓ ${res.mensaje} (${res.count?.estudiantes || 0} estudiantes, ${res.count?.cursos || 0} cursos, ${res.count?.calificaciones || 0} calificaciones restauradas).`
            );
            setConfig(DatabaseService.getConfiguracion());
            setCategorias(DatabaseService.getCategorias());
            setTimeout(() => {
              onSaved();
            }, 1000);
          } else {
            setBackupStatus(`❌ ${res.mensaje}`);
          }
        }
      } catch (err: any) {
        setBackupStatus(`❌ Error al procesar el archivo: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // Limpiar input para permitir reimportar si es necesario
    e.target.value = '';
  };

  const input = "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-sky-500 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Parámetros del Sistema</h2>
            <p className="text-xs text-slate-500 mt-0.5">Escala de notas, periodos, categorías y pesos</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition p-1"><X className="w-5 h-5" /></button>
        </div>

        {mensaje && (
          <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 text-sm ${mensaje.tipo === 'ok' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
            {mensaje.tipo === 'ok' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span>{mensaje.texto}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Escala */}
          <section className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Escala de Calificaciones</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Nota Mínima', key: 'minNota' as const },
                { label: 'Nota Aprobatoria', key: 'notaAprobatoria' as const },
                { label: 'Nota Máxima', key: 'maxNota' as const },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-slate-500 block mb-1">{f.label}</label>
                  <input type="number" step="0.1" value={config[f.key]}
                    onChange={e => setConfig({ ...config, [f.key]: parseFloat(e.target.value) || 0 })}
                    className={input} />
                </div>
              ))}
            </div>
          </section>

          {/* Rangos de Desempeño Institucional (Bajo, Básico, Alto, Superior) */}
          <section className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              2. Rangos de Desempeño (Escala Analítica)
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Personaliza los límites para clasificar a los estudiantes en Bajo, Básico, Alto y Superior en las analíticas y gráficos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-800/80 p-3 rounded-lg border border-rose-500/30">
                <span className="text-xs font-bold text-rose-400 block mb-1">Desempeño Bajo</span>
                <span className="text-[11px] text-slate-400 block mb-2">Desde {config.minNota} hasta:</span>
                <input
                  type="number"
                  step="0.1"
                  value={config.rangoBajoMax !== undefined ? config.rangoBajoMax : (config.notaAprobatoria - 0.1)}
                  onChange={e => setConfig({ ...config, rangoBajoMax: parseFloat(e.target.value) || 0 })}
                  className={input}
                />
              </div>
              <div className="bg-slate-800/80 p-3 rounded-lg border border-amber-500/30">
                <span className="text-xs font-bold text-amber-400 block mb-1">Desempeño Básico</span>
                <span className="text-[11px] text-slate-400 block mb-2">Aprobatorio hasta:</span>
                <input
                  type="number"
                  step="0.1"
                  value={config.rangoBasicoMax !== undefined ? config.rangoBasicoMax : 3.9}
                  onChange={e => setConfig({ ...config, rangoBasicoMax: parseFloat(e.target.value) || 0 })}
                  className={input}
                />
              </div>
              <div className="bg-slate-800/80 p-3 rounded-lg border border-sky-500/30">
                <span className="text-xs font-bold text-sky-400 block mb-1">Desempeño Alto</span>
                <span className="text-[11px] text-slate-400 block mb-2">Hasta:</span>
                <input
                  type="number"
                  step="0.1"
                  value={config.rangoAltoMax !== undefined ? config.rangoAltoMax : 4.5}
                  onChange={e => setConfig({ ...config, rangoAltoMax: parseFloat(e.target.value) || 0 })}
                  className={input}
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-emerald-400/90 font-medium bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg">
              ★ <b>Desempeño Superior:</b> Abarca automáticamente notas superiores a {config.rangoAltoMax !== undefined ? config.rangoAltoMax : 4.5} hasta {config.maxNota}.
            </div>
          </section>

          {/* Periodos */}
          <section className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Periodos Escolares</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded ${sumaPesosPeriodos === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                Suma: {sumaPesosPeriodos}% {sumaPesosPeriodos === 100 ? '✓' : '⚠️'}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs text-slate-400 font-semibold">Cantidad:</label>
              <select
                value={config.periodosCount}
                onChange={e => handlePeriodosCountChange(parseInt(e.target.value))}
                className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-1.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n} className="bg-slate-800 text-slate-100">
                    {n} periodo{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {config.pesosPeriodos.map((peso, i) => (
                <div key={i} className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                  <span className="text-xs text-slate-500 block">Periodo {i + 1} (%)</span>
                  <input type="number" value={peso}
                    onChange={e => { const p = [...config.pesosPeriodos]; p[i] = parseFloat(e.target.value) || 0; setConfig({ ...config, pesosPeriodos: p }); }}
                    className="w-full mt-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 text-center outline-none" />
                </div>
              ))}
            </div>
          </section>

          {/* Categorías */}
          <section className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Etiquetas y Pesos</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded ${sumaPesosCategorias === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                Total: {sumaPesosCategorias}% {sumaPesosCategorias === 100 ? '✓' : '(debe ser 100%)'}
              </span>
            </div>
            <div className="space-y-2">
              {categorias.map((cat, idx) => (
                <div key={cat.id} className="flex items-center gap-2 bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                  <input type="color" value={cat.color} onChange={e => handleUpdateCategoria(idx, 'color', e.target.value)}
                    className="w-8 h-8 rounded border-none cursor-pointer flex-shrink-0 bg-transparent" />
                  <input type="text" value={cat.nombre} onChange={e => handleUpdateCategoria(idx, 'nombre', e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500" />
                  <div className="flex items-center gap-1">
                    <input type="number" value={cat.pesoPorcentaje} onChange={e => handleUpdateCategoria(idx, 'pesoPorcentaje', parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 text-center outline-none" />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                  <button onClick={() => { if (categorias.length > 1) setCategorias(categorias.filter((_, i) => i !== idx)); }}
                    className="text-slate-600 hover:text-rose-400 transition p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCategorias([...categorias, { id: 'cat_' + Date.now(), nombre: 'Nueva categoría', pesoPorcentaje: 10, color: '#6366f1' }])}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Agregar Categoría
            </button>
          </section>

          {/* Copia de Seguridad y Restauración */}
          <section className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-400" /> 5. Copia de Seguridad y Gestión de Archivos Adjuntos
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Exporta tus datos estructurados en formato ligero sin archivos pesados base64, respalda con adjuntos o descarga los documentos para tu carpeta local "Adjuntos".
            </p>

            {backupStatus && (
              <div
                className={`mb-3 p-2.5 rounded-lg text-xs font-medium ${
                  backupStatus.startsWith('✓')
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {backupStatus}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportarFile}
              accept=".json,application/json"
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Exportar JSON Ligero */}
              <button
                type="button"
                onClick={() => handleExportarBackup(false)}
                className="h-full min-h-[72px] p-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-sky-500 rounded-xl flex items-center gap-3 transition text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition flex-shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-sky-300">
                    Exportar JSON Ligero
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">BD completa sin archivos pesados (Recomendado)</div>
                </div>
              </button>

              {/* Exportar JSON Completo */}
              <button
                type="button"
                onClick={() => handleExportarBackup(true)}
                className="h-full min-h-[72px] p-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-sky-500 rounded-xl flex items-center gap-3 transition text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition flex-shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-sky-300">
                    Exportar JSON Completo
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Incluye adjuntos embebidos en base64</div>
                </div>
              </button>

              {/* Descargar archivos para carpeta Adjuntos */}
              <button
                type="button"
                onClick={handleDescargarAdjuntos}
                className="h-full min-h-[72px] p-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500 rounded-xl flex items-center gap-3 transition text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition flex-shrink-0">
                  <Paperclip className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">
                    Exportar Carpeta "Adjuntos"
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Descarga los documentos de actividades</div>
                </div>
              </button>

              {/* Botón Importar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-full min-h-[72px] p-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500 rounded-xl flex items-center gap-3 transition text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition flex-shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300">
                    Importar / Restaurar (.json)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Cargar respaldo de datos existente</div>
                </div>
              </button>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-700">
          <button onClick={onClose} className="px-4 py-2 border border-slate-700 rounded-xl text-sm text-slate-400 hover:bg-slate-700 transition">Cancelar</button>
          <button onClick={handleGuardar} className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow transition">
            <Save className="w-4 h-4" /> Guardar Parámetros
          </button>
        </div>
      </div>
    </div>
  );
};
