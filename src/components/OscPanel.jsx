import { useState, useEffect, useCallback, useRef } from 'react'
import OscReceiver from '../connectivity/oscReceiver.js'

const DEFAULT_MAPPING = {
  '/fader1': 'u_cc1',
  '/fader2': 'u_cc2',
  '/fader3': 'u_cc3',
  '/fader4': 'u_cc4',
  '/fader5': 'u_cc5',
  '/fader6': 'u_cc6',
  '/fader7': 'u_cc7',
  '/fader8': 'u_cc8',
  '/knob1': 'u_cc1',
  '/knob2': 'u_cc2',
  '/knob3': 'u_cc3',
  '/knob4': 'u_cc4',
}

export default function OscPanel({ onCcChange }) {
  const [expanded, setExpanded] = useState(false)
  const [connected, setConnected] = useState(false)
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('8080')
  const [mapping, setMapping] = useState(DEFAULT_MAPPING)
  const [lastAddress, setLastAddress] = useState(null)
  const receiverRef = useRef(null)

  useEffect(() => {
    const receiver = new OscReceiver()
    receiver.onConnect = () => setConnected(true)
    receiver.onDisconnect = () => setConnected(false)
    receiver.onError = () => setConnected(false)
    receiver.onMessage = (address, value) => {
      setLastAddress(address)
      const target = mapping[address]
      if (target) {
        const normalized = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0
        onCcChange?.(target, normalized)
      }
    }
    receiverRef.current = receiver
    return () => receiver.disconnect()
  }, [])

  // Update callback when mapping changes
  useEffect(() => {
    if (receiverRef.current) {
      receiverRef.current.onMessage = (address, value) => {
        setLastAddress(address)
        const target = mapping[address]
        if (target) {
          const normalized = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0
          onCcChange?.(target, normalized)
        }
      }
    }
  }, [mapping, onCcChange])

  const handleConnect = useCallback(() => {
    const receiver = receiverRef.current
    if (connected) {
      receiver.disconnect()
    } else {
      receiver.connect(host, parseInt(port))
    }
  }, [host, port, connected])

  const handleMappingChange = useCallback((oscAddr, ccTarget) => {
    setMapping(prev => {
      if (!ccTarget) {
        const next = { ...prev }
        delete next[oscAddr]
        return next
      }
      return { ...prev, [oscAddr]: ccTarget }
    })
  }, [])

  const addMapping = useCallback(() => {
    setMapping(prev => ({ ...prev, '/new': 'u_cc1' }))
  }, [])

  return (
    <div className="osc-panel">
      <div className="osc-header" onClick={() => setExpanded(!expanded)}>
        <span className={`osc-status ${connected ? 'connected' : ''}`}>
          {connected ? '\u25CF' : '\u25CB'}
        </span>
        <span className="osc-label">
          OSC {expanded ? '\u25BE' : '\u25B8'}
        </span>
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

          <div className="osc-mapping">
            <div className="osc-mapping-header">
              <span className="osc-mapping-title">OSC Address {'\u2192'} CC</span>
              <button className="osc-add-btn" onClick={addMapping}>+ Add</button>
            </div>
            {Object.entries(mapping).map(([addr, target]) => (
              <div key={addr} className="osc-mapping-row">
                <input
                  type="text"
                  value={addr}
                  onChange={e => {
                    const newAddr = e.target.value
                    const val = mapping[addr]
                    setMapping(prev => {
                      const next = { ...prev }
                      delete next[addr]
                      next[newAddr] = val
                      return next
                    })
                  }}
                  className="osc-addr-input"
                />
                <span className="osc-arrow">{'\u2192'}</span>
                <select
                  value={target}
                  onChange={e => handleMappingChange(addr, e.target.value)}
                >
                  <option value="">{'\u2014'}</option>
                  {[1,2,3,4,5,6,7,8].map(ch => (
                    <option key={ch} value={`u_cc${ch}`}>CC{ch}</option>
                  ))}
                </select>
                <button
                  className="midi-remove-btn"
                  onClick={() => handleMappingChange(addr, '')}
                  title="Remove"
                >
                  {'\u2715'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
