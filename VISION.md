# STK Editor — Visi & Dokumentasi Pengembangan

## Visi
STK Editor adalah web-based GLSL fragment shader editor dengan live preview, MIDI/OSC control, audio monitoring, dan koneksi ke TV/Console (Android TV, Raspberry Pi, Android Box).

**Misi:** Membuat ekosistem shader real-time yang terintegrasi antara创作 (editor), performance (console), dan kontrol (MIDI/OSC).

---

## Arsitektur Aplikasi

### Tech Stack
- **Frontend**: React 19 + Vite + Monaco Editor
- **Shader**: ISF v2 (Interactive Shader Format) via `interactive-shader-format` npm
- **Audio**: Web Audio API (OscillatorNode, 4-voice polyphony)
- **State**: React hooks + refs
- **ZIP**: JSZip untuk export/import project
- **Deploy**: GitHub Pages + GitHub Actions

### Struktur Folder
```
StkEditor/
├── src/
│   ├── App.jsx              ← Main app, state management
│   ├── App.css              ← All styles
│   ├── main.jsx             ← Entry point
│   ├── components/
│   │   ├── Editor.jsx       ← Monaco Editor + GLSL syntax
│   │   ├── Preview.jsx      ← WebGL live preview (ISF Renderer)
│   │   ├── TabBar.jsx       ← Tab system + Open/Download/Export
│   │   ├── Toolbar.jsx      ← Header: Import/Export/Library/Source/Console
│   │   ├── Controls.jsx     ← ISF shader uniform controls
│   │   ├── CcPanel.jsx      ← 8 CC sliders + CC-to-input mapping
│   │   ├── FxPanel.jsx      ← FX chain (8 effects, CC-driven)
│   │   ├── MidiPanel.jsx    ← MIDI input/output, CC mapping, note trigger
│   │   ├── RandomGenPanel.jsx ← Auto note generator
│   │   ├── AudioPanel.jsx   ← Synthesizer (11 presets, visualizer)
│   │   ├── OscPanel.jsx     ← TouchOSC WebSocket receiver
│   │   ├── ISFLibrary.jsx   ← 328 ISF shaders browser
│   │   └── ErrorBoundary.jsx
│   ├── audio/
│   │   ├── synthesizer.js   ← Web Audio oscillator synth (11 presets)
│   │   └── randomGen.js     ← C minor pentatonic note generator
│   ├── connectivity/
│   │   └── oscReceiver.js   ← WebSocket client for TouchOSC
│   ├── fx/
│   │   ├── effects.js       ← 8 effect definitions (GLSL)
│   │   └── FxProcessor.js   ← WebGL FBO ping-pong effect renderer
│   └── lib/
│       └── stkArchive.js    ← ZIP export/import (JSZip)
├── public/
│   └── ISF/                 ← 328 ISF shader files (.fs)
├── scripts/
│   └── prepare-isf.js       ← Build script: copy ISF files
├── index.html
├── vite.config.js
└── package.json
```

---

## Fitur yang Sudah Terimplementasi

### 1. Code Editor (Tab System)
- **Monaco Editor** dengan GLSL syntax highlighting
- **Tab system**: buka multiple file sekaligus
- **Tab operations**: New, Close, Switch, Rename (double-click)
- **File operations**: Open (.fs), Download (.fs), Export (.stk ZIP)

### 2. Live Preview
- **ISF Renderer** — render shader ISF v2 secara real-time
- **Source Image Input** — 3 mode:
  - Placeholder gradient (default)
  - Upload image
  - Webcam
- **Auto-detect** inputImage shader type

### 3. CC Control (8 Channels)
- **8 CC sliders** (CC1-CC8), range 0.0-1.0
- **CC-to-Input Mapping** — map ISF shader inputs ke CC channels
- **Auto-remap** ke MIN..MAX range dari ISF metadata

### 4. MIDI Input
- **Device selection** — pilih device atau "All Devices" / "None"
- **Channel filter** — All Ch / Ch 1-16
- **CC Mapping** — MIDI CC → CC Channel
- **Note Trigger Mapping** — MIDI note → CC Channel / Effect toggle
- **Active notes display** — badge biru saat note aktif

### 5. MIDI Output
- **Device selection** — pilih output device
- **Channel selection** — All Ch / Ch 1-16
- **Auto-send** — CC changes dan note triggers otomatis terkirim
- **Input devices** juga ditampilkan di dropdown (untuk USB MIDI)

### 6. Random Note Generator
- **Scale**: C minor pentatonic (C, Db, Eb, G, Ab)
- **5 pitch sets** dengan auto-shuffle
- **BPM**: 40-240
- **Note Divider**: 1/4, 1/8, 1/16, 1/32
- **Trigger ke**: internal synth + MIDI output

### 7. Audio Synthesizer
- **4-voice polyphony** (OscillatorNode, bukan ScriptProcessor)
- **11 presets**: Saw Lead, Square, Triangle, Sine Pad, Bass, Brass, Keys, Organ, Bell, Pulse, Gamelan
- **Volume control** + **frequency visualizer**
- **Toggle ON/OFF** — tidak auto-start

### 8. FX Chain (8 Effects)
- Invert, Mirror, Glitch, Brightness, Contrast, Color Shift, Displace, Pixelate
- **CC-driven** — setiap effect di-map ke CC channel
- **Toggle CC** — enable/disable effect via CC range
- **Per-parameter CC mapping**

### 9. OSC Receiver (TouchOSC)
- **WebSocket client** — connect ke TouchOSC WebSocket server
- **Address-to-CC mapping** — `/fader1` → `u_cc1`
- **Auto-reconnect**
- **Editable mapping**

### 10. STK Project (ZIP Archive)
- **Export** — simpan seluruh project sebagai `.stk` (ZIP)
- **Import** — load `.stk` ZIP (replace seluruh project)
- **Format**: `project.json` + `.fs` files + settings
- **Backward compatible** dengan `.stkfx` lama

### 11. Send to Console
- **WebSocket** ke Android TV / Console
- **Configurable** host:port (default `localhost:8765`)
- **Config persisted** di localStorage
- **Sends**: shader code + CC values + FX chain + triggers

### 12. Deploy
- **GitHub Pages** via GitHub Actions
- **Auto-build** on push to master
- **Live**: https://danartriyudistira.github.io/StkEditor/

---

## File Format

### `.fs` — Shader File
GLSL fragment shader dengan ISF metadata header:
```glsl
/*{
  "DESCRIPTION": "Shader name",
  "INPUTS": [
    { "NAME": "inputImage", "TYPE": "image" },
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0, "MAX": 2 }
  ],
  "CATEGORIES": ["Generator"]
}
*/
void main() {
  // GLSL code
}
```

### `.stkfx` — FX Chain File
```json
{
  "version": 1,
  "shader": "filename.fs",
  "fxChain": [
    { "id": "fx_glitch", "cc": 5, "enabled": true, "paramValues": {...} }
  ],
  "ccLabels": []
}
```

### `.stk` — Project Archive (ZIP)
```
project.stk (ZIP)
├── project.json        ← metadata + settings
├── shader1.fs          ← tab files
├── shader2.fs
└── ...
```

`project.json`:
```json
{
  "version": 2,
  "projectName": "My Project",
  "tabs": [{ "name": "shader.fs", "code": "..." }],
  "fxChain": [...],
  "ccValues": { "u_cc1": 0.5, ... },
  "ccMapping": { "speed": "cc1" },
  "console": { "host": "localhost", "port": 8765 },
  "audio": { "presetIndex": 3 }
}
```

---

## Alur Data Utama

```
┌─────────────────────────────────────────────────┐
│                    INPUT                         │
├─────────────┬─────────────┬─────────────────────┤
│ MIDI Input  │ Random Gen  │ OSC Receiver        │
│ (keyboard)  │ (auto)      │ (TouchOSC)          │
└──────┬──────┴──────┬──────┴──────────┬──────────┘
       │             │                 │
       ▼             ▼                 ▼
┌─────────────────────────────────────────────────┐
│              CC Values (u_cc1-u_cc8)             │
│              + Note Triggers                     │
└──────────────────────┬──────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌──────────┐   ┌──────────────┐  ┌──────────┐
│ Preview  │   │ Audio Synth  │  │ MIDI Out │
│ (ISF)    │   │ (Speaker)    │  │ (Device) │
└──────────┘   └──────────────┘  └──────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│              FX Chain (8 effects)                │
│              CC-driven post-processing           │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              Send to Console (WebSocket)          │
│              → Android TV / Raspberry Pi          │
└─────────────────────────────────────────────────┘
```

---

## Console / Android TV = STK Player

### Dua Mode Komunikasi
1. **WebSocket** — live production (real-time edit dari editor)
2. **ZIP Import** — load project dari file (replace seluruh)

### Alur
```
Editor → Send to Console (WebSocket, live replace 100%)
Console → Import .stk (user save di TV, load ke editor untuk edit)
```

### Console Features
- WebSocket server (port 8765) — terima shader dari editor
- Import .stk ZIP — load project dari file
- Reset — kembali ke default
- Tidak ada export dari console

---

## Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+B | Toggle editor panel |
| Ctrl+. | Toggle controls panel |
| Ctrl+S | Save/Export .stk |
| Ctrl+O | Load/Import .stk |
| Ctrl+T | New tab |
| Ctrl+W | Close tab |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |

---

## Known Issues & TODO

### MIDI Output
- Beberapa USB MIDI device tidak terdeteksi sebagai output di Web MIDI API
- Solusi: loopMIDI (virtual MIDI cable) atau driver device
- Perlu research: bagaimana onlinesequencer.net implement MIDI output

### Audio
- ScriptProcessorNode sudah diganti OscillatorNode (lebih ringan)
- Belum ada preset management (save/load audio preset)

### UI
- Belum responsive (mobile)
- Belum ada undo/redo untuk CC/FX changes
- Belum ada visual feedback untuk CC changes

### Performance
- Bundle size > 500KB (perlu code splitting)
- Monaco Editor besar, bisa di-lazy load

---

## Repository & Deploy
- **Code**: https://github.com/danartriyudistira/StkEditor
- **Live**: https://danartriyudistira.github.io/StkEditor/
- **Console**: https://github.com/danartriyudistira/ShaderTV
- **Deploy**: GitHub Actions on push to master

---

## Rules untuk AI Lain
1. **Bahasa**: User berkomunikasi dalam Bahasa Indonesia
2. **Console** = Android TV / Raspberry Pi / Android Box
3. **STK** = file extension untuk project archive (ZIP)
4. **ISF** = Interactive Shader Format v2
5. **Source Image** = placeholder/upload/webcam untuk ISF shaders
6. **Audio Synth** = pakai OscillatorNode (bukan ScriptProcessor)
7. **MIDI Thru** = Random Gen → internal synth + MIDI output ( dua arah )
8. **Tab system** = code editor hanya untuk shader, project management di Toolbar
