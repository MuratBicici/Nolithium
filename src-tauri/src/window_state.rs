//! Remembers the main window's size, position and maximized state between runs.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, PhysicalPosition, PhysicalSize, Runtime, Window, WebviewWindow};

use crate::storage::{data_dir, read_optional, write_atomic};

const STATE_FILE: &str = "window.json";
/// How much of the window must land on a monitor for a saved position to be reused.
const MIN_VISIBLE: i64 = 120;

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub struct WindowState {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    maximized: bool,
}

type Rect = (i64, i64, i64, i64);

/// True when the window overlaps some monitor by at least `MIN_VISIBLE` px both ways,
/// so a disconnected screen never leaves the window off-screen.
fn is_reachable(state: &WindowState, monitors: &[Rect]) -> bool {
    monitors.iter().any(|&(x, y, width, height)| {
        let overlap_x = (state.x as i64 + state.width as i64).min(x + width) - (state.x as i64).max(x);
        let overlap_y = (state.y as i64 + state.height as i64).min(y + height) - (state.y as i64).max(y);
        overlap_x >= MIN_VISIBLE && overlap_y >= MIN_VISIBLE
    })
}

fn load(app: &AppHandle) -> Option<WindowState> {
    let raw = read_optional(&data_dir(app).ok()?.join(STATE_FILE)).ok()??;
    serde_json::from_str(&raw).ok()
}

/// Applies the saved state, then shows the window (it starts hidden to avoid a jump).
pub fn restore(app: &AppHandle, window: &WebviewWindow) {
    if let Some(state) = load(app) {
        let monitors: Vec<Rect> = window.available_monitors().unwrap_or_default().iter().map(|monitor| {
            let (position, size) = (monitor.position(), monitor.size());
            (position.x as i64, position.y as i64, size.width as i64, size.height as i64)
        }).collect();
        if state.width >= 200 && state.height >= 200 && is_reachable(&state, &monitors) {
            let _ = window.set_size(PhysicalSize::new(state.width, state.height));
            let _ = window.set_position(PhysicalPosition::new(state.x, state.y));
        }
        if state.maximized {
            let _ = window.maximize();
        }
    }
    let _ = window.show();
}

/// Saves on close. A maximized window keeps its last normal bounds so restore returns there.
pub fn save<R: Runtime>(app: &AppHandle, window: &Window<R>) {
    if window.is_minimized().unwrap_or(false) {
        return;
    }
    let maximized = window.is_maximized().unwrap_or(false);
    let state = match (maximized, load(app), window.outer_position(), window.inner_size()) {
        (true, Some(previous), _, _) => WindowState { maximized: true, ..previous },
        (_, _, Ok(position), Ok(size)) => WindowState { x: position.x, y: position.y, width: size.width, height: size.height, maximized },
        _ => return,
    };
    if let (Ok(dir), Ok(json)) = (data_dir(app), serde_json::to_string(&state)) {
        let _ = write_atomic(&dir.join(STATE_FILE), &json);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SCREEN: Rect = (0, 0, 1920, 1080);

    fn at(x: i32, y: i32) -> WindowState {
        WindowState { x, y, width: 1000, height: 820, maximized: false }
    }

    #[test]
    fn keeps_positions_that_are_on_screen() {
        assert!(is_reachable(&at(100, 100), &[SCREEN]));
        assert!(is_reachable(&at(1700, 900), &[SCREEN]));
    }

    #[test]
    fn rejects_positions_on_a_missing_monitor() {
        assert!(!is_reachable(&at(2500, 100), &[SCREEN]));
        assert!(!is_reachable(&at(1850, 100), &[SCREEN]));
        assert!(is_reachable(&at(2500, 100), &[SCREEN, (1920, 0, 2560, 1440)]));
    }
}
