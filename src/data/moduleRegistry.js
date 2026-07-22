import { HYDRA_EXAMPLES, HYDRA_ATOMIC } from './hydraExamples.js'
import { effects } from '../fx/effects.js'

export const MODULE_CATEGORIES = [
  { id: 'hydra-basics', label: 'Hydra — Basics', icon: '\u25A0', color: '#4fc3f7' },
  { id: 'hydra-source', label: 'Hydra — Source', icon: '\u25C8', color: '#bb86fc' },
  { id: 'hydra-geometry', label: 'Hydra — Geometry', icon: '\u2B22', color: '#4caf50' },
  { id: 'hydra-color', label: 'Hydra — Color', icon: '\u25D0', color: '#ff7043' },
  { id: 'hydra-combination', label: 'Hydra — Combination', icon: '\u25C6', color: '#ffca28' },
  { id: 'hydra-blend', label: 'Hydra — Blend', icon: '\u25C7', color: '#ab47bc' },
  { id: 'hydra-modulation', label: 'Hydra — Modulation', icon: '\u25CB', color: '#26c6da' },
  { id: 'hydra-feedback', label: 'Hydra — Feedback', icon: '\u21BA', color: '#ef5350' },
  { id: 'hydra-audio', label: 'Hydra — Audio-Reactive', icon: '\u266A', color: '#66bb6a' },
  { id: 'hydra-external', label: 'Hydra — External Sources', icon: '\u25A3', color: '#8d6e63' },
  { id: 'fx-color', label: 'FX — Color', icon: '\u25D1', color: '#e57373' },
  { id: 'fx-distort', label: 'FX — Distort', icon: '\u25B3', color: '#ba68c8' },
]

const CATEGORY_MAP = {
  'Basics': 'hydra-basics',
  'Source': 'hydra-source',
  'Combination': 'hydra-combination',
  'Blend': 'hydra-blend',
  'Modulation': 'hydra-modulation',
  'Feedback': 'hydra-feedback',
  'Color': 'hydra-color',
  'Geometry': 'hydra-geometry',
  'Audio-Reactive': 'hydra-audio',
  'ExternalSources': 'hydra-external',
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

  // Hydra atomic functions
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
      description: `Hydra ${fn.category} function`,
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
