//! "Open with" support: text files opened from Explorer become notes linked to
//! the file, and edits are written back to it the way Notepad would.
//!
//! - Only files the user opened (launch arguments, a second launch, or notes
//!   already linked on the desk) can be read or written.
//! - The original encoding (UTF-8, UTF-8 with BOM, UTF-16, or the system ANSI
//!   code page) and line endings are detected on read and kept on write.
//! - Writes go to a temporary file beside the original and are renamed over
//!   it, and are refused if the file changed on disk since it was last read.

use std::collections::HashSet;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

use encoding_rs::Encoding;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::storage::{data_dir, read_optional};

/// Larger files are refused rather than loaded into the editor.
const MAX_BYTES: u64 = 16 * 1024 * 1024;

#[derive(Default)]
pub struct OpenedFiles {
    allowed: Mutex<HashSet<PathBuf>>,
    pending: Mutex<Vec<String>>,
}

impl OpenedFiles {
    fn allow(&self, path: &Path) {
        self.allowed.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).insert(key(path));
    }
    fn is_allowed(&self, path: &Path) -> bool {
        self.allowed.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).contains(&key(path))
    }
}

/// Windows paths are case-insensitive; compare them that way.
fn key(path: &Path) -> PathBuf {
    PathBuf::from(path.to_string_lossy().to_lowercase())
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum TextEncoding { Utf8, Utf8Bom, Utf16Le, Utf16Be, Ansi }

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LineEnding { Lf, Crlf }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TextFile {
    path: String,
    name: String,
    /// Always `\n` line endings; the original ending is in `line_ending`.
    text: String,
    encoding: TextEncoding,
    line_ending: LineEnding,
    /// Last-modified time (ms) when read, used to detect outside changes.
    modified: u64,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Saved {
    modified: u64,
    /// Set when the text could not be stored in the file's ANSI code page.
    encoding: TextEncoding,
}

/// The system's legacy code page (e.g. windows-1254 on Turkish Windows).
fn ansi_encoding() -> &'static Encoding {
    #[cfg(windows)]
    {
        extern "system" { fn GetACP() -> u32; }
        let page = unsafe { GetACP() };
        let label = match page { 932 => "shift_jis".to_string(), 936 => "gbk".into(), 949 => "euc-kr".into(), 950 => "big5".into(), other => format!("windows-{other}") };
        if let Some(encoding) = Encoding::for_label(label.as_bytes()) { return encoding; }
    }
    encoding_rs::WINDOWS_1252
}

pub fn decode(bytes: &[u8]) -> Result<(String, TextEncoding), String> {
    if let Some(rest) = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]) {
        return String::from_utf8(rest.to_vec()).map(|text| (text, TextEncoding::Utf8Bom)).map_err(|_| "The file is not valid UTF-8 text.".into());
    }
    for (bom, encoding, kind) in [([0xFF, 0xFE], encoding_rs::UTF_16LE, TextEncoding::Utf16Le), ([0xFE, 0xFF], encoding_rs::UTF_16BE, TextEncoding::Utf16Be)] {
        if bytes.starts_with(&bom) {
            let (text, had_errors) = encoding.decode_without_bom_handling(&bytes[2..]);
            if had_errors { return Err("The file is not valid UTF-16 text.".into()); }
            return Ok((text.into_owned(), kind));
        }
    }
    // A NUL byte in a BOM-less file means binary data (images, executables…).
    if bytes.contains(&0) { return Err("This looks like a binary file, not text.".into()); }
    match String::from_utf8(bytes.to_vec()) {
        Ok(text) => Ok((text, TextEncoding::Utf8)),
        Err(_) => {
            let (text, had_errors) = ansi_encoding().decode_without_bom_handling(bytes);
            if had_errors { Err("The file's text encoding is not supported.".into()) } else { Ok((text.into_owned(), TextEncoding::Ansi)) }
        }
    }
}

/// Returns the bytes to write, and the encoding actually used: ANSI text with
/// characters outside its code page is saved as UTF-8 rather than losing them.
pub fn encode(text: &str, encoding: TextEncoding, line_ending: LineEnding) -> (Vec<u8>, TextEncoding) {
    let text = match line_ending { LineEnding::Crlf => text.replace('\n', "\r\n"), LineEnding::Lf => text.to_string() };
    match encoding {
        TextEncoding::Utf8 => (text.into_bytes(), encoding),
        TextEncoding::Utf8Bom => ([&[0xEF, 0xBB, 0xBF][..], text.as_bytes()].concat(), encoding),
        TextEncoding::Utf16Le => ([0xFF, 0xFE].into_iter().chain(text.encode_utf16().flat_map(u16::to_le_bytes)).collect(), encoding),
        TextEncoding::Utf16Be => ([0xFE, 0xFF].into_iter().chain(text.encode_utf16().flat_map(u16::to_be_bytes)).collect(), encoding),
        TextEncoding::Ansi => {
            let (bytes, _, unmappable) = ansi_encoding().encode(&text);
            if unmappable { (text.into_bytes(), TextEncoding::Utf8) } else { (bytes.into_owned(), encoding) }
        }
    }
}

fn modified_ms(path: &Path) -> Result<u64, String> {
    let time = fs::metadata(path).and_then(|meta| meta.modified()).map_err(|error| error.to_string())?;
    Ok(time.duration_since(UNIX_EPOCH).map(|duration| duration.as_millis() as u64).unwrap_or(0))
}

fn fail(path: &Path, error: std::io::Error) -> String {
    match error.kind() {
        std::io::ErrorKind::NotFound => format!("not-found: {}", path.display()),
        std::io::ErrorKind::PermissionDenied => format!("The file is read-only or locked: {}", path.display()),
        _ => format!("{}: {error}", path.display()),
    }
}

pub fn read_text(path: &Path) -> Result<TextFile, String> {
    let size = fs::metadata(path).map_err(|error| fail(path, error))?.len();
    if size > MAX_BYTES { return Err(format!("The file is too large to open ({} MB).", size / 1024 / 1024)); }
    let bytes = fs::read(path).map_err(|error| fail(path, error))?;
    let (text, encoding) = decode(&bytes)?;
    let line_ending = if text.contains("\r\n") { LineEnding::Crlf } else { LineEnding::Lf };
    Ok(TextFile {
        path: path.to_string_lossy().into_owned(),
        name: path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default(),
        text: text.replace("\r\n", "\n"),
        encoding,
        line_ending,
        modified: modified_ms(path)?,
    })
}

/// Writes beside the original and renames over it, so a crash never leaves a
/// half-written file. No backup copy is left next to the user's file.
pub fn write_text(path: &Path, text: &str, encoding: TextEncoding, line_ending: LineEnding, expected_modified: Option<u64>) -> Result<Saved, String> {
    if let Some(expected) = expected_modified {
        match modified_ms(path) {
            Ok(current) if current != expected => return Err("changed-on-disk".into()),
            _ => {}
        }
    }
    let (bytes, used) = encode(text, encoding, line_ending);
    let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
    let temporary = path.with_file_name(format!(".{name}.nolithium-tmp"));
    let result = (|| {
        let mut file = fs::File::create(&temporary)?;
        file.write_all(&bytes)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&temporary, path)
    })();
    if let Err(error) = result {
        let _ = fs::remove_file(&temporary);
        return Err(fail(path, error));
    }
    Ok(Saved { modified: modified_ms(path)?, encoding: used })
}

/// Existing files among launch arguments (Explorer passes the file to open).
pub fn files_in_args(args: impl IntoIterator<Item = String>, cwd: &Path) -> Vec<PathBuf> {
    args.into_iter()
        .filter(|arg| !arg.starts_with('-'))
        .map(|arg| { let path = PathBuf::from(&arg); if path.is_absolute() { path } else { cwd.join(path) } })
        .filter(|path| path.is_file())
        .collect()
}

/// Notes already linked on the desk stay readable and writable across restarts.
pub fn allow_linked_from_desk(app: &AppHandle, opened: &OpenedFiles) {
    let Ok(dir) = data_dir(app) else { return };
    let Ok(Some(raw)) = read_optional(&dir.join("desk.json")) else { return };
    let Ok(desk) = serde_json::from_str::<serde_json::Value>(&raw) else { return };
    for note in desk["notes"].as_array().into_iter().flatten() {
        if let Some(path) = note["file"]["path"].as_str() { opened.allow(Path::new(path)); }
    }
}

/// Called at launch and when a second launch hands its arguments over.
pub fn open_paths(app: &AppHandle, paths: Vec<PathBuf>, launching: bool) {
    if paths.is_empty() { return; }
    let opened = app.state::<OpenedFiles>();
    let names: Vec<String> = paths.iter().map(|path| { opened.allow(path); path.to_string_lossy().into_owned() }).collect();
    if launching {
        opened.pending.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).extend(names);
    } else {
        let _ = app.emit("open-files", names);
    }
}

fn checked(opened: &OpenedFiles, path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(path);
    if opened.is_allowed(&path) { Ok(path) } else { Err("This file was not opened with Nolithium.".into()) }
}

#[tauri::command]
pub fn take_pending_files(opened: State<'_, OpenedFiles>) -> Vec<String> {
    std::mem::take(&mut *opened.pending.lock().unwrap_or_else(|poisoned| poisoned.into_inner()))
}

#[tauri::command]
pub async fn read_text_file(opened: State<'_, OpenedFiles>, path: String) -> Result<TextFile, String> {
    read_text(&checked(&opened, &path)?)
}

#[tauri::command]
pub async fn write_text_file(opened: State<'_, OpenedFiles>, path: String, text: String, encoding: TextEncoding, line_ending: LineEnding, expected_modified: Option<u64>) -> Result<Saved, String> {
    write_text(&checked(&opened, &path)?, &text, encoding, line_ending, expected_modified)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("nolithium-files-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn round_trips_every_encoding_and_line_ending_byte_for_byte() {
        let samples: Vec<Vec<u8>> = vec![
            b"plain\nlines\n".to_vec(),
            b"windows\r\nlines\r\n".to_vec(),
            [&[0xEF, 0xBB, 0xBF][..], "bom \u{015f}\u{011f}\r\n".as_bytes()].concat(),
            [0xFF, 0xFE].into_iter().chain("utf16 \u{0130}\r\n".encode_utf16().flat_map(u16::to_le_bytes)).collect(),
            [0xFE, 0xFF].into_iter().chain("big endian\n".encode_utf16().flat_map(u16::to_be_bytes)).collect(),
        ];
        let dir = scratch("roundtrip");
        for (index, bytes) in samples.iter().enumerate() {
            let path = dir.join(format!("sample{index}.txt"));
            fs::write(&path, bytes).unwrap();
            let file = read_text(&path).unwrap();
            assert!(!file.text.contains('\r'));
            write_text(&path, &file.text, file.encoding, file.line_ending, Some(file.modified)).unwrap();
            assert_eq!(&fs::read(&path).unwrap(), bytes, "sample {index}");
        }
        assert_eq!(fs::read_dir(&dir).unwrap().count(), samples.len(), "no temporary or backup files left behind");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn reads_legacy_ansi_text_and_refuses_binary() {
        let (text, encoding) = decode(b"caf\xe9").unwrap();
        assert_eq!(encoding, TextEncoding::Ansi);
        assert_eq!(text.chars().count(), 4);
        assert!(decode(b"\x89PNG\r\n\x1a\n\0\0\0").is_err());
    }

    #[test]
    fn saves_ansi_text_as_utf8_when_it_no_longer_fits_the_code_page() {
        let (bytes, used) = encode("emoji \u{1F600}", TextEncoding::Ansi, LineEnding::Lf);
        assert_eq!(used, TextEncoding::Utf8);
        assert_eq!(String::from_utf8(bytes).unwrap(), "emoji \u{1F600}");
    }

    #[test]
    fn refuses_to_overwrite_a_file_changed_on_disk() {
        let dir = scratch("conflict");
        let path = dir.join("note.md");
        fs::write(&path, "first").unwrap();
        let file = read_text(&path).unwrap();
        assert_eq!(write_text(&path, "mine", file.encoding, file.line_ending, Some(file.modified - 1)).unwrap_err(), "changed-on-disk");
        assert_eq!(fs::read_to_string(&path).unwrap(), "first");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn only_existing_files_count_as_launch_arguments() {
        let dir = scratch("args");
        fs::write(dir.join("a.md"), "x").unwrap();
        let found = files_in_args(["C:\\nolithium.exe".to_string(), "a.md".into(), "--flag".into(), "missing.md".into()].into_iter().skip(1), &dir);
        assert_eq!(found, vec![dir.join("a.md")]);
        fs::remove_dir_all(dir).unwrap();
    }
}
