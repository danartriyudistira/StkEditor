import Editor from '@monaco-editor/react'

const languageId = 'glsl'

function registerGLSL(monaco) {
  if (monaco.languages.getLanguages().some(l => l.id === languageId)) return

  monaco.languages.register({ id: languageId })

  monaco.languages.setMonarchTokensProvider(languageId, {
    defaultToken: '',
    tokenPostfix: '.glsl',
    keywords: [
      'attribute', 'const', 'uniform', 'varying', 'break',
      'continue', 'do', 'for', 'while', 'if', 'else', 'in', 'out',
      'inout', 'float', 'int', 'void', 'bool', 'true', 'false',
      'discard', 'return', 'struct', 'precision',
      'highp', 'mediump', 'lowp', 'main',
    ],
    typeKeywords: [
      'float', 'int', 'void', 'bool', 'vec2', 'vec3', 'vec4',
      'ivec2', 'ivec3', 'ivec4', 'bvec2', 'bvec3', 'bvec4',
      'mat2', 'mat3', 'mat4',
      'sampler1D', 'sampler2D', 'sampler3D', 'samplerCube',
    ],
    operators: [
      '=', '>', '<', '!', '~', '?', ':',
      '==', '<=', '>=', '!=', '&&', '||', '++', '--',
      '+', '-', '*', '/', '&', '|', '^', '%',
      '<<', '>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%=',
    ],
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
      root: [
        [/\b(?:gl_FragColor|gl_FragCoord|FlutterFragCoord)\b/, 'predefined'],
        [/\b(?:texture|texture2D|texture3D|textureCube)\b/, 'predefined'],
        [/[a-z_$][\w$]*/, { cases: { '@typeKeywords': 'type',
                                       '@keywords': 'keyword',
                                       '@default': 'identifier' } }],
        [/[A-Z][\w$]*/, 'type.identifier'],
        { include: '@whitespace' },
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, { cases: { '@operators': 'operator',
                                 '@default': '' } }],
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
      ],
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],
        ['\\*/', 'comment', '@pop'],
        [/[\/*]/, 'comment'],
      ],
      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],
      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],
      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
    },
  })
}

export default function ShaderEditor({ value, onChange }) {
  function handleBeforeMount(monaco) {
    registerGLSL(monaco)
  }

  return (
    <Editor
      height="100%"
      language={languageId}
      theme="vs-dark"
      value={value}
      onChange={onChange}
      beforeMount={handleBeforeMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        tabSize: 2,
      }}
    />
  )
}
