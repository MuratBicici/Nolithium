//! Durable, crash-safe JSON files in the app data folder.
//!
//! Every write goes to a temporary file, is flushed to disk, and then renamed
//! over the original, so a crash or power loss leaves either the old or the new
//! file — never a half-written one. The previous version is kept as `.bak`.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager};

const DESK_FILE: &str = "desk.json";

/// Serializes writes: two saves must never share the same temporary file.
static WRITE_LOCK: Mutex<()> = Mutex::new(());

pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|error| error.to_string())
}

fn backup_path(path: &Path) -> PathBuf {
    let mut name = path.file_name().unwrap_or_default().to_os_string();
    name.push(".bak");
    path.with_file_name(name)
}

pub fn read_optional(path: &Path) -> Result<Option<String>, String> {
    match fs::read_to_string(path) {
        Ok(contents) => Ok(Some(contents)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("Could not read {}: {error}", path.display())),
    }
}

pub fn write_atomic(path: &Path, contents: &str) -> Result<(), String> {
    let _guard = WRITE_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    let fail = |error: std::io::Error| format!("Could not save {}: {error}", path.display());
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(fail)?;
    }
    let mut temporary = path.as_os_str().to_os_string();
    temporary.push(".tmp");
    let temporary = PathBuf::from(temporary);
    {
        let mut file = fs::File::create(&temporary).map_err(fail)?;
        file.write_all(contents.as_bytes()).map_err(fail)?;
        file.sync_all().map_err(fail)?;
    }
    if path.exists() {
        fs::copy(path, backup_path(path)).map_err(fail)?;
    }
    fs::rename(&temporary, path).map_err(fail)
}

/// Raw file contents; the frontend validates them and falls back to the backup.
#[derive(Serialize, Debug, PartialEq)]
pub struct StoredDesk {
    main: Option<String>,
    backup: Option<String>,
}

pub fn read_desk(dir: &Path) -> Result<StoredDesk, String> {
    let path = dir.join(DESK_FILE);
    Ok(StoredDesk { main: read_optional(&path)?, backup: read_optional(&backup_path(&path))? })
}

pub fn write_desk(dir: &Path, contents: &str) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(contents).map_err(|error| format!("Refusing to save invalid JSON: {error}"))?;
    write_atomic(&dir.join(DESK_FILE), contents)
}

#[tauri::command]
pub async fn load_desk(app: AppHandle) -> Result<StoredDesk, String> {
    read_desk(&data_dir(&app)?)
}

#[tauri::command]
pub async fn save_desk(app: AppHandle, contents: String) -> Result<(), String> {
    write_desk(&data_dir(&app)?, &contents)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("nolithium-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn missing_files_read_as_none() {
        let dir = scratch("missing");
        assert_eq!(read_desk(&dir).unwrap(), StoredDesk { main: None, backup: None });
    }

    #[test]
    fn writes_replace_the_file_and_keep_the_previous_version() {
        let dir = scratch("roundtrip");
        write_desk(&dir, r#"{"version":2,"notes":[]}"#).unwrap();
        write_desk(&dir, r#"{"version":2,"notes":[1]}"#).unwrap();
        let stored = read_desk(&dir).unwrap();
        assert_eq!(stored.main.as_deref(), Some(r#"{"version":2,"notes":[1]}"#));
        assert_eq!(stored.backup.as_deref(), Some(r#"{"version":2,"notes":[]}"#));
        assert!(!dir.join("desk.json.tmp").exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn invalid_json_is_rejected_without_touching_the_file() {
        let dir = scratch("invalid");
        write_desk(&dir, r#"{"version":2,"notes":[]}"#).unwrap();
        assert!(write_desk(&dir, "{not json").is_err());
        assert_eq!(read_desk(&dir).unwrap().main.as_deref(), Some(r#"{"version":2,"notes":[]}"#));
        fs::remove_dir_all(dir).unwrap();
    }
}
