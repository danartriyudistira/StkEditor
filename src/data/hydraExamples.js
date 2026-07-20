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

// ── ATOMIC FUNCTION MODULES ──────────────────────────────

export const HYDRA_ATOMIC = [
  // ── Source ────────────────────────────────────────────────
  { name: 'noise()', category: 'Source', code: `noise(10, 0.1).out()` },
  { name: 'voronoi()', category: 'Source', code: `voronoi(5, 0.3, 0.3).out()` },
  { name: 'osc()', category: 'Source', code: `osc(60, 0.1, 0).out()` },
  { name: 'shape()', category: 'Source', code: `shape(3, 0.3, 0.01).out()` },
  { name: 'gradient()', category: 'Source', code: `gradient(0).out()` },
  { name: 'src()', category: 'Source', code: `src(o0).out()` },
  { name: 'solid()', category: 'Source', code: `solid(1, 1, 1).out()` },
  { name: 'prev()', category: 'Source', code: `prev().out()` },

  // ── Geometry ──────────────────────────────────────────────
  { name: 'rotate()', category: 'Geometry', code: `osc(60)\n  .rotate(10, 0)\n  .out()` },
  { name: 'scale()', category: 'Geometry', code: `osc(60)\n  .scale(1.5, 1, 1, 0.5, 0.5)\n  .out()` },
  { name: 'pixelate()', category: 'Geometry', code: `osc(60)\n  .pixelate(20, 20)\n  .out()` },
  { name: 'repeat()', category: 'Geometry', code: `osc(60)\n  .repeat(3, 3, 0, 0)\n  .out()` },
  { name: 'repeatX()', category: 'Geometry', code: `osc(60)\n  .repeatX(3, 0)\n  .out()` },
  { name: 'repeatY()', category: 'Geometry', code: `osc(60)\n  .repeatY(3, 0)\n  .out()` },
  { name: 'kaleid()', category: 'Geometry', code: `osc(60)\n  .kaleid(4)\n  .out()` },
  { name: 'scroll()', category: 'Geometry', code: `osc(60)\n  .scroll(0.5, 0.5, 0, 0)\n  .out()` },
  { name: 'scrollX()', category: 'Geometry', code: `osc(60)\n  .scrollX(0.5, 0)\n  .out()` },
  { name: 'scrollY()', category: 'Geometry', code: `osc(60)\n  .scrollY(0.5, 0)\n  .out()` },

  // ── Color ─────────────────────────────────────────────────
  { name: 'posterize()', category: 'Color', code: `osc(60)\n  .posterize(3, 0.6)\n  .out()` },
  { name: 'shift()', category: 'Color', code: `osc(60)\n  .shift(0.5, 0, 0, 0)\n  .out()` },
  { name: 'invert()', category: 'Color', code: `osc(60)\n  .invert(1)\n  .out()` },
  { name: 'contrast()', category: 'Color', code: `osc(60)\n  .contrast(1.6)\n  .out()` },
  { name: 'brightness()', category: 'Color', code: `osc(60)\n  .brightness(0.4)\n  .out()` },
  { name: 'luma()', category: 'Color', code: `osc(60)\n  .luma(0.5, 0.1)\n  .out()` },
  { name: 'thresh()', category: 'Color', code: `osc(60)\n  .thresh(0.5, 0.04)\n  .out()` },
  { name: 'color()', category: 'Color', code: `osc(60)\n  .color(1, 1, 1, 1)\n  .out()` },
  { name: 'saturate()', category: 'Color', code: `osc(60)\n  .saturate(2)\n  .out()` },
  { name: 'hue()', category: 'Color', code: `osc(60)\n  .hue(0.4)\n  .out()` },
  { name: 'colorama()', category: 'Color', code: `osc(60)\n  .colorama(0.005)\n  .out()` },
  { name: 'sum()', category: 'Color', code: `osc(60)\n  .sum(1)\n  .out()` },
  { name: 'r()', category: 'Color', code: `osc(60)\n  .r(1, 0)\n  .out()` },
  { name: 'g()', category: 'Color', code: `osc(60)\n  .g(1, 0)\n  .out()` },
  { name: 'b()', category: 'Color', code: `osc(60)\n  .b(1, 0)\n  .out()` },
  { name: 'a()', category: 'Color', code: `osc(60)\n  .a(1, 0)\n  .out()` },

  // ── Blend (Combine) ───────────────────────────────────────
  { name: 'add()', category: 'Blend', code: `osc(60)\n  .add(osc(20), 1)\n  .out()` },
  { name: 'sub()', category: 'Blend', code: `osc(60)\n  .sub(osc(20), 1)\n  .out()` },
  { name: 'layer()', category: 'Blend', code: `osc(60)\n  .layer(shape(4).color(1,0,0))\n  .out()` },
  { name: 'blend()', category: 'Blend', code: `osc(60)\n  .blend(voronoi(3), 0.5)\n  .out()` },
  { name: 'mult()', category: 'Blend', code: `osc(60)\n  .mult(noise(3), 1)\n  .out()` },
  { name: 'diff()', category: 'Blend', code: `osc(60)\n  .diff(noise(3))\n  .out()` },
  { name: 'mask()', category: 'Blend', code: `osc(60)\n  .mask(shape(4))\n  .out()` },

  // ── Modulate (CombineCoord) ───────────────────────────────
  { name: 'modulate()', category: 'Modulation', code: `osc(60)\n  .modulate(noise(3), 0.1)\n  .out()` },
  { name: 'modulateScale()', category: 'Modulation', code: `osc(60)\n  .modulateScale(noise(3), 1)\n  .out()` },
  { name: 'modulatePixelate()', category: 'Modulation', code: `osc(60)\n  .modulatePixelate(noise(3), 10, 3)\n  .out()` },
  { name: 'modulateRotate()', category: 'Modulation', code: `osc(60)\n  .modulateRotate(noise(3), 1, 0)\n  .out()` },
  { name: 'modulateKaleid()', category: 'Modulation', code: `osc(60)\n  .modulateKaleid(4)\n  .out()` },
  { name: 'modulateHue()', category: 'Modulation', code: `osc(60)\n  .modulateHue(voronoi(3), 1)\n  .out()` },
  { name: 'modulateRepeat()', category: 'Modulation', code: `osc(60)\n  .modulateRepeat(noise(3), 3, 3, 0.5)\n  .out()` },
  { name: 'modulateRepeatX()', category: 'Modulation', code: `osc(60)\n  .modulateRepeatX(noise(3), 3, 0.5)\n  .out()` },
  { name: 'modulateRepeatY()', category: 'Modulation', code: `osc(60)\n  .modulateRepeatY(noise(3), 3, 0.5)\n  .out()` },
  { name: 'modulateScrollX()', category: 'Modulation', code: `osc(60)\n  .modulateScrollX(noise(3), 0.5, 0)\n  .out()` },
  { name: 'modulateScrollY()', category: 'Modulation', code: `osc(60)\n  .modulateScrollY(noise(3), 0.5, 0)\n  .out()` },

  // ── External Sources ──────────────────────────────────────
  { name: 'initCam()', category: 'ExternalSources', code: `s0.initCam()`, raw: true },
  { name: 'initImage()', category: 'ExternalSources', code: `s0.initImage('https://example.com/image.jpg')`, raw: true },
  { name: 'initVideo()', category: 'ExternalSources', code: `s0.initVideo('https://example.com/video.mp4')`, raw: true },
  { name: 'initStream()', category: 'ExternalSources', code: `s0.initStream('https://example.com/stream')`, raw: true },
  { name: 'initScreen()', category: 'ExternalSources', code: `s0.initScreen()`, raw: true },
  { name: 'init()', category: 'ExternalSources', code: `init({ type: 'src', src: '' })`, raw: true },
]

export const HYDRA_CATEGORIES = [
  'All',
  'Basics',
  'Source',
  'Combination',
  'Blend',
  'Modulation',
  'Feedback',
  'Color',
  'Geometry',
  'Audio-Reactive',
  'ExternalSources',
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
