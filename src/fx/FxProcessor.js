import { getEffectById } from './effects.js'

const VERT = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

export default class FxProcessor {
  constructor(gl) {
    this.gl = gl
    this.programCache = new Map()
    this.fboA = null
    this.fboB = null
    this.quadBuffer = this._createQuad()
    this._initFBOs()
  }

  _initFBOs() {
    const gl = this.gl
    this.fboA = this._createFBO()
    this.fboB = this._createFBO()
  }

  _createFBO() {
    const gl = this.gl
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return { fbo, tex, width: 0, height: 0 }
  }

  _resizeFBO(fbo, w, h) {
    if (fbo.width === w && fbo.height === h) return
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, fbo.tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    fbo.width = w
    fbo.height = h
  }

  _createQuad() {
    const gl = this.gl
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]), gl.STATIC_DRAW)
    return buf
  }

  _getProgram(fragSrc) {
    if (this.programCache.has(fragSrc)) {
      return this.programCache.get(fragSrc)
    }

    const gl = this.gl
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, VERT)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('VS error:', gl.getShaderInfoLog(vs))
      gl.deleteShader(vs)
      return null
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fragSrc)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('FS error:', gl.getShaderInfoLog(fs))
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      return null
    }

    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Link error:', gl.getProgramInfoLog(prog))
      gl.deleteProgram(prog)
      return null
    }

    const cached = { prog, uniforms: {} }
    const numUniforms = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(prog, i)
      cached.uniforms[info.name] = gl.getUniformLocation(prog, info.name)
    }

    this.programCache.set(fragSrc, cached)
    return cached
  }

  isEffectActive(fx, ccValues) {
    if (fx.toggleCc && fx.toggleCc.cc) {
      const ccKey = `u_cc${fx.toggleCc.cc}`
      const ccVal = ccValues?.[ccKey] ?? 0
      if (ccVal >= fx.toggleCc.min && ccVal <= fx.toggleCc.max) return true
      return fx.enabled
    }
    return fx.enabled
  }

  process(sourceTexture, fxChain, ccValues, time, width, height) {
    const gl = this.gl
    if (!width || !height) return

    this._resizeFBO(this.fboA, width, height)
    this._resizeFBO(this.fboB, width, height)

    const enabledFx = (fxChain || []).filter(fx => this.isEffectActive(fx, ccValues))

    const fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (fbStatus !== gl.FRAMEBUFFER_COMPLETE) {
      console.warn('FxProcessor: FBO incomplete:', fbStatus)
    }

    if (enabledFx.length === 0) {
      this._blit(sourceTexture, null, width, height)
      return
    }

    let readTex = sourceTexture
    let writeFBO = this.fboA

    for (let i = 0; i < enabledFx.length; i++) {
      const fx = enabledFx[i]
      const isLast = i === enabledFx.length - 1
      const dest = isLast ? null : writeFBO
      const destW = isLast ? width : writeFBO.width
      const destH = isLast ? height : writeFBO.height

      this._applyFx(fx, readTex, ccValues, time, dest, width, height, destW, destH)

      if (!isLast) {
        readTex = writeFBO.tex
        writeFBO = writeFBO === this.fboA ? this.fboB : this.fboA
      }
    }
  }

  _applyFx(fx, inputTex, ccValues, time, destFBO, srcW, srcH, destW, destH) {
    const gl = this.gl
    const def = getEffectById(fx.id)
    if (!def) return
    const cached = this._getProgram(def.shader)
    if (!cached) return

    if (destFBO) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destFBO.fbo)
      gl.viewport(0, 0, destW, destH)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, destW, destH)
    }

    gl.useProgram(cached.prog)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, inputTex)
    if (cached.uniforms.u_input !== undefined) {
      gl.uniform1i(cached.uniforms.u_input, 0)
    }
    if (cached.uniforms.u_resolution !== undefined) {
      gl.uniform2f(cached.uniforms.u_resolution, srcW, srcH)
    }
    if (cached.uniforms.u_time !== undefined) {
      gl.uniform1f(cached.uniforms.u_time, time)
    }

    const ccKey = `u_cc${fx.cc}`
    const strength = ccValues?.[ccKey] ?? 0.5
    if (cached.uniforms.strength !== undefined) {
      gl.uniform1f(cached.uniforms.strength, strength)
    }

    if (def.params) {
      for (const [paramName, paramDef] of Object.entries(def.params)) {
        const loc = cached.uniforms[paramName]
        if (loc === undefined) continue
        let val

        const mapping = fx.paramCc?.[paramName]
        if (mapping && mapping.cc) {
          const pccKey = `u_cc${mapping.cc}`
          const ccVal = ccValues?.[pccKey] ?? 0
          if (ccVal < mapping.min) {
            val = paramDef.default ?? paramDef.min ?? 0
          } else {
            const normalized = Math.min(1, Math.max(0, (ccVal - mapping.min) / (mapping.max - mapping.min)))
            val = (paramDef.min ?? 0) + normalized * ((paramDef.max ?? 1) - (paramDef.min ?? 0))
          }
        } else {
          val = fx.paramValues?.[paramName] ?? paramDef.default ?? 0
        }

        gl.uniform1f(loc, val)
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    const posLoc = gl.getAttribLocation(cached.prog, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  _blit(texture, destFBO, width, height) {
    const gl = this.gl
    const cached = this._getProgram(
      'precision highp float;\n' +
      'varying vec2 v_uv;\n' +
      'uniform sampler2D u_input;\n' +
      'void main() {\n' +
      '  gl_FragColor = texture2D(u_input, v_uv);\n' +
      '}'
    )
    if (!cached) return

    const prog = cached.prog
    if (destFBO) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destFBO.fbo)
      gl.viewport(0, 0, destFBO.width, destFBO.height)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, width, height)
    }

    gl.useProgram(prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    if (cached.uniforms.u_input !== undefined) {
      gl.uniform1i(cached.uniforms.u_input, 0)
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    const posLoc = gl.getAttribLocation(prog, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  destroy() {
    const gl = this.gl
    for (const cached of this.programCache.values()) {
      gl.deleteProgram(cached.prog)
    }
    this.programCache.clear()
    if (this.fboA) {
      gl.deleteFramebuffer(this.fboA.fbo)
      gl.deleteTexture(this.fboA.tex)
    }
    if (this.fboB) {
      gl.deleteFramebuffer(this.fboB.fbo)
      gl.deleteTexture(this.fboB.tex)
    }
  }
}
