import Editor from '@monaco-editor/react'
import { DEFAULT_HYDRA_CODE } from '../data/hydraExamples.js'

const HYDRA_LANG_ID = 'hydra'

// Register Hydra language with Monaco
let registered = false
function ensureLanguageRegistered(monaco) {
  if (registered) return
  registered = true

  monaco.languages.register({ id: HYDRA_LANG_ID })

  // Syntax highlighting — Hydra keywords + GLSL functions
  monaco.languages.setMonarchTokensProvider(HYDRA_LANG_ID, {
    keywords: [
      'osc', 'voronoi', 'noise', 'shape', 'gradient', 'solid', 'src',
      'out', 'render', 'hush',
      // transforms
      'rotate', 'scale', 'translate', 'resize', 'pixelate',
      'blur', 'kaleid', 'repeat', 'repeatX', 'repeatY',
      'modulate', 'modulateRepeat', 'modulateKaleid', 'modulateScrollX', 'modulateScrollY',
      'modulateScale', 'modulateRotate', 'modulatePixelate',
      'modulateHue',
      // color
      'saturate', 'desaturate', 'contrast', 'brightness', 'luma',
      'threshold', 'invert', 'color', 'posterize',
      // blend
      'add', 'sub', 'diff', 'mult', 'blend', 'layer', 'mask',
      // source init
      'initCam', 'initVideo', 'initImage', 'initScreen', 'init',
      // audio
      'a', 'fft',
      // time
      'time', 'bpm',
    ],
    typeKeywords: [
      'vec2', 'vec3', 'vec4', 'float', 'int', 'bool', 'mat2', 'mat3', 'mat4',
      'sampler2D', 'void',
    ],
    builtins: [
      'sin', 'cos', 'tan', 'atan', 'pow', 'sqrt', 'abs', 'mod', 'min', 'max',
      'clamp', 'mix', 'step', 'smoothstep', 'length', 'distance', 'dot', 'cross',
      'normalize', 'fract', 'floor', 'ceil', 'sign', 'texture2D', 'gl_FragColor',
      'gl_FragCoord', 'vec2', 'vec3', 'vec4', 'float', 'int',
      // Hydra builtins
      'width', 'height', 'pi', 'PI', 'TWOPI', 'TAU',
      // source buffers
      's0', 's1', 's2', 's3',
      // output buffers
      'o0', 'o1', 'o2', 'o3',
    ],
    tokenizer: {
      root: [
        // Comments
        [/\/\/.*$/, 'comment'],
        [/#.*$/, 'comment'],
        // Strings
        [/"[^"]*"/, 'string'],
        // Numbers
        [/\d+(\.\d+)?/, 'number'],
        // Keywords
        [/\b(?:osc|voronoi|noise|shape|gradient|solid|src|out|render|hush|rotate|scale|translate|resize|pixelate|blur|kaleid|repeat|repeatX|repeatY|modulate|modulateRepeat|modulateKaleid|modulateScrollX|modulateScrollY|modulateScale|modulateRotate|modulatePixelate|modulateHue|saturate|desaturate|contrast|brightness|luma|threshold|invert|color|posterize|add|sub|diff|mult|blend|layer|mask|initCam|initVideo|initImage|initScreen|init|a|fft|time|bpm)\b/, 'keyword'],
        // Types
        [/\b(?:vec2|vec3|vec4|float|int|bool|mat2|mat3|mat4|sampler2D|void)\b/, 'type'],
        // Builtins
        [/\b(?:sin|cos|tan|atan|pow|sqrt|abs|mod|min|max|clamp|mix|step|smoothstep|length|distance|dot|cross|normalize|fract|floor|ceil|sign|texture2D|gl_FragColor|gl_FragCoord|width|height|pi|PI|TWOPI|TAU)\b/, 'predefined'],
        // Source/output buffers
        [/\b[soto][0-3]\b/, 'variable'],
        // Identifiers
        [/[a-zA-Z_]\w*/, 'identifier'],
        // Operators
        [/[+\-*/%=<>!&|^~?:]/, 'operator'],
        // Delimiters
        [/[{}()\[\]]/, 'delimiter'],
        [/,/, 'delimiter'],
      ],
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
