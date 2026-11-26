import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

async function toUint8Array(data: Uint8Array | ArrayBuffer | Blob | string): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data instanceof Blob) {
    const buf = await data.arrayBuffer();
    return new Uint8Array(buf);
  }
  return new TextEncoder().encode(data);
}

/**
 * Abre un diálogo nativo "Guardar como" para que el usuario elija la carpeta y el nombre
 * del archivo tanto en Tauri (Linux AppImage / Windows / macOS) como en navegadores modernos.
 * Retorna `true` si el archivo se guardó o `false` si el usuario canceló.
 */
export async function guardarArchivoConDialogo(
  data: Uint8Array | ArrayBuffer | Blob | string,
  nombreSugerido: string,
  extension: string,
  filtroNombre: string
): Promise<boolean> {
  const bytes = await toUint8Array(data);
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  if (isTauri) {
    const selectedPath = await save({
      defaultPath: nombreSugerido,
      filters: [{ name: filtroNombre, extensions: [extension] }],
    });
    if (!selectedPath) return false;

    const finalPath = selectedPath.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
      ? selectedPath
      : `${selectedPath}.${extension}`;

    await invoke('escribir_archivo_binario', {
      path: finalPath,
      bytes: Array.from(bytes),
    });
    return true;
  }

  // Fallback en navegador moderno (File System Access API)
  const win = window as any;
  if (typeof win.showSaveFilePicker === 'function') {
    try {
      const handle = await win.showSaveFilePicker({
        suggestedName: nombreSugerido,
        types: [
          {
            description: filtroNombre,
            accept: { 'application/octet-stream': [`.${extension}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(bytes);
      await writable.close();
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') return false;
    }
  }

  // Último fallback clásico
  const blob = data instanceof Blob ? data : new Blob([new Uint8Array(bytes)]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreSugerido;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
