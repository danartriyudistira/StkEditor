export const effects = [
  {
    id: 'fx_invert',
    label: 'Invert',
    category: 'Color',
    params: {},
    shader: `
      precision highp float;
      uniform sampler2D u_input;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float strength;
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 color = texture2D(u_input, uv);
        vec3 inv = 1.0 - color.rgb;
        gl_FragColor = vec4(mix(color.rgb, inv, strength), color.a);
      }
    `,
  },
  {
    id: 'fx_mirror',
    label: 'Mirror',
    category: 'Distort',
    params: {
      mode: { min: 0, max: 3, step: 1, default: 0, labels: ['H', 'V', 'H+V', 'Kaleido'] },
      axis: { min: 0, max: 1, step: 0.01, default: 0.5, label: 'Axis' },
    },
    shader: `
      precision highp float;
      uniform sampler2D u_input;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float strength;
      uniform float mode;
      uniform float axis;
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = uv;
        float a = strength;
        if (mode < 0.5) {
          p.x = mix(p.x, 1.0 - abs(p.x - 0.5) * 2.0, a);
        } else if (mode < 1.5) {
          p.y = mix(p.y, 1.0 - abs(p.y - 0.5) * 2.0, a);
        } else if (mode < 2.5) {
          p.x = mix(p.x, 1.0 - abs(p.x - 0.5) * 2.0, a);
          p.y = mix(p.y, 1.0 - abs(p.y - 0.5) * 2.0, a);
        } else {
          vec2 q = p - 0.5;
          float r = length(q);
          float ang = atan(q.y, q.x);
          float segment = 3.14159265 * 0.5;
          ang = mod(ang, segment);
          ang = abs(ang - segment * 0.5);
          p = 0.5 + r * vec2(cos(ang), sin(ang)) * sign(p - 0.5);
          p = mix(uv, p, a);
        }
        gl_FragColor = texture2D(u_input, clamp(p, 0.0, 1.0));
      }
    `,
  },
  {
    id: 'fx_glitch',
    label: 'Glitch',
    category: 'Distort',
    params: {
      intensity: { min: 0, max: 1, step: 0.01, default: 0.5, label: 'Intensity' },
    },
    shader: `
      precision highp float;
      uniform sampler2D u_input;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float strength;
      uniform float intensity;
      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = uv;
        float t = u_time;
        float slice = floor(p.y * 20.0) / 20.0;
        float r = rand(vec2(slice, floor(t * 4.0)));
        if (r < intensity * strength) {
          float offset = (rand(vec2(slice, t)) - 0.5) * 0.2 * strength;
          p.x += offset;
        }
        float block = floor(p.x * 16.0) / 16.0;
        float r2 = rand(vec2(block, floor(t * 8.0)));
        if (r2 < intensity * strength * 0.3) {
          p.y += (rand(vec2(block, t)) - 0.5) * 0.1 * strength;
        }
        vec4 color = texture2D(u_input, clamp(p, 0.0, 1.0));
        if (rand(vec2(floor(t * 20.0), 0.0)) < intensity * strength * 0.05) {
          color.r = texture2D(u_input, clamp(p + vec2(0.005, 0.0), 0.0, 1.0)).r;
          color.b = texture2D(u_input, clamp(p - vec2(0.005, 0.0), 0.0, 1.0)).b;
        }
        gl_FragColor = color;
      }
    `,
  },
  {
    id: 'fx_brightness',
    label: 'Brightness',
    category: 'Color',
    params: {
      brightness: { min: 0, max: 2, step: 0.01, default: 1.0, label: 'Brightness' },
    },
    shader: `
      precision highp float;
      uniform sampler2D u_input;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float strength;
      uniform float brightness;
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 color = texture2D(u_input, uv);
        float b = mix(1.0, brightness, strength);
        gl_FragColor = vec4(color.rgb * b, color.a);
      }
    `,
  },
  {
    id: 'fx_contrast',
    label: 'Contrast',
    category: 'Color',
    params: {
      contrast: { min: 0, max: 3, step: 0.01, default: 1.0, label: 'Contrast' },
    },
    shader: `
      precision highp float;
      uniform sampler2D u_input;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float strength;
      uniform float contrast;
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 color = texture2D(u_input, uv);
        float c = mix(1.0, contrast, strength);
        vec3 result = (color.rgb - 0.5) * c + 0.5;
        gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
      }
    `,
  },
  {
    id: 'fx_colorShift',
    label: 'Color Shift',
    category: 'Color',
    params: {
      hue: { min: 0, max: 6.2832, step: 0.01, default: 0, label: 'Hue' },
      saturation: { min: 0, max: 3, step: 0.01, default: 1.0, label: 'Saturation' },
    },
    shader: `
      precision highp float;
      uniform sampler2D u_input;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float strength;
      uniform float hue;
      uniform float saturation;
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 color = texture2D(u_input, uv);
        vec3 hsv = rgb2hsv(color.rgb);
        hsv.x = fract(hsv.x + hue * strength / 6.2832);
        hsv.y *= mix(1.0, saturation, strength);
        gl_FragColor = vec4(hsv2rgb(hsv), color.a);
      }
    `,
  },
  {
    id: 'fx_displace',
    label: 'Displace',
    category: 'Distort',
    params: {
      amount: { min: 0, max: 0.1, step: 0.001, default: 0.02, label: 'Amount' },
      speed: { min: 0, max: 5, step: 0.1, default: 1.0, label: 'Speed' },
    },
    shader: `
      precision highp float;
      uniform sampler2D u_input;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float strength;
      uniform float amount;
      uniform float speed;
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float t = u_time * speed;
        float dx = (noise(vec2(uv.y * 10.0, t)) - 0.5) * amount * strength;
        float dy = (noise(vec2(uv.x * 10.0, t + 100.0)) - 0.5) * amount * strength;
        vec4 color = texture2D(u_input, clamp(uv + vec2(dx, dy), 0.0, 1.0));
        gl_FragColor = color;
      }
    `,
  },
  {
    id: 'fx_pixelate',
    label: 'Pixelate',
    category: 'Distort',
    params: {
      resolution: { min: 2, max: 200, step: 1, default: 50, label: 'Pixels' },
    },
    shader: `
      precision highp float;
      uniform sampler2D u_input;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float strength;
      uniform float resolution;
      void main() {
        float pixels = mix(min(u_resolution.x, u_resolution.y), resolution, strength);
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = floor(uv * pixels) / pixels;
        gl_FragColor = texture2D(u_input, p);
      }
    `,
  },
]

// Dynamic registry for ISF-origin effects loaded at runtime
const customEffects = new Map()

/**
 * Register a custom ISF effect for use in the FX chain.
 * @param {string} id - Unique effect ID (e.g. 'isf_Bad_TV')
 * @param {object} def - Effect definition matching builtin structure
 */
export function registerIsfEffect(id, def) {
  customEffects.set(id, def)
}

/**
 * Unregister a custom ISF effect.
 * @param {string} id - Effect ID to remove
 */
export function unregisterIsfEffect(id) {
  customEffects.delete(id)
}

/**
 * Get all registered custom ISF effects.
 * @returns {object[]} Array of custom effect definitions
 */
export function getCustomEffects() {
  return Array.from(customEffects.values())
}

export function getEffectById(id) {
  return effects.find(e => e.id === id) || customEffects.get(id) || null
}

export function getEffectsByCategory() {
  const cats = {}
  for (const fx of [...effects, ...customEffects.values()]) {
    if (!cats[fx.category]) cats[fx.category] = []
    cats[fx.category].push(fx)
  }
  return cats
}

