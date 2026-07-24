import { HYDRA_EXAMPLES, HYDRA_ATOMIC } from './hydraExamples.js'
import { effects } from '../fx/effects.js'

export const IPO_GROUPS = [
  { id: 'input',   label: 'INPUT \u2014 Sumber Data Visual',      color: '#4fc3f7' },
  { id: 'process', label: 'PROSES \u2014 Transformasi Visual',     color: '#ffca28' },
  { id: 'output',  label: 'OUTPUT \u2014 Tampilkan Hasil',         color: '#ef5350' },
  { id: 'examples',label: 'Contoh Sketsa Lengkap',                 color: '#7e57c2' },
]

export const MODULE_CATEGORIES = [
  { id: 'hydra-source',    group: 'input',    label: 'Source',           icon: '\u25C7', color: '#bb86fc', desc: 'Generator pola dasar (gelombang, noise, bentuk)' },
  { id: 'hydra-external',  group: 'input',    label: 'External Sources', icon: '\u229E', color: '#8d6e63', desc: 'Kamera, gambar, video, screen capture' },
  { id: 'hydra-feedback',  group: 'input',    label: 'Feedback',         icon: '\u21BA', color: '#66bb6a', desc: 'Output sebelumnya sebagai input baru' },
  { id: 'hydra-geometry',  group: 'process',  label: 'Geometry',         icon: '\u2B22', color: '#4caf50', desc: 'Transformasi koordinat (rotasi, skala, ulang)' },
  { id: 'hydra-color',     group: 'process',  label: 'Color',            icon: '\u25D0', color: '#ff7043', desc: 'Penyesuaian warna (hue, kontras, saturasi)' },
  { id: 'hydra-blend',     group: 'process',  label: 'Blend',            icon: '\u25C7', color: '#ab47bc', desc: 'Gabungkan dua visual (tambah, kali, layer)' },
  { id: 'hydra-modulation',group: 'process',  label: 'Modulation',       icon: '\u25CB', color: '#26c6da', desc: 'Modulasi berbasis koordinat dari tekstur kedua' },
  { id: 'hydra-render',    group: 'output',   label: 'Render',           icon: '\u25B6', color: '#ef5350', desc: 'Render / tampilkan hasil ke layar' },
  { id: 'hydra-basics',    group: 'examples', label: 'Basics',           icon: '\u25A0', color: '#4fc3f7', desc: 'Contoh dasar lengkap siap pakai' },
  { id: 'hydra-combination',group:'examples',  label: 'Combination',     icon: '\u25C6', color: '#ffca28', desc: 'Contoh kombinasi beberapa fungsi' },
  { id: 'hydra-audio',     group: 'examples', label: 'Audio-Reactive',   icon: '\u266A', color: '#66bb6a', desc: 'Contoh reaktif audio (FFT)' },
  { id: 'fx-color',        group: 'fx',       label: 'FX \u2014 Color',   icon: '\u25D1', color: '#e57373', desc: 'Efek warna WebGL tambahan' },
  { id: 'fx-distort',      group: 'fx',       label: 'FX \u2014 Distort', icon: '\u25B3', color: '#ba68c8', desc: 'Efek distorsi WebGL tambahan' },
]

const CATEGORY_MAP = {
  'Source':           'hydra-source',
  'ExternalSources':  'hydra-external',
  'Color':            'hydra-color',
  'Geometry':         'hydra-geometry',
  'Blend':            'hydra-blend',
  'Modulation':       'hydra-modulation',
  'Render':           'hydra-render',
  'Basics':           'hydra-basics',
  'Combination':      'hydra-combination',
  'Feedback':         'hydra-feedback',
  'Audio-Reactive':   'hydra-audio',
}

const FX_CATEGORY_MAP = {
  'Color':   'fx-color',
  'Distort': 'fx-distort',
}

function stripOut(code) {
  const lines = code.split('\n')
  let lastIdx = lines.length - 1
  while (lastIdx >= 0 && lines[lastIdx].trim() === '') lastIdx--

  const outOnly = lines
    .slice(0, lastIdx + 1)
    .filter(line => line.trim() !== '.out()')
    .map((line, i, arr) => {
      if (i === arr.length - 1) {
        return line.replace(/\.out\(\)\s*$/, '')
      }
      return line
    })
    .join('\n')
    .trim()
  return outOnly
}

export function buildModules() {
  const modules = []

  for (const ex of HYDRA_EXAMPLES) {
    const catId = CATEGORY_MAP[ex.category]
    if (!catId) continue
    modules.push({
      id: `hydra-${ex.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
      name: ex.name,
      category: catId,
      source: 'hydra',
      type: 'insert',
      snippet: stripOut(ex.code),
      description: `Hydra ${ex.category} sketch`,
    })
  }

  for (const fn of HYDRA_ATOMIC) {
    const catId = CATEGORY_MAP[fn.category]
    if (!catId) continue
    modules.push({
      id: `hydra-atomic-${fn.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
      name: fn.name,
      category: catId,
      source: 'hydra',
      type: 'insert',
      snippet: fn.raw ? fn.code : stripOut(fn.code),
      description: fn.desc || `Hydra ${fn.category} function`,
    })
  }

  for (const fx of effects) {
    const catId = FX_CATEGORY_MAP[fx.category]
    if (!catId) continue
    modules.push({
      id: fx.id,
      name: fx.label,
      category: catId,
      source: 'fx',
      type: 'fx',
      snippet: '',
      description: fx.category + ' effect',
    })
  }

  return modules
}

export function getModulesByCategory(modules) {
  const map = {}
  for (const m of modules) {
    if (!map[m.category]) map[m.category] = []
    map[m.category].push(m)
  }
  return map
}
