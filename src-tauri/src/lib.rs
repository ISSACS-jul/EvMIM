use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn abrir_carpeta_datos(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| format!("No se pudo obtener la ruta de almacenamiento: {}", e))?;

    if !dir.exists() {
        std::fs::create_dir_all(&dir)
            .map_err(|e| format!("No se pudo crear la carpeta de datos: {}", e))?;
    }

    let path_str = dir.to_string_lossy().to_string();

    #[cfg(target_os = "linux")]
    {
        // En AppImage, variables como LD_LIBRARY_PATH o APPIMAGE pueden bloquear xdg-open
        let status = std::process::Command::new("xdg-open")
            .env_remove("LD_LIBRARY_PATH")
            .env_remove("APPIMAGE")
            .env_remove("APPDIR")
            .arg(&path_str)
            .spawn();

        if status.is_ok() {
            return Ok(path_str);
        }
    }

    app.opener()
        .open_path(&path_str, None::<&str>)
        .map_err(|e| format!("No se pudo abrir el explorador de archivos: {}", e))?;

    Ok(path_str)
}

#[tauri::command]
fn escribir_archivo_binario(path: String, bytes: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, bytes).map_err(|e| format!("No se pudo guardar el archivo: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, abrir_carpeta_datos, escribir_archivo_binario])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
