import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#1e1e1e',
          color: '#ccc',
          fontFamily: 'monospace',
          padding: 40,
        }}>
          <h2 style={{ color: '#f44336', marginBottom: 16 }}>Something went wrong</h2>
          <pre style={{
            background: '#2d2d2d',
            padding: 16,
            borderRadius: 4,
            maxWidth: 800,
            overflow: 'auto',
            fontSize: 12,
            color: '#ff8a80',
            lineHeight: 1.5,
          }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          {this.state.info && (
            <details style={{ marginTop: 12, maxWidth: 800 }}>
              <summary style={{ cursor: 'pointer', color: '#888', fontSize: 12 }}>
                Stack trace
              </summary>
              <pre style={{
                background: '#2d2d2d',
                padding: 16,
                borderRadius: 4,
                marginTop: 8,
                fontSize: 10,
                color: '#888',
                overflow: 'auto',
                maxHeight: 400,
              }}>
                {this.state.error?.stack}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              background: '#333',
              border: '1px solid #555',
              color: '#ccc',
              padding: '8px 24px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
