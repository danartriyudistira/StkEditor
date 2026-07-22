import EngineInterface from './EngineInterface.js'

export default class HtmlEngine extends EngineInterface {
  constructor() {
    super()
    this.source = ''
    this.valid = true
  }

  get name() { return 'html' }

  init(_canvas) {
    this.valid = true
  }

  loadCode(code) {
    this.source = code || ''
    this.valid = true
    this.error = null
  }

  getCode() { return this.source }

  setValue() {}
  setInputImage() {}
  draw() {}
  getOutputTexture() { return null }
  getGL() { return null }
  isValid() { return this.valid }
  getError() { return null }

  getMetadata() {
    return {
      inputs: [
        { NAME: 'mouseX', TYPE: 'float', DEFAULT: 0.5, MIN: 0, MAX: 1 },
        { NAME: 'mouseY', TYPE: 'float', DEFAULT: 0.5, MIN: 0, MAX: 1 },
        { NAME: 'scroll', TYPE: 'float', DEFAULT: 0, MIN: -1, MAX: 1 },
      ],
      description: '',
      categories: ['HTML'],
    }
  }

  destroy() {
    this.source = ''
  }
}