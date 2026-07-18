export default class OscReceiver {
  constructor() {
    this.ws = null
    this.connected = false
    this.onMessage = null
    this.onConnect = null
    this.onDisconnect = null
    this.onError = null
    this._reconnectTimer = null
    this._config = { host: 'localhost', port: 8080 }
  }

  connect(host, port) {
    this._config = { host, port }
    this._doConnect()
  }

  disconnect() {
    this._stopReconnect()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.onDisconnect?.()
  }

  _doConnect() {
    const { host, port } = this._config
    try {
      this.ws = new WebSocket('ws://' + host + ':' + port)

      this.ws.onopen = () => {
        this.connected = true
        this._stopReconnect()
        this.onConnect?.()
      }

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (Array.isArray(data)) {
            for (const msg of data) {
              if (msg.address && msg.value !== undefined) {
                this.onMessage?.(msg.address, msg.value)
              }
            }
          } else if (data.address && data.value !== undefined) {
            this.onMessage?.(data.address, data.value)
          }
        } catch (_) {}
      }

      this.ws.onclose = () => {
        this.connected = false
        this.ws = null
        this.onDisconnect?.()
        this._startReconnect()
      }

      this.ws.onerror = () => {
        this.onError?.()
      }
    } catch (e) {
      this.onError?.(e)
    }
  }

  _startReconnect() {
    this._stopReconnect()
    this._reconnectTimer = setTimeout(() => {
      if (!this.connected) this._doConnect()
    }, 3000)
  }

  _stopReconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
  }
}