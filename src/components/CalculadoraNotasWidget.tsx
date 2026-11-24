import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { Calculator, Plus, Trash2, X, RotateCcw, Target, Percent } from 'lucide-react';

interface FilaNota {
  id: string;
  nombre: string;
  nota: string;
  peso: string;
}

const crearFila = (idx: number, pesoDefault = ''): FilaNota => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  nombre: `Nota ${idx}`,
  nota: '',
  peso: pesoDefault,
});

export const CalculadoraNotasWidget: React.FC = () => {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<'final' | 'faltante'>('final');

  const config = DatabaseService.getConfiguracion();

  // Estado Modo 1: Resultado Final
  const [filasFinal, setFilasFinal] = useState<FilaNota[]>([
    crearFila(1, '30'),
    crearFila(2, '30'),
    crearFila(3, '40'),
  ]);

  // Estado Modo 2: Nota Faltante
  const [notaObjetivo, setNotaObjetivo] = useState<string>(String(config.notaAprobatoria));
  const [filasFaltante, setFilasFaltante] = useState<FilaNota[]>([
    crearFila(1, '30'),
    crearFila(2, '30'),
  ]);

  const actualizarFila = (
    lista: FilaNota[],
    setLista: React.Dispatch<React.SetStateAction<FilaNota[]>>,
    id: string,
    campo: keyof FilaNota,
    valor: string
  ) => {
    setLista(lista.map(f => (f.id === id ? { ...f, [campo]: valor } : f)));
  };

  const eliminarFila = (
    lista: FilaNota[],
    setLista: React.Dispatch<React.SetStateAction<FilaNota[]>>,
    id: string
  ) => {
    if (lista.length <= 1) return;
    setLista(lista.filter(f => f.id !== id));
  };

  // Cálculo Modo 1: Resultado Final
  const calcFinal = (() => {
    let sumaPonderada = 0;
    let pesoTotal = 0;
    let pesoConNota = 0;

    for (const f of filasFinal) {
      const p = parseFloat(f.peso);
      const n = parseFloat(f.nota);
      if (!isNaN(p) && p > 0) {
        pesoTotal += p;
        if (!isNaN(n)) {
          sumaPonderada += n * (p / 100);
          pesoConNota += p;
        }
      }
    }

    const directo = sumaPonderada;
    const normalizado = pesoConNota > 0 ? sumaPonderada / (pesoConNota / 100) : 0;

    return {
      pesoTotal: Number(pesoTotal.toFixed(2)),
      pesoConNota: Number(pesoConNota.toFixed(2)),
      directo: Number(directo.toFixed(2)),
      normalizado: Number(normalizado.toFixed(2)),
    };
  })();

  // Cálculo Modo 2: Nota Faltante
  const calcFaltante = (() => {
    const objetivo = parseFloat(notaObjetivo) || config.notaAprobatoria;
    let acumulado = 0;
    let pesoCubierto = 0;

    for (const f of filasFaltante) {
      const p = parseFloat(f.peso);
      const n = parseFloat(f.nota);
      if (!isNaN(p) && p > 0) {
        pesoCubierto += p;
        if (!isNaN(n)) {
          acumulado += n * (p / 100);
        }
      }
    }

    const pesoFaltante = Number((100 - pesoCubierto).toFixed(2));
    const notaNecesaria =
      pesoFaltante > 0 ? Number(((objetivo - acumulado) / (pesoFaltante / 100)).toFixed(2)) : null;

    return {
      objetivo,
      acumulado: Number(acumulado.toFixed(2)),
      pesoCubierto: Number(pesoCubierto.toFixed(2)),
      pesoFaltante,
      notaNecesaria,
    };
  })();

  const getColorNota = (val: number) => {
    if (val >= config.notaAprobatoria) return 'text-emerald-400';
    if (val >= config.notaAprobatoria * 0.85) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {abierto && (
        <div className="mb-2.5 w-[21rem] sm:w-[24rem] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header */}
          <div className="bg-slate-900/80 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold text-slate-100">Calculadora</h4>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/60 transition"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selector de Modo */}
          <div className="p-2.5 bg-slate-900/40 border-b border-slate-700/70">
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setModo('final')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  modo === 'final'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Percent className="w-3.5 h-3.5" /> Nota Final
              </button>
              <button
                type="button"
                onClick={() => setModo('faltante')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  modo === 'faltante'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Target className="w-3.5 h-3.5" /> Nota Faltante
              </button>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="p-3.5 max-h-[60vh] overflow-y-auto space-y-3">
            {modo === 'final' ? (
              <>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold uppercase text-slate-400 px-1">
                    <span className="col-span-5">Concepto</span>
                    <span className="col-span-3 text-center">Nota</span>
                    <span className="col-span-3 text-center">Peso %</span>
                    <span className="col-span-1"></span>
                  </div>
                  {filasFinal.map((fila, idx) => (
                    <div key={fila.id} className="grid grid-cols-12 gap-1.5 items-center">
                      <input
                        type="text"
                        value={fila.nombre}
                        onChange={e => actualizarFila(filasFinal, setFilasFinal, fila.id, 'nombre', e.target.value)}
                        placeholder={`Nota ${idx + 1}`}
                        className="col-span-5 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min={config.minNota}
                        max={config.maxNota}
                        value={fila.nota}
                        onChange={e => actualizarFila(filasFinal, setFilasFinal, fila.id, 'nota', e.target.value)}
                        placeholder="0.0"
                        className="col-span-3 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-center font-bold text-slate-100 outline-none focus:border-sky-500"
                      />
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={fila.peso}
                        onChange={e => actualizarFila(filasFinal, setFilasFinal, fila.id, 'peso', e.target.value)}
                        placeholder="%"
                        className="col-span-3 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-center font-semibold text-sky-300 outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => eliminarFila(filasFinal, setFilasFinal, fila.id)}
                        disabled={filasFinal.length <= 1}
                        className="col-span-1 p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30 transition flex justify-center"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setFilasFinal([...filasFinal, crearFila(filasFinal.length + 1, '')])}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar nota
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFilasFinal([crearFila(1, '30'), crearFila(2, '30'), crearFila(3, '40')])
                    }
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reiniciar
                  </button>
                </div>

                {/* Resultado */}
                <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Suma de pesos evaluados:</span>
                    <span
                      className={`font-bold ${
                        calcFinal.pesoConNota === 100
                          ? 'text-emerald-400'
                          : calcFinal.pesoConNota > 100
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {calcFinal.pesoConNota}% (de {calcFinal.pesoTotal}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-xs font-semibold text-slate-300">
                      {calcFinal.pesoConNota === 100 ? 'Nota Final:' : 'Acumulado / Promedio:'}
                    </span>
                    <div className="text-right">
                      <span className={`text-xl font-black ${getColorNota(calcFinal.normalizado)}`}>
                        {calcFinal.normalizado.toFixed(2)}
                      </span>
                      {calcFinal.pesoConNota > 0 && calcFinal.pesoConNota !== 100 && (
                        <div className="text-[10px] text-slate-400">
                          Acumulado directo: <b className="text-slate-200">{calcFinal.directo.toFixed(2)}</b>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Nota Objetivo */}
                <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Nota Final Deseada:</label>
                  <input
                    type="number"
                    step="0.1"
                    min={config.minNota}
                    max={config.maxNota}
                    value={notaObjetivo}
                    onChange={e => setNotaObjetivo(e.target.value)}
                    className="w-20 px-2 py-1 bg-slate-800 border border-sky-500/60 rounded-lg text-sm text-center font-black text-sky-300 outline-none"
                  />
                </div>

                {/* Notas ya obtenidas */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold uppercase text-slate-400 px-1">
                    <span className="col-span-5">Ya evaluado</span>
                    <span className="col-span-3 text-center">Nota</span>
                    <span className="col-span-3 text-center">Peso %</span>
                    <span className="col-span-1"></span>
                  </div>
                  {filasFaltante.map((fila, idx) => (
                    <div key={fila.id} className="grid grid-cols-12 gap-1.5 items-center">
                      <input
                        type="text"
                        value={fila.nombre}
                        onChange={e => actualizarFila(filasFaltante, setFilasFaltante, fila.id, 'nombre', e.target.value)}
                        placeholder={`Corte ${idx + 1}`}
                        className="col-span-5 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min={config.minNota}
                        max={config.maxNota}
                        value={fila.nota}
                        onChange={e => actualizarFila(filasFaltante, setFilasFaltante, fila.id, 'nota', e.target.value)}
                        placeholder="0.0"
                        className="col-span-3 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-center font-bold text-slate-100 outline-none focus:border-sky-500"
                      />
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={fila.peso}
                        onChange={e => actualizarFila(filasFaltante, setFilasFaltante, fila.id, 'peso', e.target.value)}
                        placeholder="%"
                        className="col-span-3 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-center font-semibold text-sky-300 outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => eliminarFila(filasFaltante, setFilasFaltante, fila.id)}
                        disabled={filasFaltante.length <= 1}
                        className="col-span-1 p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30 transition flex justify-center"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setFilasFaltante([...filasFaltante, crearFila(filasFaltante.length + 1, '')])}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar nota
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotaObjetivo(String(config.notaAprobatoria));
                      setFilasFaltante([crearFila(1, '30'), crearFila(2, '30')]);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reiniciar
                  </button>
                </div>

                {/* Resultado Nota Faltante */}
                <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Peso restante por evaluar:</span>
                    <span className={`font-bold ${calcFaltante.pesoFaltante > 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                      {calcFaltante.pesoFaltante}%
                    </span>
                  </div>
                  {calcFaltante.pesoFaltante <= 0 ? (
                    <div className="text-xs text-rose-400 font-medium pt-1 border-t border-slate-800">
                      Los pesos ya suman 100% o más. Reduce algún peso para hallar la nota faltante.
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                      <div>
                        <span className="text-xs font-semibold text-slate-300 block">
                          Nota necesaria en el {calcFaltante.pesoFaltante}%:
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {calcFaltante.notaNecesaria !== null && calcFaltante.notaNecesaria <= config.minNota
                            ? '✓ Ya alcanzaste la meta deseada'
                            : calcFaltante.notaNecesaria !== null && calcFaltante.notaNecesaria > config.maxNota
                            ? `Supera el máximo (${config.maxNota})`
                            : `Acumulado actual: ${calcFaltante.acumulado.toFixed(2)}`}
                        </span>
                      </div>
                      <span
                        className={`text-xl font-black ${
                          calcFaltante.notaNecesaria !== null && calcFaltante.notaNecesaria <= config.minNota
                            ? 'text-emerald-400'
                            : calcFaltante.notaNecesaria !== null && calcFaltante.notaNecesaria > config.maxNota
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {calcFaltante.notaNecesaria !== null
                          ? calcFaltante.notaNecesaria <= config.minNota
                            ? '✓ Listo'
                            : calcFaltante.notaNecesaria.toFixed(2)
                          : '—'}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Botón Flotante Permanente (Solo ícono de calculadora) */}
      <button
        type="button"
        onClick={() => setAbierto(prev => !prev)}
        className="w-11 h-11 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40 border border-sky-400/40 flex items-center justify-center transition-transform hover:scale-105"
        title="Calculadora de notas"
      >
        {abierto ? <X className="w-5 h-5" /> : <Calculator className="w-5 h-5" />}
      </button>
    </div>
  );
};
