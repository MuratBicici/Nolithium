mod storage;
mod window_state;

use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![storage::load_desk, storage::save_desk])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window_state::restore(app.handle(), &window);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                window_state::save(window.app_handle(), window);
            }
        })
        .run(tauri::generate_context!())
        .expect("failed to run Nolithium");
}
