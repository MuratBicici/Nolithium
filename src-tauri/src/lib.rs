mod files;
mod storage;
mod window_state;

use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must come first: a second launch (e.g. "Open with" while running)
        // hands its file arguments to this window instead of opening another.
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            files::open_paths(app, files::files_in_args(argv.into_iter().skip(1), std::path::Path::new(&cwd)), false);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(files::OpenedFiles::default())
        .invoke_handler(tauri::generate_handler![
            storage::load_desk, storage::save_desk,
            files::take_pending_files, files::read_text_file, files::write_text_file,
        ])
        .setup(|app| {
            let handle = app.handle();
            files::allow_linked_from_desk(handle, &app.state::<files::OpenedFiles>());
            let cwd = std::env::current_dir().unwrap_or_default();
            files::open_paths(handle, files::files_in_args(std::env::args().skip(1), &cwd), true);
            if let Some(window) = app.get_webview_window("main") {
                window_state::restore(handle, &window);
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
