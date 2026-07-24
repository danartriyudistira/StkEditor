import Editor from '@monaco-editor/react'
import { DEFAULT_HYDRA_CODE } from '../data/hydraExamples.js'

const HYDRA_LANG_ID = 'hydra'

// Register Hydra language with Monaco
let registered = false
function ensureLanguageRegistered(monaco) {
  if (registered) return
  registered = true

  monaco.languages.register({ id: HYDRA_LANG_ID })

  const hydraKeywords = [
    'osc', 'voronoi', 'noise', 'shape', 'gradient', 'solid', 'src',
    'out', 'render', 'hush',
    'rotate', 'scale', 'pixelate',
    'kaleid', 'repeat', 'repeatX', 'repeatY',
    'modulate', 'modulateRepeat', 'modulateKaleid', 'modulateScrollX', 'modulateScrollY',
    'modulateScale', 'modulateRotate', 'modulatePixelate',
    'modulateHue', 'modulateRepeatX', 'modulateRepeatY',
    'saturate', 'contrast', 'brightness', 'luma',
    'threshold', 'invert', 'color', 'posterize',
    'add', 'sub', 'diff', 'mult', 'blend', 'layer', 'mask',
    'scroll', 'scrollX', 'scrollY',
    'initCam', 'initVideo', 'initImage', 'initScreen', 'init',
    'a', 'fft', 'time', 'bpm', 'prev',
    'shift', 'hue', 'colorama', 'sum', 'r', 'g', 'b',
  ]

  const srcBufs = ['s0', 's1', 's2', 's3']
  const outBufs = ['o0', 'o1', 'o2', 'o3']

  monaco.languages.setMonarchTokensProvider(HYDRA_LANG_ID, {
    keywords: hydraKeywords,
    typeKeywords: [
      'vec2', 'vec3', 'vec4', 'float', 'int', 'bool', 'mat2', 'mat3', 'mat4',
      'sampler2D', 'void',
    ],
    builtins: [
      'sin', 'cos', 'tan', 'atan', 'pow', 'sqrt', 'abs', 'mod', 'min', 'max',
      'clamp', 'mix', 'step', 'smoothstep', 'length', 'distance', 'dot', 'cross',
      'normalize', 'fract', 'floor', 'ceil', 'sign', 'texture2D', 'gl_FragColor',
      'gl_FragCoord', 'vec2', 'vec3', 'vec4', 'float', 'int',
      'width', 'height', 'pi', 'PI', 'TWOPI', 'TAU',
      ...srcBufs, ...outBufs,
    ],
    tokenizer: {
      root: [
        [/\r?\n/, 'white'],
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [/#.*$/, 'comment'],
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],
        [/\d+(\.\d+)?/, 'number'],
        [new RegExp(`\\b(?:${hydraKeywords.join('|')})\\b`), 'keyword'],
        [/\b(?:vec2|vec3|vec4|float|int|bool|mat2|mat3|mat4|sampler2D|void)\b/, 'type'],
        [/\b(?:sin|cos|tan|atan|pow|sqrt|abs|mod|min|max|clamp|mix|step|smoothstep|length|distance|dot|cross|normalize|fract|floor|ceil|sign|texture2D|gl_FragColor|gl_FragCoord|width|height|pi|PI|TWOPI|TAU)\b/, 'predefined'],
        [/\b[so][0-3]\b/, 'variable'],
        [/[a-zA-Z_$]\w*/, 'identifier'],
        [/[+\-*/%=<>!&|^~?:]/, 'operator'],
        [/[{}()\[\]]/, 'delimiter'],
        [/,/, 'delimiter'],
      ],
      comment: [
        [/\*\//, 'comment', '@pop'],
        [/./, 'comment'],
      ],
    },
  })

  monaco.languages.setLanguageConfiguration(HYDRA_LANG_ID, {
    comments: { lineComment: '//' },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  })

  monaco.languages.registerCompletionItemProvider(HYDRA_LANG_ID, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions = []

      const addFn = (label, detail, insertText, docs) => {
        suggestions.push({
          label, kind: monaco.languages.CompletionItemKind.Function,
          detail, insertText: insertText || label, range,
          documentation: docs || '',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        })
      }

      addFn('osc(freq, sync, offset)',    'INPUT — gelombang sinus',   'osc(${1:10}, ${2:0.1}, ${3:0.5})', 'Generator gelombang sinus — freq: jumlah gelombang, sync: kecepatan animasi, offset: offset warna')
      addFn('noise(scale, offset)',       'INPUT — noise acak',        'noise(${1:10}, ${2:0.1})', 'Tekstur noise Perlin — scale: detail noise, offset: animasi')
      addFn('voronoi(scale, speed, blend)','INPUT — sel Voronoi',      'voronoi(${1:5}, ${2:0.3}, ${3:0.3})', 'Pola sel Voronoi — scale: ukuran sel, speed: kecepatan, blend: blending')
      addFn('shape(sides, radius, smooth)','INPUT — bentuk poligon',   'shape(${1:3}, ${2:0.3}, ${3:0.01})', 'Bentuk poligon — sides: jumlah sisi (3=segitiga), radius, smooth')
      addFn('gradient(speed)',            'INPUT — gradien',           'gradient(${1:0})', 'Gradien linear — speed: kecepatan animasi')
      addFn('solid(r, g, b, a)',          'INPUT — warna solid',       'solid(${1:1}, ${2:1}, ${3:1})', 'Warna solid — r: merah, g: hijau, b: biru, a: alpha (opsional)')
      addFn('src(buffer)',                'INPUT — dari buffer',       'src(${1:o0})', 'Ambil output dari buffer lain (feedback)')
      addFn('prev()',                     'INPUT — frame sebelumnya',  'prev()', 'Shortcut untuk output frame sebelumnya')

      addFn('rotate(angle, speed)',       'PROSES — rotasi',           'rotate(${1:0.5}, ${2:0.1})', 'Rotasi — angle: sudut (radian), speed: kecepatan')
      addFn('scale(x, y, cx, cy)',        'PROSES — skala',            'scale(${1:1.5}, ${2:1}, ${3:0.5}, ${4:0.5})', 'Perbesar/perkecil')
      addFn('pixelate(x, y)',             'PROSES — pikselasi',        'pixelate(${1:20}, ${2:20})', 'Efek pikselasi — x: pixel horizontal, y: pixel vertikal')
      addFn('kaleid(sides)',              'PROSES — kaleidoskop',      'kaleid(${1:4})', 'Efek kaleidoskop — sides: jumlah sisi cermin')
      addFn('repeat(x, y, ox, oy)',       'PROSES — pengulangan',      'repeat(${1:3}, ${2:3})', 'Ulangi pola secara grid')
      addFn('scrollX(amount, speed)',     'PROSES — geser horizontal', 'scrollX(${1:0.5}, ${2:0.1})', 'Geser tekstur horizontal')
      addFn('scrollY(amount, speed)',     'PROSES — geser vertikal',   'scrollY(${1:0.5}, ${2:0.1})', 'Geser tekstur vertikal')

      addFn('hue(amount)',                'PROSES — rona',             'hue(${1:0.5})', 'Geser rona (hue) warna')
      addFn('saturate(amount)',           'PROSES — saturasi',         'saturate(${1:2})', 'Tingkatkan/kurangi saturasi')
      addFn('contrast(amount)',           'PROSES — kontras',          'contrast(${1:1.6})', 'Atur kontras')
      addFn('brightness(amount)',         'PROSES — kecerahan',        'brightness(${1:0.4})', 'Atur kecerahan')
      addFn('invert(amount)',             'PROSES — invert',           'invert(${1:1})', 'Balikkan warna (1 = penuh)')
      addFn('color(r, g, b, a)',          'PROSES — kalikan warna',    'color(${1:1}, ${2:1}, ${3:1})', 'Kalikan kanal warna')
      addFn('posterize(bins, gamma)',     'PROSES — posterisasi',      'posterize(${1:4}, ${2:0.6})', 'Kurangi jumlah warna (efek poster)')
      addFn('luma(threshold, tolerance)', 'PROSES — threshold luma',   'luma(${1:0.5}, ${2:0.1})', 'Threshold berdasarkan luminansi')
      addFn('colorama(amount)',           'PROSES — pergeseran rona',  'colorama(${1:0.005})', 'Pergeseran rona warna drastis')

      addFn('blend(tex, amount)',         'PROSES — campur',           'blend(${1:noise(3)}, ${2:0.5})', 'Campur dua visual (0-1)')
      addFn('add(tex, amount)',           'PROSES — tambah',           'add(${1:osc(20)}, ${2:1})', 'Tambah (jumlahkan) dua visual')
      addFn('mult(tex, amount)',          'PROSES — kali',             'mult(${1:noise(3)}, ${2:1})', 'Kalikan dua visual')
      addFn('diff(tex)',                  'PROSES — selisih',          'diff(${1:noise(3)})', 'Selisih absolut dua visual')
      addFn('layer(tex)',                 'PROSES — lapisan',          'layer(${1:shape(4).color(1,0,0)})', 'Tumpuk di atas (alpha-aware)')
      addFn('mask(tex)',                  'PROSES — potong',           'mask(${1:shape(4)})', 'Potong dengan bentuk (alpha mask)')

      addFn('modulate(tex, amount)',      'PROSES — modulasi',         'modulate(${1:noise(3)}, ${2:0.1})', 'Geser koordinat berdasarkan tekstur')
      addFn('modulateScale(tex, amount)', 'PROSES — modulasi skala',   'modulateScale(${1:noise(3)}, ${2:1})', 'Skala berdasarkan tekstur')
      addFn('modulateRotate(tex, mult)',  'PROSES — modulasi rotasi',  'modulateRotate(${1:noise(3)}, ${2:1})', 'Rotasi berdasarkan tekstur')
      addFn('modulateKaleid(sides)',      'PROSES — modulasi kaleid',  'modulateKaleid(${1:4})', 'Kaleidoskop dari tekstur modulasi')
      addFn('modulatePixelate(tex, x, y)','PROSES — modulasi pixelate','modulatePixelate(${1:noise(3)}, ${2:10}, ${3:3})', 'Pikselasi dinamis dari tekstur')
      addFn('modulateHue(tex, amount)',   'PROSES — modulasi rona',    'modulateHue(${1:voronoi(3)}, ${2:1})', 'Rona dari tekstur kedua')

      addFn('initCam()',                  'INPUT — webcam',            's0.initCam()', 'Inisialisasi kamera webcam sebagai s0')
      addFn('initImage(url)',             'INPUT — gambar',            's0.initImage("${1:rinkysplash.jpg}")', 'Muat gambar dari URL sebagai s0')
      addFn('initVideo(url)',             'INPUT — video',             's0.initVideo("${1:bigbuckbunny.mp4}")', 'Stream video dari URL sebagai s0')
      addFn('initScreen()',               'INPUT — screen capture',    's0.initScreen()', 'Tangkap layar desktop sebagai s0')

      addFn('out(o)',                     'OUTPUT — render',           'out(${1:o0})', 'Render ke output buffer')
      addFn('render(buffer)',             'OUTPUT — tampilkan',        'render(${1:o0})', 'Tampilkan output buffer ke layar')
      addFn('hush()',                     'OUTPUT — hentikan',         'hush()', 'Hentikan semua output')

      addFn('a.fft[index]',              'AUDIO — FFT',                '() => a.fft[${1:0}]', 'Nilai FFT audio real-time')
      addFn('a.setBins(n)',              'AUDIO — bins',               'a.setBins(${1:4})', 'Set jumlah bins FFT')
      addFn('time',                      'AUDIO — waktu',              '() => time', 'Waktu dalam detik sejak start')
      addFn('bpm',                       'AUDIO — BPM',                '() => bpm', 'BPM (beats per minute)')

      return { suggestions }
    },
  })

  // Theme
  monaco.editor.defineTheme('hydra-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c586c0' },
      { token: 'type', foreground: '4ec9b0' },
      { token: 'predefined', foreground: 'dcdcaa' },
      { token: 'variable', foreground: '9cdcfe' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'operator', foreground: 'd4d4d4' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
    },
  })
}

export default function HydraEditor({ value, onChange, onReady }) {
  function handleMount(editor, monaco) {
    ensureLanguageRegistered(monaco)
    monaco.editor.setTheme('hydra-dark')
    onReady?.(editor)
    editor.focus()
  }

  return (
    <Editor
      height="100%"
      language={HYDRA_LANG_ID}
      value={value || ''}
      onChange={onChange}
      onMount={handleMount}
      theme="hydra-dark"
      options={{
        fontSize: 13,
        fontFamily: "'Fira Code', 'Consolas', monospace",
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        tabSize: 2,
        renderWhitespace: 'none',
        contextmenu: false,
        bracketPairColorization: { enabled: true },
      }}
    />
  )
}

export { DEFAULT_HYDRA_CODE }
