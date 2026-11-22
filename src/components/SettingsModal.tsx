import React, { useState, useRef } from 'react';
import { ConfiguracionSistema, CategoriaEvaluacion } from '../types';
import { DatabaseService } from '../services/db';
import {
  Save,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Upload,
  Database,
  Paperclip,
} from 'lucide-react';

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

  const input = "w-full px-3 py-2 bg-base-950 border border-base-600 rounded-md text-sm text-base-200 focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-base-900 border border-base-600 rounded-xl shadow-modal max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5 border-b border-base-600 pb-3">
          <div>
            <h2 className="text-base font-semibold text-base-100">Parámetros del Sistema</h2>
            <p className="text-xs text-base-500 mt-0.5">Escala de notas, periodos, categorías y pesos</p>
          </div>
          <button onClick={onClose} className="text-base-500 hover:text-base-200 transition p-1 rounded hover:bg-base-700"><X className="w-4 h-4" /></button>
        </div>

        {mensaje && (
          <div className={`p-3 rounded-md mb-4 flex items-center gap-2 text-sm ${mensaje.tipo === 'ok' ? 'bg-ok/10 text-ok border border-ok/30' : 'bg-error/10 text-error border border-error/30'}`}>
            {mensaje.tipo === 'ok' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{mensaje.texto}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Escala */}
          <section className="bg-base-800 p-4 rounded-lg border border-base-600">
            <h3 className="text-xs font-semibold text-base-500 uppercase tracking-wider mb-3">1. Escala de Calificaciones</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Nota Mínima', key: 'minNota' as const },
                { label: 'Nota Aprobatoria', key: 'notaAprobatoria' as const },
                { label: 'Nota Máxima', key: 'maxNota' as const },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-base-400 block mb-1">{f.label}</label>
                  <input type="number" step="0.1" value={config[f.key]}
                    onChange={e => setConfig({ ...config, [f.key]: parseFloat(e.target.value) || 0 })}
                    className={input} />
                </div>
              ))}
            </div>
          </section>

          {/* Rangos de Desempeño */}
          <section className="bg-base-800 p-4 rounded-lg border border-base-600">
            <h3 className="text-xs font-semibold text-base-500 uppercase tracking-wider mb-2">
              2. Rangos de Desempeño (Escala Analítica)
            </h3>
            <p className="text-xs text-base-500 mb-3">
              Personaliza los límites para clasificar a los estudiantes en Bajo, Básico, Alto y Superior.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-base-950 p-3 rounded-md border border-error/30">
                <span className="text-xs font-semibold text-error block mb-1">Desempeño Bajo</span>
                <span className="text-[11px] text-base-500 block mb-2">Desde {config.minNota} hasta:</span>
                <input type="number" step="0.1"
                  value={config.rangoBajoMax !== undefined ? config.rangoBajoMax : (config.notaAprobatoria - 0.1)}
                  onChange={e => setConfig({ ...config, rangoBajoMax: parseFloat(e.target.value) || 0 })}
                  className={input} />
              </div>
              <div className="bg-base-950 p-3 rounded-md border border-warn/30">
                <span className="text-xs font-semibold text-warn block mb-1">Desempeño Básico</span>
                <span className="text-[11px] text-base-500 block mb-2">Aprobatorio hasta:</span>
                <input type="number" step="0.1"
                  value={config.rangoBasicoMax !== undefined ? config.rangoBasicoMax : 3.9}
                  onChange={e => setConfig({ ...config, rangoBasicoMax: parseFloat(e.target.value) || 0 })}
                  className={input} />
              </div>
              <div className="bg-base-950 p-3 rounded-md border border-accent/30">
                <span className="text-xs font-semibold text-accent-light block mb-1">Desempeño Alto</span>
                <span className="text-[11px] text-base-500 block mb-2">Hasta:</span>
                <input type="number" step="0.1"
                  value={config.rangoAltoMax !== undefined ? config.rangoAltoMax : 4.5}
                  onChange={e => setConfig({ ...config, rangoAltoMax: parseFloat(e.target.value) || 0 })}
                  className={input} />
              </div>
            </div>
            <div className="mt-2 text-xs text-ok font-medium bg-ok/10 border border-ok/20 p-2 rounded-md">
              ★ <b>Desempeño Superior:</b> Notas superiores a {config.rangoAltoMax !== undefined ? config.rangoAltoMax : 4.5} hasta {config.maxNota}.
            </div>
          </section>

          {/* Periodos */}
          <section className="bg-base-800 p-4 rounded-lg border border-base-600">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-base-500 uppercase tracking-wider">3. Periodos Escolares</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sumaPesosPeriodos === 100 ? 'bg-ok/10 text-ok' : 'bg-error/10 text-error'}`}>
                Suma: {sumaPesosPeriodos}% {sumaPesosPeriodos === 100 ? '✓' : '⚠'}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs text-base-400 font-medium">Cantidad:</label>
              <select
                value={config.periodosCount}
                onChange={e => handlePeriodosCountChange(parseInt(e.target.value))}
                className="bg-base-950 border border-base-600 rounded-md px-3 py-1.5 text-sm text-base-200 outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n} periodo{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {config.pesosPeriodos.map((peso, i) => (
                <div key={i} className="bg-base-950 p-2.5 rounded-md border border-base-600">
                  <span className="text-xs text-base-500 block">Periodo {i + 1} (%)</span>
                  <input type="number" value={peso}
                    onChange={e => { const p = [...config.pesosPeriodos]; p[i] = parseFloat(e.target.value) || 0; setConfig({ ...config, pesosPeriodos: p }); }}
                    className="w-full mt-1 px-2 py-1 bg-base-800 border border-base-600 rounded text-sm text-base-200 text-center outline-none" />
                </div>
              ))}
            </div>
          </section>

          {/* Categorías */}
          <section className="bg-base-800 p-4 rounded-lg border border-base-600">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-base-500 uppercase tracking-wider">4. Etiquetas y Pesos</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sumaPesosCategorias === 100 ? 'bg-ok/10 text-ok' : 'bg-error/10 text-error'}`}>
                Total: {sumaPesosCategorias}% {sumaPesosCategorias === 100 ? '✓' : '(debe ser 100%)'}
              </span>
            </div>
            <div className="space-y-2">
              {categorias.map((cat, idx) => (
                <div key={cat.id} className="flex items-center gap-2 bg-base-950 p-2.5 rounded-md border border-base-600">
                  <input type="color" value={cat.color} onChange={e => handleUpdateCategoria(idx, 'color', e.target.value)}
                    className="w-7 h-7 rounded border-none cursor-pointer flex-shrink-0 bg-transparent" />
                  <input type="text" value={cat.nombre} onChange={e => handleUpdateCategoria(idx, 'nombre', e.target.value)}
                    className="flex-1 px-2 py-1 bg-base-800 border border-base-600 rounded text-sm text-base-200 outline-none focus:ring-1 focus:ring-accent" />
                  <div className="flex items-center gap-1">
                    <input type="number" value={cat.pesoPorcentaje} onChange={e => handleUpdateCategoria(idx, 'pesoPorcentaje', parseFloat(e.target.value) || 0)}
                      className="w-14 px-2 py-1 bg-base-800 border border-base-600 rounded text-sm text-base-200 text-center outline-none" />
                    <span className="text-xs text-base-500">%</span>
                  </div>
                  <button onClick={() => { if (categorias.length > 1) setCategorias(categorias.filter((_, i) => i !== idx)); }}
                    className="text-base-600 hover:text-error transition p-1 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCategorias([...categorias, { id: 'cat_' + Date.now(), nombre: 'Nueva categoría', pesoPorcentaje: 10, color: '#388bfd' }])}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent-light hover:text-white bg-accent-subtle hover:bg-accent/20 px-3 py-1.5 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Categoría
            </button>
          </section>

          {/* Copia de Seguridad */}
          <section className="bg-base-800 p-4 rounded-lg border border-base-600">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-3.5 h-3.5 text-accent-light" />
              <h3 className="text-xs font-semibold text-base-500 uppercase tracking-wider">5. Copias de Seguridad</h3>
            </div>
            <p className="text-xs text-base-500 mb-4">
              Exporta o importa tus datos localmente para hacer respaldo.
            </p>

            {backupStatus && (
              <div className={`mb-4 p-3 rounded-md text-xs font-medium flex items-center gap-2 ${
                backupStatus.startsWith('✓') ? 'bg-ok/10 text-ok border border-ok/20' : 'bg-error/10 text-error border border-error/20'
              }`}>
                {backupStatus.startsWith('✓') ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{backupStatus}</span>
              </div>
            )}

            <input type="file" ref={fileInputRef} onChange={handleImportarFile} accept=".json,application/json" className="hidden" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button type="button" onClick={() => handleExportarBackup(false)}
                className="p-3 bg-base-950 hover:bg-base-700 border border-base-600 hover:border-accent/50 rounded-md flex items-center gap-3 transition-colors text-left group">
                <div className="w-8 h-8 rounded-md bg-accent-subtle flex items-center justify-center text-accent-light flex-shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-base-200">Exportar JSON Ligero</div>
                  <div className="text-[11px] text-base-500 mt-0.5">Sin archivos adjuntos (Recomendado)</div>
                </div>
              </button>

              <button type="button" onClick={() => handleExportarBackup(true)}
                className="p-3 bg-base-950 hover:bg-base-700 border border-base-600 hover:border-accent/50 rounded-md flex items-center gap-3 transition-colors text-left group">
                <div className="w-8 h-8 rounded-md bg-accent-subtle flex items-center justify-center text-accent-light flex-shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-base-200">Exportar JSON Completo</div>
                  <div className="text-[11px] text-base-500 mt-0.5">Incluye adjuntos en base64</div>
                </div>
              </button>

              <button type="button" onClick={handleDescargarAdjuntos}
                className="p-3 bg-base-950 hover:bg-base-700 border border-base-600 hover:border-ok/50 rounded-md flex items-center gap-3 transition-colors text-left group">
                <div className="w-8 h-8 rounded-md bg-ok/10 flex items-center justify-center text-ok flex-shrink-0">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-base-200">Exportar Adjuntos</div>
                  <div className="text-[11px] text-base-500 mt-0.5">Descarga los archivos de actividades</div>
                </div>
              </button>

              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-base-950 hover:bg-base-700 border border-base-600 hover:border-warn/50 rounded-md flex items-center gap-3 transition-colors text-left group">
                <div className="w-8 h-8 rounded-md bg-warn/10 flex items-center justify-center text-warn flex-shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-base-200">Importar / Restaurar</div>
                  <div className="text-[11px] text-base-500 mt-0.5">Cargar archivo .json de respaldo</div>
                </div>
              </button>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-base-600">
          <button onClick={onClose} className="btn-secondary text-xs">Cancelar</button>
          <button onClick={handleGuardar} className="btn-primary text-xs">
            <Save className="w-3.5 h-3.5" /> Guardar Parámetros
          </button>
        </div>
      </div>
    </div>
  );
};
