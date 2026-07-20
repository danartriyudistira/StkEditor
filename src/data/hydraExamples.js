/**
 * Curated collection of Hydra shader examples organized by category.
 * Used by the Hydra Gallery, Random Sketch, and as seed for Mutate.
 */

export const HYDRA_EXAMPLES = [
  // ── Basics ──────────────────────────────────────────────
  {
    name: 'Simple Oscillator',
    category: 'Basics',
    code: `osc(10, 0.1, 0.8)
  .rotate(0.5)
  .out()`,
  },
  {
    name: 'Slow Sine Wave',
    category: 'Basics',
    code: `osc(60, 0.01, 2)
  .out()`,
  },
  {
    name: 'Voronoi Cells',
    category: 'Basics',
    code: `voronoi(3, 0.5, 0.3)
  .out()`,
  },
  {
    name: 'Voronoi Distorted',
    category: 'Basics',
    code: `voronoi(5, 0.3, 0.5)
  .modulate(noise(3), 0.3)
  .out()`,
  },
  {
    name: 'Noise Texture',
    category: 'Basics',
    code: `noise(3, 0.1)
  .out()`,
  },
  {
    name: 'Animated Noise',
    category: 'Basics',
    code: `noise(2, 0.05)
  .rotate(0.1, 0.05)
  .out()`,
  },
  {
    name: 'Polygon Shape',
    category: 'Basics',
    code: `shape(3, 0.3, 0.01)
  .out()`,
  },
  {
    name: 'Shape Rotate',
    category: 'Basics',
    code: `shape(6, 0.4, 0.01)
  .rotate(0.5, 0.1)
  .out()`,
  },
  {
    name: 'Gradient',
    category: 'Basics',
    code: `gradient(0.5)
  .out()`,
  },
  {
    name: 'Solid Color',
    category: 'Basics',
    code: `solid(0.1, 0.2, 0.4)
  .out()`,
  },

  // ── Combination ─────────────────────────────────────────
  {
    name: 'Osc + Voronoi Blend',
    category: 'Combination',
    code: `osc(8, 0.1, 0.5)
  .blend(voronoi(3, 0.5, 0.3), 0.5)
  .out()`,
  },
  {
    name: 'Layered Shapes',
    category: 'Combination',
    code: `solid(0, 0, 0)
  .layer(shape(4, 0.3).color(1, 0, 0).rotate(0.5))
  .layer(shape(3, 0.2).color(0, 0, 1).rotate(-0.3))
  .out()`,
  },
  {
    name: 'Diff Noise',
    category: 'Combination',
    code: `osc(5, 0.1, 0.5)
  .diff(noise(3))
  .out()`,
  },
  {
    name: 'Add Gradient',
    category: 'Combination',
    code: `osc(10, 0.1, 0.5)
  .add(gradient(2), 0.3)
  .out()`,
  },
  {
    name: 'Mult Feedback',
    category: 'Combination',
    code: `voronoi(3, 0.2, 0.1)
  .mult(src(o0).scale(0.98), 0.5)
  .out()`,
  },

  // ── Modulation ──────────────────────────────────────────
  {
    name: 'Modulate Osc',
    category: 'Modulation',
    code: `osc(10, 0.1, 0.5)
  .modulate(noise(2), 0.5)
  .out()`,
  },
  {
    name: 'Modulate Rotate',
    category: 'Modulation',
    code: `osc(8, 0.2, 0.5)
  .modulateRotate(noise(2), 1)
  .out()`,
  },
  {
    name: 'Modulate Scale',
    category: 'Modulation',
    code: `shape(4, 0.3, 0.01)
  .modulateScale(noise(3), 0.5)
  .out()`,
  },
  {
    name: 'Modulate Pixelate',
    category: 'Modulation',
    code: `osc(10, 0.1, 0.5)
  .modulatePixelate(noise(2), 100)
  .out()`,
  },
  {
    name: 'Modulate Kaleid',
    category: 'Modulation',
    code: `voronoi(3, 0.2, 0.1)
  .modulateKaleid(4)
  .out()`,
  },

  // ── Feedback ────────────────────────────────────────────
  {
    name: 'Basic Feedback',
    category: 'Feedback',
    code: `osc(10, 0.1, 0.5)
  .rotate(0.1)
  .blend(src(o0), 0.9)
  .out()`,
  },
  {
    name: 'Feedback Fade',
    category: 'Feedback',
    code: `osc(8, 0.1, 0.5)
  .rotate(0.1)
  .blend(src(o0), 0.5)
  .out()`,
  },
  {
    name: 'Voronoi Feedback',
    category: 'Feedback',
    code: `voronoi(3, 0.1, 0.1)
  .scrollX(0.01)
  .blend(src(o0), 0.95)
  .out()`,
  },
  {
    name: 'Noise Feedback Trail',
    category: 'Feedback',
    code: `noise(2, 0.05)
  .rotate(0.05)
  .blend(src(o0), 0.85)
  .saturate(1.2)
  .out()`,
  },

  // ── Color ───────────────────────────────────────────────
  {
    name: 'Hue Shift',
    category: 'Color',
    code: `osc(10, 0.1, 0.5)
  .hue(0.5)
  .out()`,
  },
  {
    name: 'Invert Colors',
    category: 'Color',
    code: `osc(8, 0.1, 0.5)
  .invert(1)
  .out()`,
  },
  {
    name: 'Posterize',
    category: 'Color',
    code: `osc(10, 0.1, 0.5)
  .posterize(4, 0.5)
  .out()`,
  },
  {
    name: 'Colorama Rainbow',
    category: 'Color',
    code: `osc(5, 0.1, 0.5)
  .colorama(0.5)
  .out()`,
  },
  {
    name: 'Contrast + Brightness',
    category: 'Color',
    code: `voronoi(3, 0.2, 0.1)
  .contrast(2)
  .brightness(0.3)
  .out()`,
  },
  {
    name: 'Luma Threshold',
    category: 'Color',
    code: `osc(10, 0.1, 0.5)
  .luma(0.5, 0.1)
  .out()`,
  },

  // ── Geometry ────────────────────────────────────────────
  {
    name: 'Kaleidoscope',
    category: 'Geometry',
    code: `osc(10, 0.1, 0.5)
  .kaleid(4)
  .out()`,
  },
  {
    name: 'Repeat Pattern',
    category: 'Geometry',
    code: `osc(10, 0.1, 0.5)
  .repeat(3, 3)
  .out()`,
  },
  {
    name: 'Pixelate',
    category: 'Geometry',
    code: `osc(10, 0.1, 0.5)
  .pixelate(20, 20)
  .out()`,
  },
  {
    name: 'Scroll',
    category: 'Geometry',
    code: `osc(10, 0.1, 0.5)
  .scrollX(0.5, 0.1)
  .scrollY(0.5, 0.1)
  .out()`,
  },
  {
    name: 'Scale Pulse',
    category: 'Geometry',
    code: `shape(4, 0.3, 0.01)
  .scale([1, 1.5, 1, 0.8].smooth(0.3))
  .out()`,
  },

  // ── Audio-Reactive ──────────────────────────────────────
  {
    name: 'FFT Osc',
    category: 'Audio-Reactive',
    code: `osc(10, 0.1, 0.8)
  .modulateScale(() => a.fft[0] * 2)
  .out()`,
  },
  {
    name: 'FFT Voronoi',
    category: 'Audio-Reactive',
    code: `voronoi(3, 0.1, 0.1)
  .modulateScale(() => a.fft[1] * 3)
  .colorama(() => a.fft[0])
  .out()`,
  },
  {
    name: 'FFT Kaleid',
    category: 'Audio-Reactive',
    code: `osc(10, 0.1, 0.5)
  .kaleid(() => 3 + Math.floor(a.fft[0] * 5))
  .modulateScale(() => a.fft[0] * 2)
  .out()`,
  },
  {
    name: 'FFT Noise Color',
    category: 'Audio-Reactive',
    code: `noise(3, () => a.fft[0] * 0.1)
  .color(() => a.fft[0], () => a.fft[1], () => a.fft[2])
  .out()`,
  },
  {
    name: 'FFT Blend',
    category: 'Audio-Reactive',
    code: `osc(8, 0.1, 0.5)
  .blend(voronoi(3), () => a.fft[0])
  .modulateRotate(() => a.fft[1] * 3)
  .out()`,
  },
  {
    name: 'FFT Feedback',
    category: 'Audio-Reactive',
    code: `osc(10, 0.1, 0.5)
  .modulateScale(() => a.fft[0] * 2)
  .blend(src(o0), 0.9)
  .out()`,
  },
]

export const HYDRA_CATEGORIES = [
  'All',
  'Basics',
  'Combination',
  'Modulation',
  'Feedback',
  'Color',
  'Geometry',
  'Audio-Reactive',
]

/** Pick a random example from the full list */
export function getRandomExample() {
  return HYDRA_EXAMPLES[Math.floor(Math.random() * HYDRA_EXAMPLES.length)]
}

/** Get examples filtered by category */
export function getExamplesByCategory(category) {
  if (!category || category === 'All') return HYDRA_EXAMPLES
  return HYDRA_EXAMPLES.filter(e => e.category === category)
}

/** Default code for new Hydra tabs */
export const DEFAULT_HYDRA_CODE = `// Hydra Shader — Livecoding Visuals
// Ctrl+Enter: run line | Ctrl+Shift+Enter: run all

osc(10, 0.1, 0.8)
  .rotate(0.5)
  .out()
`
