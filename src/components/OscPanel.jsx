import { useState, useEffect, useCallback, useRef } from 'react'
import OscReceiver from '../connectivity/oscReceiver.js'

export default function OscPanel({ onCcChange, parameterConfig, onOscMessage }) {
  const [expanded, setExpanded] = useState(false)
  const [connected, setConnected] = useState(false)
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('8080')
  const [lastAddress, setLastAddress] = useState(null)
  const receiverRef = useRef(null)

  useEffect(() => {
    const receiver = new OscReceiver()
    receiver.onConnect = () => setConnected(true)
    receiver.onDisconnect = () => setConnected(false)
    receiver.onError = () => setConnected(false)
    receiver.onMessage = (address, value) => {
      setLastAddress(address)
      const normalized = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0

      if (parameterConfig && onOscMessage) {
        for (const [paramName, cfg] of Object.entries(parameterConfig)) {
          if (cfg.oscAddr && cfg.oscAddr.trim() === address) {
            onOscMessage(paramName, normalized)
          }
        }
      }
    }
    receiverRef.current = receiver
    return () => receiver.disconnect()
  }, [parameterConfig, onOscMessage])

  const handleConnect = useCallback(() => {
    const receiver = receiverRef.current
    if (connected) {
      receiver.disconnect()
    } else {
      receiver.connect(host, parseInt(port))
    }
  }, [host, port, connected])

  const mappedCount = parameterConfig
    ? Object.values(parameterConfig).filter(c => c.oscAddr?.trim()).length
    : 0

  return (
    <div className="osc-panel">
      <div className="osc-header" onClick={() => setExpanded(!expanded)}>
        <span className={`osc-status ${connected ? 'connected' : ''}`}>
          {connected ? '\u25CF' : '\u25CB'}
        </span>
        <span className="osc-label">
          OSC {expanded ? '\u25BE' : '\u25B8'}
        </span>
        {mappedCount > 0 && (
          <span className="osc-mapped-count">{mappedCount} mapped</span>
        )}
        {lastAddress && (
          <span className="osc-last">{lastAddress}</span>
        )}
      </div>

      {expanded && (
        <div className="osc-body">
          <div className="osc-connection">
            <input
              type="text"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="Host"
              className="osc-input"
            />
            <input
              type="number"
              value={port}
              onChange={e => setPort(e.target.value)}
              placeholder="Port"
              className="osc-input osc-input-small"
            />
            <button
              className={`osc-connect-btn ${connected ? 'connected' : ''}`}
              onClick={handleConnect}
            >
              {connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>

          {mappedCount > 0 && (
            <div className="osc-mapped-params">
              <div className="osc-mapping-title">Mapped Parameters</div>
              {Object.entries(parameterConfig)
                .filter(([_, cfg]) => cfg.oscAddr?.trim())
                .map(([paramName, cfg]) => (
                  <div key={paramName} className="osc-mapped-row">
                    <span className="osc-mapped-addr">{cfg.oscAddr}</span>
                    <span className="osc-mapped-arrow">{'\u2192'}</span>
                    <span className="osc-mapped-name">{paramName}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}
