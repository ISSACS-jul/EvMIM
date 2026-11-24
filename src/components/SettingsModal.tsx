import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { invoke } from '@tauri-apps/api/core';
import { ConfiguracionSistema, CategoriaEvaluacion, TemaVisual, BackupData } from '../types';
import { DatabaseService } from '../services/db';
import { TEMAS_INFO, ESCALAS_UI, aplicarTemaVisual, aplicarEscalaUI } from '../services/theme';
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
  Palette,
  Maximize2,
  Check,
  FileArchive,
  FileJson,
  Filter,
  FolderOpen,
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
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [exportEspecificaOpen, setExportEspecificaOpen] = useState(false);
  const [selectedCursoIds, setSelectedCursoIds] = useState<string[]>([]);
  const [selectedAsigIds, setSelectedAsigIds] = useState<string[]>([]);
  const [especificaConZip, setEspecificaConZip] = useState(false);
  const [pendienteImportarJson, setPendienteImportarJson] = useState<{
    jsonText: string;
    nombreArchivo: string;
    esEspecifica: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cursosDisponibles = DatabaseService.getCursos();
  const asignaturasDisponibles = DatabaseService.getAsignaturas();
  const aniosDisponibles = DatabaseService.getAnios();

  const [temaActivo, setTemaActivo] = useState<TemaVisual>(
    config.temaVisual || (localStorage.getItem('evaluador_tema_visual') as TemaVisual) || 'default'
  );
  const [escalaActiva, setEscalaActiva] = useState<number>(
    config.escalaUI || Number(localStorage.getItem('evaluador_ui_scale')) || 1
  );

  if (!isOpen) return null;

  const sumaPesosCategorias = categorias.reduce((sum, c) => sum + Number(c.pesoPorcentaje || 0), 0);
  const sumaPesosPeriodos = config.pesosPeriodos.reduce((sum, p) => sum + Number(p || 0), 0);

  const handleCambiarTema = (tema: TemaVisual) => {
    setTemaActivo(tema);
    setConfig(prev => ({ ...prev, temaVisual: tema }));
    aplicarTemaVisual(tema);
    // Guardado inmediato en base de datos para que no dependa del botón "Guardar Parámetros"
    const currentCfg = DatabaseService.getConfiguracion();
    DatabaseService.saveConfiguracion({ ...currentCfg, temaVisual: tema });
  };

  const handleCambiarEscala = (factor: number) => {
    setEscalaActiva(factor);
    setConfig(prev => ({ ...prev, escalaUI: factor }));
    aplicarEscalaUI(factor);
    // Guardado inmediato en base de datos
    const currentCfg = DatabaseService.getConfiguracion();
    DatabaseService.saveConfiguracion({ ...currentCfg, escalaUI: factor });
  };

  const handleCancelar = () => {
    onClose();
  };

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
    const configFinal: ConfiguracionSistema = {
      ...config,
      temaVisual: temaActivo,
      escalaUI: escalaActiva,
    };
    DatabaseService.saveConfiguracion(configFinal);
    DatabaseService.saveCategorias(categorias);
    setMensaje({ tipo: 'ok', texto: '¡Configuración guardada!' });
    setTimeout(() => { onSaved(); onClose(); }, 700);
  };

  const descargarBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generarZipDesdeBackup = async (dataConAdjuntos: BackupData, filename: string) => {
    const zip = new JSZip();
    const adjuntosFolder = zip.folder('Adjuntos');
    let countAdjuntos = 0;

    // Clonar actividades sin base64 para el backup.json y guardar adjuntos en carpeta Adjuntos/
    const actividadesLimpias = (dataConAdjuntos.actividades || []).map(act => {
      if (act.archivoAdjuntoBase64 && act.archivoAdjuntoNombre && adjuntosFolder) {
        const base64Parts = act.archivoAdjuntoBase64.split(',');
        const rawBase64 = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
        const nombreSeguro = `${act.id}__${act.archivoAdjuntoNombre}`;
        adjuntosFolder.file(nombreSeguro, rawBase64, { base64: true });
        countAdjuntos++;
      }
      const copia = { ...act };
      delete copia.archivoAdjuntoBase64;
      return copia;
    });

    const jsonParaZip: BackupData = {
      ...dataConAdjuntos,
      actividades: actividadesLimpias,
    };

    zip.file('backup.json', JSON.stringify(jsonParaZip, null, 2));
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    descargarBlob(zipBlob, filename);
    return countAdjuntos;
  };

  // Opción 1: Exportar Solo JSON
  const handleExportarSoloJson = () => {
    try {
      const data = DatabaseService.exportarBackup(false);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const hoy = new Date().toISOString().split('T')[0];
      descargarBlob(blob, `evaluador-respaldo-${hoy}.json`);
      setBackupStatus('✓ Respaldo solo JSON descargado correctamente.');
      setTimeout(() => setBackupStatus(null), 3500);
    } catch (err: any) {
      setBackupStatus(`❌ Error al exportar JSON: ${err.message || 'desconocido'}`);
    }
  };

  // Opción 2: Exportar ZIP Completo (JSON + Adjuntos)
  const handleExportarZipCompleto = async () => {
    try {
      const data = DatabaseService.exportarBackup(true);
      const hoy = new Date().toISOString().split('T')[0];
      const countAdj = await generarZipDesdeBackup(data, `evaluador-respaldo-completo-${hoy}.zip`);
      setBackupStatus(`✓ ZIP completo descargado (JSON + ${countAdj} archivo(s) adjunto(s)).`);
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      setBackupStatus(`❌ Error al generar ZIP: ${err.message || 'desconocido'}`);
    }
  };

  // Opción 3: Exportación Específica (Cursos / Asignaturas / Materia de un curso)
  const handleExportarEspecifica = async () => {
    if (selectedCursoIds.length === 0 && selectedAsigIds.length === 0) {
      setBackupStatus('❌ Selecciona al menos un curso o una asignatura para exportar.');
      return;
    }
    try {
      const data = DatabaseService.exportarBackupEspecifico({
        cursoIds: selectedCursoIds,
        asignaturaIds: selectedAsigIds,
        incluirAdjuntos: especificaConZip,
      });
      const hoy = new Date().toISOString().split('T')[0];

      if (especificaConZip) {
        const countAdj = await generarZipDesdeBackup(data, `evmim-especifico-${hoy}.zip`);
        setBackupStatus(
          `✓ Exportación específica en ZIP lista (${data.cursos.length} curso(s), ${data.asignaturas.length} asignatura(s), ${countAdj} adjunto(s)).`
        );
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        descargarBlob(blob, `evmim-especifico-${hoy}.json`);
        setBackupStatus(
          `✓ Exportación específica JSON lista (${data.cursos.length} curso(s), ${data.asignaturas.length} asignatura(s), ${data.actividades.length} actividad(es)).`
        );
      }
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      setBackupStatus(`❌ Error en exportación específica: ${err.message || 'desconocido'}`);
    }
  };

  const handleAbrirCarpetaDatos = async () => {
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (!isTauri) {
        setBackupStatus(
          'En modo navegador web, los datos se guardan en el almacenamiento interno (localStorage). Usa la app de escritorio para abrir la carpeta local.'
        );
        return;
      }
      const ruta = await invoke<string>('abrir_carpeta_datos');
      setBackupStatus(`✓ Carpeta de almacenamiento local abierta: ${ruta}`);
      setTimeout(() => setBackupStatus(null), 5000);
    } catch (err: any) {
      setBackupStatus(`❌ No se pudo abrir la carpeta local: ${err?.message || err}`);
    }
  };

  const toggleCursoSeleccion = (cursoId: string) => {
    setSelectedCursoIds(prev =>
      prev.includes(cursoId) ? prev.filter(id => id !== cursoId) : [...prev, cursoId]
    );
  };

  const toggleAsigSeleccion = (asigId: string) => {
    setSelectedAsigIds(prev =>
      prev.includes(asigId) ? prev.filter(id => id !== asigId) : [...prev, asigId]
    );
  };

  // Importar / Restaurar Copia de Seguridad (.json o .zip)
  const handleImportarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      let jsonText = '';

      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const jsonEntry =
          zip.file('backup.json') ||
          Object.values(zip.files).find(f => !f.dir && f.name.toLowerCase().endsWith('.json'));

        if (!jsonEntry) {
          setBackupStatus('❌ El archivo ZIP no contiene un archivo JSON de respaldo válido.');
          return;
        }

        const rawJson = await jsonEntry.async('string');
        const parsed = JSON.parse(rawJson) as BackupData;

        // Re-embeber archivos de la carpeta Adjuntos/ si existen
        if (Array.isArray(parsed.actividades)) {
          for (const act of parsed.actividades) {
            if (!act.archivoAdjuntoBase64 && act.archivoAdjuntoNombre) {
              const adjEntry =
                zip.file(`Adjuntos/${act.id}__${act.archivoAdjuntoNombre}`) ||
                zip.file(`Adjuntos/${act.archivoAdjuntoNombre}`);
              if (adjEntry) {
                const base64 = await adjEntry.async('base64');
                const ext = act.archivoAdjuntoNombre.split('.').pop()?.toLowerCase() || '';
                const mime =
                  ext === 'pdf'
                    ? 'application/pdf'
                    : ext === 'png'
                    ? 'image/png'
                    : ext === 'jpg' || ext === 'jpeg'
                    ? 'image/jpeg'
                    : 'application/octet-stream';
                act.archivoAdjuntoBase64 = `data:${mime};base64,${base64}`;
              }
            }
          }
        }
        jsonText = JSON.stringify(parsed);
      } else {
        jsonText = await file.text();
      }

      if (!jsonText) return;
      const parsedCheck = JSON.parse(jsonText) as BackupData;
      const esEspecifica = String(parsedCheck?.sistema || '').includes('Específica');

      setPendienteImportarJson({
        jsonText,
        nombreArchivo: file.name,
        esEspecifica,
      });
    } catch (err: any) {
      setBackupStatus(`❌ Error al procesar el archivo: ${err.message || 'Formato inválido'}`);
    }
  };

  const ejecutarImportacion = (modo: 'combinar' | 'reemplazar') => {
    if (!pendienteImportarJson) return;
    const res =
      modo === 'combinar'
        ? DatabaseService.fusionarBackup(pendienteImportarJson.jsonText)
        : DatabaseService.importarBackup(pendienteImportarJson.jsonText);

    setPendienteImportarJson(null);

    if (res.ok) {
      setBackupStatus(
        modo === 'combinar'
          ? `✓ ${res.mensaje} (+${res.count?.cursos || 0} curso(s), +${res.count?.estudiantes || 0} estudiante(s), +${res.count?.actividades || 0} actividad(es), +${res.count?.calificaciones || 0} nota(s)).`
          : `✓ ${res.mensaje} (${res.count?.estudiantes || 0} estudiantes, ${res.count?.cursos || 0} cursos, ${res.count?.calificaciones || 0} calificaciones restauradas).`
      );
      setConfig(DatabaseService.getConfiguracion());
      setCategorias(DatabaseService.getCategorias());
      setTimeout(() => {
        onSaved();
      }, 1000);
    } else {
      setBackupStatus(`❌ ${res.mensaje}`);
    }
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
          <button onClick={handleCancelar} className="text-slate-500 hover:text-slate-200 transition p-1"><X className="w-5 h-5" /></button>
        </div>

        {mensaje && (
          <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 text-sm ${mensaje.tipo === 'ok' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
            {mensaje.tipo === 'ok' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span>{mensaje.texto}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* 1. Apariencia y Escala Visual */}
          <section className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  1. Tema Visual y Escala de Interfaz
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                ✓ Se aplica y guarda al instante con un clic
              </span>
            </div>

            {/* Selector de Temas */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-400 block mb-2">
                Tema de Color de la Aplicación:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TEMAS_INFO.map(t => {
                  const seleccionado = temaActivo === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleCambiarTema(t.id)}
                      className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                        seleccionado
                          ? 'bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/30'
                          : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {/* Muestras de color */}
                          <div className="flex items-center -space-x-1">
                            <span
                              className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                              style={{ backgroundColor: t.previewBg }}
                              title="Fondo principal"
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                              style={{ backgroundColor: t.previewCard }}
                              title="Superficie de tarjetas"
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                              style={{ backgroundColor: t.previewAccent }}
                              title="Acentos y botones"
                            />
                          </div>
                          <span className={`text-xs font-bold ${seleccionado ? 'text-sky-300' : 'text-slate-200'}`}>
                            {t.nombre}
                          </span>
                        </div>
                        {seleccionado && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-sky-400 bg-sky-500/20 px-1.5 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Activo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {t.descripcion}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Escala de UI */}
            <div className="pt-3 border-t border-slate-700/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  <label className="text-xs font-semibold text-slate-400">
                    Escala de UI (Tamaño de la interfaz sin zoom):
                  </label>
                </div>
                <span className="text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                  x{escalaActiva} ({ESCALAS_UI.find(e => e.factor === escalaActiva)?.desc || 'Personalizada'})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2.5">
                Escala matemáticamente las fuentes, botones, campos y planillas de forma vectorial y nítida.
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {ESCALAS_UI.map(e => {
                  const activo = escalaActiva === e.factor;
                  return (
                    <button
                      key={e.factor}
                      type="button"
                      onClick={() => handleCambiarEscala(e.factor)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
                        activo
                          ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">{e.label}</span>
                      <span className={`text-[9px] font-normal ${activo ? 'text-sky-100' : 'text-slate-400'}`}>
                        {e.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Escala */}
          <section className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Escala de Calificaciones</h3>
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
              3. Rangos de Desempeño (Escala Analítica)
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
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Periodos Escolares</h3>
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
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Etiquetas y Pesos</h3>
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
                <Database className="w-4 h-4 text-sky-400" /> 6. Copia de Seguridad y Gestión de Archivos Adjuntos
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Exporta toda tu base de datos en JSON o en un ZIP con tus documentos adjuntos, realiza una exportación específica o restaura un respaldo existente (.json o .zip).
            </p>

            {backupStatus && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  backupStatus.startsWith('✓')
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {backupStatus.startsWith('✓') ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{backupStatus}</span>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportarFile}
              accept=".json,.zip,application/json,application/zip"
              className="hidden"
            />

            {/* Dos botones principales: Exportar e Importar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Botón Principal Exportar */}
              <button
                type="button"
                onClick={() => setExportPanelOpen(prev => !prev)}
                className={`h-full min-h-[72px] p-3.5 border rounded-xl flex items-center gap-3 transition text-left group ${
                  exportPanelOpen
                    ? 'bg-sky-600/20 border-sky-500'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 hover:border-sky-500'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition flex-shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-sky-300">
                    Exportar Respaldo
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Solo JSON, ZIP completo o Exportación específica
                  </div>
                </div>
              </button>

              {/* Botón Principal Importar (.json o .zip) */}
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
                    Importar / Restaurar (.json / .zip)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Carga solo JSON o un ZIP con datos y adjuntos
                  </div>
                </div>
              </button>
            </div>

            {/* Botón para abrir la carpeta física de almacenamiento local */}
            <div className="mt-3">
              <button
                type="button"
                onClick={handleAbrirCarpetaDatos}
                className="w-full p-3 bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/70 rounded-xl flex items-center justify-between gap-3 transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-700/70 border border-slate-600 flex items-center justify-center text-sky-400 group-hover:scale-105 transition flex-shrink-0">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-sky-300">
                      Abrir ubicación de almacenamiento local
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Abre el explorador de archivos en la carpeta donde se guardan los datos de la app
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-sky-400 px-2 py-1 rounded bg-sky-500/10 border border-sky-500/20 flex-shrink-0">
                  Abrir carpeta
                </span>
              </button>
            </div>

            {/* Subpanel de Confirmación de Importación (Combinar vs Reemplazar) */}
            {pendienteImportarJson && (
              <div className="mt-3 p-4 bg-amber-500/10 border border-amber-500/40 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-amber-300">
                      Archivo listo para importar: {pendienteImportarJson.nombreArchivo}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {pendienteImportarJson.esEspecifica
                        ? 'Se detectó una Exportación Específica. Se recomienda combinarla para unir estos cursos/materias sin borrar tus datos actuales.'
                        : 'Elige si deseas unir este respaldo con tus datos actuales o reemplazar toda tu base de datos.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendienteImportarJson(null)}
                    className="p-1 text-slate-400 hover:text-slate-200"
                    title="Cancelar importación"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => ejecutarImportacion('combinar')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                  >
                    Unir / Combinar con datos actuales
                  </button>
                  <button
                    type="button"
                    onClick={() => ejecutarImportacion('reemplazar')}
                    className="px-3.5 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Reemplazar todo el sistema
                  </button>
                </div>
              </div>
            )}

            {/* Subpanel de Opciones de Exportación */}
            {exportPanelOpen && (
              <div className="mt-3 p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportarSoloJson}
                    className="p-3 bg-slate-900/70 hover:bg-slate-900 border border-slate-700 hover:border-sky-500 rounded-xl flex flex-col gap-1.5 text-left transition"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                      <FileJson className="w-4 h-4" /> Solo JSON
                    </div>
                    <span className="text-[11px] text-slate-400 leading-snug">
                      Base de datos ligera sin archivos adjuntos.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportarZipCompleto}
                    className="p-3 bg-slate-900/70 hover:bg-slate-900 border border-slate-700 hover:border-emerald-500 rounded-xl flex flex-col gap-1.5 text-left transition"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                      <FileArchive className="w-4 h-4" /> ZIP (JSON + Adjuntos)
                    </div>
                    <span className="text-[11px] text-slate-400 leading-snug">
                      Archivo .zip con JSON y todos los adjuntos.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportEspecificaOpen(prev => !prev)}
                    className={`p-3 border rounded-xl flex flex-col gap-1.5 text-left transition ${
                      exportEspecificaOpen
                        ? 'bg-sky-600/20 border-sky-500'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-700 hover:border-sky-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Filter className="w-4 h-4 text-sky-400" /> Exportación Específica
                    </div>
                    <span className="text-[11px] text-slate-400 leading-snug">
                      Elige cursos, asignaturas o una materia puntual.
                    </span>
                  </button>
                </div>

                {/* Selector de Exportación Específica */}
                {exportEspecificaOpen && (
                  <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h5 className="text-xs font-bold text-slate-200">
                        Selecciona qué datos deseas exportar
                      </h5>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={especificaConZip}
                          onChange={e => setEspecificaConZip(e.target.checked)}
                          className="rounded border-slate-600"
                        />
                        Incluir adjuntos en archivo .zip
                      </label>
                    </div>

                    {cursosDisponibles.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No hay cursos registrados aún.</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {cursosDisponibles.map(c => {
                          const anio = aniosDisponibles.find(a => a.id === c.anioId);
                          const asigsCurso = asignaturasDisponibles.filter(a => a.cursoId === c.id);
                          const cursoChecked = selectedCursoIds.includes(c.id);
                          return (
                            <div
                              key={c.id}
                              className="p-2 bg-slate-800/70 border border-slate-700/70 rounded-lg space-y-1.5"
                            >
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={cursoChecked}
                                  onChange={() => toggleCursoSeleccion(c.id)}
                                  className="rounded border-slate-600"
                                />
                                <span>{c.nombre}</span>
                                <span className="text-[10px] font-normal text-slate-400">
                                  (Año {anio?.nombre || c.anio}) — Curso completo
                                </span>
                              </label>
                              {asigsCurso.length > 0 && (
                                <div className="pl-5 flex flex-wrap gap-2">
                                  {asigsCurso.map(asig => (
                                    <label
                                      key={asig.id}
                                      className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-900/70 border border-slate-700 px-2 py-0.5 rounded-md cursor-pointer hover:border-sky-500/60"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedAsigIds.includes(asig.id)}
                                        onChange={() => toggleAsigSeleccion(asig.id)}
                                        className="rounded border-slate-600"
                                      />
                                      <span>{asig.nombre}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCursoIds([]);
                          setSelectedAsigIds([]);
                        }}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                      >
                        Limpiar selección
                      </button>
                      <button
                        type="button"
                        onClick={handleExportarEspecifica}
                        className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar Exportación ({especificaConZip ? 'ZIP' : 'JSON'})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-700">
          <button onClick={handleCancelar} className="px-4 py-2 border border-slate-700 rounded-xl text-sm text-slate-400 hover:bg-slate-700 transition">Cancelar</button>
          <button onClick={handleGuardar} className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow transition">
            <Save className="w-4 h-4" /> Guardar Parámetros
          </button>
        </div>
      </div>
    </div>
  );
};
