import { GoogleDriveAccount, GoogleDriveBackupFile, BackupData } from '../types';
import { DatabaseService } from './db';

const STORAGE_KEY_ACCOUNT = 'evaluador_gdrive_account';
const STORAGE_KEY_CLIENT_ID = 'evaluador_gdrive_client_id';
// Client ID oficial del proyecto Evaluador
const DEFAULT_CLIENT_ID = '708643756009-t3cul53cu8c6r707tu71sjosv7nja8ad.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

export class GoogleDriveService {
  /**
   * Carga de manera dinámica el script oficial de Google Identity Services si aún no está presente
   */
  static async cargarGoogleScript(): Promise<void> {
    if ((window as any).google?.accounts?.oauth2) return;

    return new Promise((resolve) => {
      const existing = document.getElementById('google-gsi-client');
      if (existing) {
        (existing as HTMLScriptElement).onload = () => resolve();
        setTimeout(resolve, 1500);
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        console.warn('No se pudo cargar https://accounts.google.com/gsi/client');
        resolve(); // Deja continuar para usar fallback
      };
      document.head.appendChild(script);

      // Timeout de seguridad si no responde la red
      setTimeout(resolve, 2000);
    });
  }

  /**
   * Obtiene el Client ID configurado (o el por defecto de la aplicación)
   */
  static getClientId(): string {
    const custom = localStorage.getItem(STORAGE_KEY_CLIENT_ID);
    if (custom && custom.trim()) return custom.trim();
    const config = DatabaseService.getConfiguracion();
    if (config.googleClientId && config.googleClientId.trim()) return config.googleClientId.trim();
    return DEFAULT_CLIENT_ID;
  }

  /**
   * Guarda un Client ID personalizado
   */
  static setClientId(clientId: string): void {
    if (clientId.trim()) {
      localStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId.trim());
      const config = DatabaseService.getConfiguracion();
      DatabaseService.saveConfiguracion({ ...config, googleClientId: clientId.trim() });
    } else {
      localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
    }
  }

  /**
   * Retorna la cuenta actualmente conectada si el token sigue vigente
   */
  static getAccount(): GoogleDriveAccount | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      if (!raw) return null;
      const account: GoogleDriveAccount = JSON.parse(raw);
      if (!account || !account.accessToken) return null;

      // Si expiró el token
      if (Date.now() > account.expiresAt) {
        return {
          ...account,
          accessToken: '', // Marca que requiere renovación
        };
      }
      return account;
    } catch {
      return null;
    }
  }

  /**
   * Guarda los datos de la cuenta en almacenamiento local
   */
  static saveAccount(account: GoogleDriveAccount): void {
    localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
  }

  /**
   * Cierra la sesión de Google Drive
   */
  static disconnect(): void {
    localStorage.removeItem(STORAGE_KEY_ACCOUNT);
  }

  /**
   * Comprueba si la cuenta está conectada con token válido
   */
  static isConnected(): boolean {
    const acc = this.getAccount();
    return Boolean(acc && acc.accessToken && Date.now() < acc.expiresAt);
  }

  /**
   * Inicia el flujo OAuth 2.0 oficial de Google con Google Identity Services (GSI)
   * No requiere configurar redirect_uri ni lidia con IPs privadas de red.
   */
  static async iniciarLogin(customClientId?: string): Promise<GoogleDriveAccount> {
    const clientId = customClientId || this.getClientId();
    if (!clientId) {
      throw new Error('No hay un Client ID de Google configurado.');
    }

    // 1. Intentar con el cliente oficial de Google Identity Services
    await this.cargarGoogleScript();

    const gAccounts = (window as any).google?.accounts?.oauth2;
    if (gAccounts && typeof gAccounts.initTokenClient === 'function') {
      return new Promise((resolve, reject) => {
        try {
          const client = gAccounts.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: async (resp: any) => {
              if (resp.error) {
                reject(new Error(resp.error_description || resp.error));
                return;
              }
              if (resp.access_token) {
                try {
                  const acc = await GoogleDriveService.procesarToken(
                    resp.access_token,
                    resp.expires_in || 3600
                  );
                  resolve(acc);
                } catch (err) {
                  reject(err);
                }
              } else {
                reject(new Error('No se recibió el token de acceso de Google.'));
              }
            },
            error_callback: (err: any) => {
              reject(new Error(err?.message || 'Error en la ventana de autorización de Google.'));
            },
          });

          // Solicita el token abriendo el popup oficial de Google
          client.requestAccessToken({ prompt: 'consent' });
        } catch (err: any) {
          console.warn('Error al usar GSI Token Client, usando fallback:', err);
          GoogleDriveService.iniciarLoginFallback(clientId).then(resolve).catch(reject);
        }
      });
    }

    // 2. Si GSI no cargó (offline o bloqueado), usar el flujo emergente con origen localhost
    return this.iniciarLoginFallback(clientId);
  }

  /**
   * Flujo emergente de respaldo
   */
  private static async iniciarLoginFallback(clientId: string): Promise<GoogleDriveAccount> {
    // Usar localhost estandarizado para evitar IPs privadas tipo 172.x
    const redirectUri = window.location.origin.includes('localhost')
      ? window.location.origin
      : 'http://localhost:1420';

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `include_granted_scopes=true&` +
      `prompt=select_account%20consent`;

    return new Promise((resolve, reject) => {
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popup) {
        reject(
          new Error(
            'El navegador bloqueó la ventana emergente de inicio de sesión de Google. Por favor permite popups para Evaluador.'
          )
        );
        return;
      }

      let interval: any = null;

      const messageHandler = async (event: MessageEvent) => {
        if (event.data && event.data.type === 'EVALUADOR_GDRIVE_AUTH') {
          window.removeEventListener('message', messageHandler);
          if (interval) clearInterval(interval);
          try {
            const acc = await GoogleDriveService.procesarToken(
              event.data.accessToken,
              event.data.expiresIn
            );
            resolve(acc);
          } catch (err: any) {
            reject(err);
          }
        }
      };
      window.addEventListener('message', messageHandler);

      interval = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(interval);
            window.removeEventListener('message', messageHandler);
            reject(new Error('Inicio de sesión cancelado o ventana cerrada.'));
            return;
          }

          const currentHref = popup.location.href;
          if (currentHref && currentHref.includes('access_token=')) {
            clearInterval(interval);
            window.removeEventListener('message', messageHandler);

            const hashIndex = currentHref.indexOf('#');
            const hash = currentHref.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const expiresIn = parseInt(params.get('expires_in') || '3600', 10);

            popup.close();

            if (!accessToken) {
              reject(new Error('No se recibió el token de acceso de Google.'));
              return;
            }

            const acc = await GoogleDriveService.procesarToken(accessToken, expiresIn);
            resolve(acc);
          }
        } catch {
          // Cross-origin mientras navega en accounts.google.com
        }
      }, 400);
    });
  }

  /**
   * Vincula un token recibido manualmente (útil para tokens de desktop o si la ventana redirige a una URL alternativa)
   */
  static async vincularConTokenManual(tokenOrHash: string): Promise<GoogleDriveAccount> {
    let token = tokenOrHash.trim();
    let expiresIn = 3600;

    if (token.includes('access_token=')) {
      const hash = token.includes('#') ? token.split('#')[1] : token;
      const params = new URLSearchParams(hash);
      token = params.get('access_token') || token;
      expiresIn = parseInt(params.get('expires_in') || '3600', 10);
    }

    return await this.procesarToken(token, expiresIn);
  }

  /**
   * Obtiene la información del perfil del usuario con el token de acceso
   */
  private static async procesarToken(accessToken: string, expiresIn: number): Promise<GoogleDriveAccount> {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      throw new Error('No se pudo verificar la identidad del usuario con Google.');
    }

    const userData = await userRes.json();
    const account: GoogleDriveAccount = {
      email: userData.email || 'docente@google.com',
      name: userData.name || userData.given_name || 'Docente',
      picture: userData.picture,
      accessToken,
      expiresAt: Date.now() + (expiresIn - 60) * 1000, // Margen de 60 segundos
    };

    this.saveAccount(account);
    return account;
  }

  /**
   * Obtiene o crea la carpeta "Evaluador_Respaldos" en el Google Drive del usuario
   */
  static async getOrCreateFolder(): Promise<string> {
    const account = this.getAccount();
    if (!account || !account.accessToken) {
      throw new Error('Debes iniciar sesión con Google Drive primero.');
    }

    const folderName = 'Evaluador_Respaldos';
    const query = encodeURIComponent(
      `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)&spaces=drive`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      }
    );

    if (!searchRes.ok) {
      if (searchRes.status === 401) {
        this.disconnect();
        throw new Error('La sesión de Google Drive ha expirado. Por favor vuelve a conectar tu cuenta.');
      }
      throw new Error('Error al buscar la carpeta en Google Drive.');
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Crear carpeta si no existe
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Carpeta de copias de seguridad automáticas de Evaluador',
      }),
    });

    if (!createRes.ok) {
      throw new Error('No se pudo crear la carpeta "Evaluador_Respaldos" en tu Google Drive.');
    }

    const newFolder = await createRes.json();
    return newFolder.id;
  }

  /**
   * Sube una copia de seguridad actual a la carpeta de Google Drive
   */
  static async subirRespaldo(incluirAdjuntos: boolean = false): Promise<{
    ok: boolean;
    nombreArchivo: string;
    fileId: string;
    sizeKb: number;
  }> {
    const account = this.getAccount();
    if (!account || !account.accessToken) {
      throw new Error('Debes iniciar sesión con Google Drive antes de subir un respaldo.');
    }

    const folderId = await this.getOrCreateFolder();

    const data: BackupData = DatabaseService.exportarBackup(incluirAdjuntos);
    const jsonStr = JSON.stringify(data, null, 2);
    const sizeKb = Math.round(new Blob([jsonStr]).size / 1024);

    const fechaHoy = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const tipo = incluirAdjuntos ? 'completo' : 'ligero';
    const nombreArchivo = `evaluador-backup-${tipo}-${fechaHoy}.json`;

    // Subida multipart (metadatos + contenido)
    const boundary = '-------EvaluadorDriveBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: nombreArchivo,
      parents: [folderId],
      mimeType: 'application/json',
      description: `Copia de seguridad ${tipo} de Evaluador (${sizeKb} KB)`,
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonStr +
      closeDelimiter;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Error de Google Drive al subir archivo: ${errText || uploadRes.statusText}`);
    }

    const result = await uploadRes.json();
    return {
      ok: true,
      nombreArchivo,
      fileId: result.id,
      sizeKb,
    };
  }

  /**
   * Lista todos los archivos de respaldo disponibles en la carpeta Evaluador_Respaldos
   */
  static async listarRespaldos(): Promise<GoogleDriveBackupFile[]> {
    const account = this.getAccount();
    if (!account || !account.accessToken) {
      throw new Error('Debes iniciar sesión con Google Drive para consultar los respaldos.');
    }

    const folderId = await this.getOrCreateFolder();
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id, name, size, createdTime, modifiedTime)&pageSize=25`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      }
    );

    if (!res.ok) {
      throw new Error('Error al listar archivos de respaldo en Google Drive.');
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      size: f.size ? `${(parseInt(f.size) / 1024).toFixed(1)} KB` : 'Desconocido',
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
    }));
  }

  /**
   * Descarga un archivo JSON de respaldo de Google Drive y lo restaura en la base de datos
   */
  static async descargarYRestaurar(fileId: string): Promise<{
    ok: boolean;
    mensaje: string;
    count?: {
      anios: number;
      cursos: number;
      estudiantes: number;
      actividades: number;
      calificaciones: number;
    };
  }> {
    const account = this.getAccount();
    if (!account || !account.accessToken) {
      throw new Error('Debes iniciar sesión con Google Drive.');
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });

    if (!res.ok) {
      throw new Error('No se pudo descargar la copia de seguridad desde Google Drive.');
    }

    const jsonStr = await res.text();
    return DatabaseService.importarBackup(jsonStr);
  }
}
