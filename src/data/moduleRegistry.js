import { HYDRA_EXAMPLES } from './hydraExamples.js'
import { effects } from '../fx/effects.js'

export const MODULE_CATEGORIES = [
  { id: 'hydra-basics', label: 'Hydra — Basics', icon: '\u25A0' },
  { id: 'hydra-combination', label: 'Hydra — Combination', icon: '\u25C6' },
  { id: 'hydra-modulation', label: 'Hydra — Modulation', icon: '\u25CB' },
  { id: 'hydra-feedback', label: 'Hydra — Feedback', icon: '\u21BA' },
  { id: 'hydra-color', label: 'Hydra — Color', icon: '\u25D0' },
  { id: 'hydra-geometry', label: 'Hydra — Geometry', icon: '\u2B22' },
  { id: 'hydra-audio', label: 'Hydra — Audio-Reactive', icon: '\u266A' },
  { id: 'fx-color', label: 'FX — Color', icon: '\u25D1' },
  { id: 'fx-distort', label: 'FX — Distort', icon: '\u25B3' },
]

const CATEGORY_MAP = {
  'Basics': 'hydra-basics',
  'Combination': 'hydra-combination',
  'Modulation': 'hydra-modulation',
  'Feedback': 'hydra-feedback',
  'Color': 'hydra-color',
  'Geometry': 'hydra-geometry',
  'Audio-Reactive': 'hydra-audio',
}

const FX_CATEGORY_MAP = {
  'Color': 'fx-color',
  'Distort': 'fx-distort',
}

function stripOut(code) {
  const lines = code.split('\n')
  let firstGen = true
  const result = lines
    .filter(line => line.trim() !== '.out()')
    .filter(line => {
      if (firstGen && line.trim()) {
        firstGen = false
        return false
      }
      return true
    })
    .join('\n')
    .trim()
  return result || code.replace(/\.out\(\)\s*$/, '').trim()
}

export function buildModules() {
  const modules = []

  // Hydra examples
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

  // FX effects
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
