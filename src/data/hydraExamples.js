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

// ── ATOMIC FUNCTION MODULES (IPO: Input → Process → Output) ──

export const HYDRA_ATOMIC = [
  // ◆ INPUT ◆ — Sumber data visual ───────────────────────────
  { name: 'osc()',     category: 'Source', code: `osc(60, 0.1, 0.5).out()`,          desc: 'Gelombang sinus periodik' },
  { name: 'noise()',   category: 'Source', code: `noise(10, 0.1).out()`,             desc: 'Tekstur noise acak' },
  { name: 'voronoi()', category: 'Source', code: `voronoi(5, 0.3, 0.3).out()`,       desc: 'Pola sel Voronoi' },
  { name: 'shape()',   category: 'Source', code: `shape(3, 0.3, 0.01).out()`,        desc: 'Bentuk poligon (3=segitiga, 4=kotak, 5=pentagon)' },
  { name: 'gradient()',category: 'Source', code: `gradient(0).out()`,                desc: 'Gradien linear horizontal/vertikal' },
  { name: 'solid()',   category: 'Source', code: `solid(1, 1, 1).out()`,             desc: 'Warna solid (R, G, B, [A])' },
  { name: 'src()',     category: 'Source', code: `src(o0).out()`,                    desc: 'Output buffer sebelumnya sebagai input' },
  { name: 'prev()',    category: 'Source', code: `prev().out()`,                     desc: 'Frame sebelumnya (shortcut src)' },

  // ◆ INPUT ◆ — External ──────────────────────────────────────
  { name: 'initCam()',    category: 'ExternalSources', code: `s0.initCam()`,          raw: true, desc: 'Inisialisasi kamera webcam' },
  { name: 'initImage()',  category: 'ExternalSources', code: `s0.initImage('rinkysplash.jpg')`, raw: true, desc: 'Muat gambar dari URL' },
  { name: 'initVideo()',  category: 'ExternalSources', code: `s0.initVideo('bigbuckbunny.mp4')`, raw: true, desc: 'Streaming video dari URL' },
  { name: 'initStream()', category: 'ExternalSources', code: `s0.initStream('https://example.com/stream')`, raw: true, desc: 'Stream layar / live stream' },
  { name: 'initScreen()', category: 'ExternalSources', code: `s0.initScreen()`,       raw: true, desc: 'Tangkap layar desktop' },
  { name: 'init()',       category: 'ExternalSources', code: `init({ type: 'src', src: '' })`, raw: true, desc: 'Inisialisasi generik' },

  // ◆ PROCESS ◆ — Geometry (Transformasi Koordinat) ──────────
  { name: 'rotate()',   category: 'Geometry', code: `osc(60)\n  .rotate(10, 0)\n  .out()`,               desc: 'Rotasi sudut (derajat, kecepatan)' },
  { name: 'scale()',    category: 'Geometry', code: `osc(60)\n  .scale(1.5, 1, 1, 0.5, 0.5)\n  .out()`,  desc: 'Perbesar/perkecil (skalaX, skalaY, pusatX, pusatY)' },
  { name: 'pixelate()', category: 'Geometry', code: `osc(60)\n  .pixelate(20, 20)\n  .out()`,             desc: 'Efek pikselasi (pixelX, pixelY)' },
  { name: 'repeat()',   category: 'Geometry', code: `osc(60)\n  .repeat(3, 3, 0, 0)\n  .out()`,           desc: 'Ulangi pola (repeatX, repeatY, offsetX, offsetY)' },
  { name: 'repeatX()',  category: 'Geometry', code: `osc(60)\n  .repeatX(3, 0)\n  .out()`,                desc: 'Ulangi horizontal saja' },
  { name: 'repeatY()',  category: 'Geometry', code: `osc(60)\n  .repeatY(3, 0)\n  .out()`,                desc: 'Ulangi vertikal saja' },
  { name: 'kaleid()',   category: 'Geometry', code: `osc(60)\n  .kaleid(4)\n  .out()`,                    desc: 'Efek kaleidoskop (jumlah sisi)' },
  { name: 'scroll()',   category: 'Geometry', code: `osc(60)\n  .scroll(0.5, 0.5, 0, 0)\n  .out()`,       desc: 'Geser tekstur (scrollX, scrollY, kecepatanX, kecepatanY)' },
  { name: 'scrollX()',  category: 'Geometry', code: `osc(60)\n  .scrollX(0.5, 0)\n  .out()`,              desc: 'Geser horizontal' },
  { name: 'scrollY()',  category: 'Geometry', code: `osc(60)\n  .scrollY(0.5, 0)\n  .out()`,              desc: 'Geser vertikal' },

  // ◆ PROCESS ◆ — Color (Penyesuaian Warna) ──────────────────
  { name: 'posterize()',  category: 'Color', code: `osc(60)\n  .posterize(3, 0.6)\n  .out()`,    desc: 'Kurangi jumlah warna (bins, gamma)' },
  { name: 'shift()',      category: 'Color', code: `osc(60)\n  .shift(0.5, 0, 0, 0)\n  .out()`,   desc: 'Geser channel RGB (r, g, b, a)' },
  { name: 'invert()',     category: 'Color', code: `osc(60)\n  .invert(1)\n  .out()`,             desc: 'Balikkan warna (amount)' },
  { name: 'contrast()',   category: 'Color', code: `osc(60)\n  .contrast(1.6)\n  .out()`,         desc: 'Tingkatkan kontras (amount)' },
  { name: 'brightness()', category: 'Color', code: `osc(60)\n  .brightness(0.4)\n  .out()`,       desc: 'Atur kecerahan (amount)' },
  { name: 'luma()',       category: 'Color', code: `osc(60)\n  .luma(0.5, 0.1)\n  .out()`,        desc: 'Threshold berbasis luminansi (threshold, tolerance)' },
  { name: 'thresh()',     category: 'Color', code: `osc(60)\n  .thresh(0.5, 0.04)\n  .out()`,     desc: 'Threshold hitam-putih tegas (threshold, tolerance)' },
  { name: 'color()',      category: 'Color', code: `osc(60)\n  .color(1, 1, 1, 1)\n  .out()`,     desc: 'Kalikan warna (r, g, b, a)' },
  { name: 'saturate()',   category: 'Color', code: `osc(60)\n  .saturate(2)\n  .out()`,           desc: 'Tingkatkan saturasi (amount)' },
  { name: 'hue()',        category: 'Color', code: `osc(60)\n  .hue(0.4)\n  .out()`,              desc: 'Geser rona warna (amount)' },
  { name: 'colorama()',   category: 'Color', code: `osc(60)\n  .colorama(0.005)\n  .out()`,       desc: 'Pergeseran rona drastis (amount)' },
  { name: 'sum()',        category: 'Color', code: `osc(60)\n  .sum(1)\n  .out()`,                desc: 'Jumlahkan semua channel RGB' },
  { name: 'r()',          category: 'Color', code: `osc(60)\n  .r(1, 0)\n  .out()`,               desc: 'Atur channel merah (scale, offset)' },
  { name: 'g()',          category: 'Color', code: `osc(60)\n  .g(1, 0)\n  .out()`,               desc: 'Atur channel hijau (scale, offset)' },
  { name: 'b()',          category: 'Color', code: `osc(60)\n  .b(1, 0)\n  .out()`,               desc: 'Atur channel biru (scale, offset)' },
  { name: 'a()',          category: 'Color', code: `osc(60)\n  .a(1, 0)\n  .out()`,               desc: 'Atur channel alpha (scale, offset)' },

  // ◆ PROCESS ◆ — Blend (Gabungkan Visual) ────────────────────
  { name: 'add()',   category: 'Blend', code: `osc(60)\n  .add(osc(20), 1)\n  .out()`,                   desc: 'Tambah (jumlahkan) dua visual' },
  { name: 'sub()',   category: 'Blend', code: `osc(60)\n  .sub(osc(20), 1)\n  .out()`,                   desc: 'Kurangi visual kedua dari pertama' },
  { name: 'layer()', category: 'Blend', code: `osc(60)\n  .layer(shape(4).color(1,0,0))\n  .out()`,      desc: 'Tumpuk lapisan (layer) di atas' },
  { name: 'blend()', category: 'Blend', code: `osc(60)\n  .blend(voronoi(3), 0.5)\n  .out()`,            desc: 'Campur dua visual (amount 0-1)' },
  { name: 'mult()',  category: 'Blend', code: `osc(60)\n  .mult(noise(3), 1)\n  .out()`,                 desc: 'Kalikan dua visual' },
  { name: 'diff()',  category: 'Blend', code: `osc(60)\n  .diff(noise(3))\n  .out()`,                    desc: 'Selisih absolut dua visual' },
  { name: 'mask()',  category: 'Blend', code: `osc(60)\n  .mask(shape(4))\n  .out()`,                    desc: 'Potong dengan bentuk (alpha mask)' },

  // ◆ PROCESS ◆ — Modulation (Modulasi Berbasis Koordinat) ───
  { name: 'modulate()',         category: 'Modulation', code: `osc(60)\n  .modulate(noise(3), 0.1)\n  .out()`,          desc: 'Geser koordinat tekstur (displacement)' },
  { name: 'modulateScale()',    category: 'Modulation', code: `osc(60)\n  .modulateScale(noise(3), 1)\n  .out()`,        desc: 'Skala berdasarkan tekstur kedua' },
  { name: 'modulatePixelate()', category: 'Modulation', code: `osc(60)\n  .modulatePixelate(noise(3), 10, 3)\n  .out()`, desc: 'Pikselasi dinamis berdasarkan tekstur' },
  { name: 'modulateRotate()',   category: 'Modulation', code: `osc(60)\n  .modulateRotate(noise(3), 1, 0)\n  .out()`,    desc: 'Rotasi dinamis berdasarkan tekstur' },
  { name: 'modulateKaleid()',   category: 'Modulation', code: `osc(60)\n  .modulateKaleid(4)\n  .out()`,                 desc: 'Kaleidoskop berbasis tekstur kedua' },
  { name: 'modulateHue()',      category: 'Modulation', code: `osc(60)\n  .modulateHue(voronoi(3), 1)\n  .out()`,        desc: 'Rona warna dari tekstur kedua' },
  { name: 'modulateRepeat()',   category: 'Modulation', code: `osc(60)\n  .modulateRepeat(noise(3), 3, 3, 0.5)\n  .out()`, desc: 'Pengulangan dinamis dari tekstur' },
  { name: 'modulateRepeatX()',  category: 'Modulation', code: `osc(60)\n  .modulateRepeatX(noise(3), 3, 0.5)\n  .out()`,  desc: 'Pengulangan horizontal dinamis' },
  { name: 'modulateRepeatY()',  category: 'Modulation', code: `osc(60)\n  .modulateRepeatY(noise(3), 3, 0.5)\n  .out()`,  desc: 'Pengulangan vertikal dinamis' },
  { name: 'modulateScrollX()',  category: 'Modulation', code: `osc(60)\n  .modulateScrollX(noise(3), 0.5, 0)\n  .out()`,  desc: 'Geser horizontal dari tekstur' },
  { name: 'modulateScrollY()',  category: 'Modulation', code: `osc(60)\n  .modulateScrollY(noise(3), 0.5, 0)\n  .out()`,  desc: 'Geser vertikal dari tekstur' },

  // ◆ OUTPUT ◆ — Render (Tampilkan Hasil) ─────────────────────
  { name: 'out()',    category: 'Render', code: `.out()`,              raw: true, desc: 'Render ke output buffer (o0)' },
  { name: 'render()', category: 'Render', code: `render(o0)`, raw: true,           desc: 'Render output buffer ke layar' },
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
  'Render',
]

/** Pick a random example from the full list */
export function getRandomExample() {
  return HYDRA_EXAMPLES[Math.floor(Math.random() * HYDRA_EXAMPLES.length)]
}

/** Default code for new Hydra tabs */
export const DEFAULT_HYDRA_CODE = `// Hydra Shader — Live Coding Visual
// Ctrl+Enter      : run seluruh kode
// Ctrl+Shift+Enter: run baris yang dipilih
// Shift+Tab       : buka modul (Input-Proses-Output)
//
// ◆ INPUT — sumber visual
//   osc() noise() voronoi() shape() solid() gradient()
// ◆ PROSES — transformasi
//   rotate() kaleid() scale() pixelate() modulate() blend()
// ◆ OUTPUT — render
//   .out()  atau  render()

osc(10, 0.1, 0.8)
  .rotate(0.5)
  .out()
`
