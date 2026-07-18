/*{
    "DESCRIPTION": "Vibrant Liquid Metal with Pure Monochrome, Brightness, and Contrast Controls",
    "CREDIT": "Gemini",
    "CATEGORIES": [
        "2D",
        "Fluid",
        "Abstract",
        "Vibrant"
    ],
    "INPUTS": [
        {
            "NAME": "scale",
            "TYPE": "float",
            "MIN": 0.2,
            "MAX": 4.0,
            "DEFAULT": 0.2
        },
        {
            "NAME": "speed",
            "TYPE": "float",
            "MIN": 0.0,
            "MAX": 2.0,
            "DEFAULT": 0.1
        },
        {
            "NAME": "viscosity",
            "TYPE": "float",
            "MIN": 0.1,
            "MAX": 2.0,
            "DEFAULT": 0.77
        },
        {
            "NAME": "hue_rotate",
            "TYPE": "float",
            "MIN": 0.0,
            "MAX": 1.0,
            "DEFAULT": 0
        },
        {
            "NAME": "saturation",
            "TYPE": "float",
            "MIN": 0.0,
            "MAX": 2.0,
            "DEFAULT": 2
        },
        {
            "NAME": "brightness",
            "TYPE": "float",
            "MIN": -0.5,
            "MAX": 0.5,
            "DEFAULT": -0.5
        },
        {
            "NAME": "contrast",
            "TYPE": "float",
            "MIN": 0.5,
            "MAX": 2.5,
            "DEFAULT": 2.5       },
        {
            "NAME": "metallic_contrast",
            "TYPE": "float",
            "MIN": 0.5,
            "MAX": 3.0,
            "DEFAULT": 3
        }
    ]
}*/

#ifdef GL_ES
precision mediump float;
#endif

mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float fluidNoise(vec2 p) {
    p *= rot(0.5);
    float time = TIME * speed;
    float n = sin(p.x + time) * cos(p.y - time);
    
    p *= 2.2;
    n += sin(p.x - time * 1.5) * cos(p.y + time * 1.2) * 0.5;
    p *= 1.8;
    n += sin(p.x + time * 0.8) * cos(p.y - time * 2.0) * 0.25;
    
    return n;
}

float pattern(vec2 p, out vec2 v, out vec2 w) {
    v = vec2(fluidNoise(p + vec2(0.0, 0.0)),
             fluidNoise(p + vec2(5.2, 1.3)));
             
    v *= viscosity;

    w = vec2(fluidNoise(p + 4.0 * v + vec2(1.7, 9.2)),
             fluidNoise(p + 4.0 * v + vec2(8.3, 2.8)));

    return fluidNoise(p + 4.0 * w);
}

float getPatternSample(vec2 p) {
    vec2 dummyV, dummyW;
    return pattern(p, dummyV, dummyW);
}

vec3 originalLiquidPalette(float t) {
    float h = t + hue_rotate;
    
    vec3 a = vec3(0.5, 0.4, 0.4);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0 + h, 0.33, 0.67);
    
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 st = isf_FragNormCoord;
    
    // ZOOM PROPORSONAL DARI PUSAT
    st -= 0.5; 
    st.x *= RENDERSIZE.x / RENDERSIZE.y; 
    st *= scale; 
    
    vec2 v, w;
    float f = pattern(st, v, w);
    
    // FINITE DIFFERENCE UNTUK EMBOSS KROM
    float eps = 0.008;
    float f_right = getPatternSample(st + vec2(eps, 0.0));
    float f_up    = getPatternSample(st + vec2(0.0, eps));
    
    float dfdx = (f_right - f) / eps;
    float dfdy = (f_up - f) / eps;
    
    vec3 normal = normalize(vec3(dfdx, dfdy, 0.2));
    
    float spec = pow(max(0.0, normal.z), 32.0) * 1.3;
    float edge = smoothstep(0.1, 0.9, max(abs(dfdx), abs(dfdy)) * 0.4);

    // Ambil warna dasar asli
    vec3 baseColor = originalLiquidPalette(f * 0.5 + 0.5);
    
    // Terapkan kontras struktur logam bawaan
    vec3 finalColor = pow(baseColor, vec3(metallic_contrast));
    
    // Gabungkan refleksi cahaya specular dan pendaran lingkungan
    finalColor += vec3(spec * 0.6 + edge * 0.4);
    finalColor += vec3(0.2, 0.1, 0.0) * (1.0 - normal.z);

    // --- PERBAIKAN: MONOKROM MURNI SECARA GLOBAL ---
    // Menggunakan standar luminans perseptual ITU-R BT.709
    float gray = dot(finalColor, vec3(0.2126, 0.7152, 0.0722));
    finalColor = mix(vec3(gray), finalColor, saturation);

    // --- KONTROL BRIGHTNESS & CONTRAST BARU ---
    // Brightness
    finalColor += brightness;
    
    // Contrast (Titik jangkar kontras berada di abu-abu tengah 0.5)
    finalColor = (finalColor - 0.5) * contrast + 0.5;
    
    // Jaga nilai warna tetap di batas aman 0.0 - 1.0
    finalColor = clamp(finalColor, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, 1.0);
}