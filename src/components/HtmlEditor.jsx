import Editor from '@monaco-editor/react'

let registered = false
function ensureLanguageRegistered(monaco) {
  if (registered) return
  registered = true

  monaco.editor.defineTheme('html-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'tag', foreground: '569cd6' },
      { token: 'attribute.name', foreground: '9cdcfe' },
      { token: 'attribute.value', foreground: 'ce9178' },
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'keyword', foreground: 'c586c0' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'delimiter', foreground: '808080' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
    },
  })
}

export default function HtmlEditor({ value, onChange, onReady }) {
  function handleMount(editor, monaco) {
    ensureLanguageRegistered(monaco)
    monaco.editor.setTheme('html-dark')
    onReady?.(editor)
    editor.focus()
  }

  return (
    <Editor
      height="100%"
      language="html"
      value={value || ''}
      onChange={onChange}
      onMount={handleMount}
      theme="html-dark"
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
