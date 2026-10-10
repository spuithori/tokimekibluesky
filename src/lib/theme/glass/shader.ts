export const GLASS_PARAMS = {
    refraction: { token: '--glass-refraction', value: 27 },
    bevel: { token: '--glass-bevel', value: 25 },
    ior: { token: '--glass-ior', value: 1.47 },
    radial: { token: '--glass-radial', value: 0.49 },
    lens: { token: '--glass-lens', value: 0.64 },
    ripple: { token: '--glass-ripple', value: 0.51 },
    frost: { token: '--glass-frost', value: 0.21 },
    saturation: { token: '--glass-saturation', value: 0.77 },
    dispersion: { token: '--glass-dispersion', value: 0.24 },
    adapt: { token: '--glass-adapt', value: 0.81 },
    specular: { token: '--glass-specular', value: 1.17 },
    pointerLight: { token: '--glass-pointer-light', value: 0 },
    shadow: { token: '--glass-shadow', value: 0.15 },
    bound: { token: '--glass-bound', value: 0 },
} as const;

export type GlassParam = keyof typeof GLASS_PARAMS;

export const MAX_SURFACES = 24;
export const PYRAMID_LEVELS = 6;

export const VERTEX = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0., 1.); }`;

const HEAD = `#version 300 es
precision highp float;
out vec4 o;
`;

export const MAP = HEAD + `
uniform sampler2D uSharp;
uniform vec2 uRes, uImg, uSize;
vec2 cover(vec2 p) { float s = max(uRes.x / uImg.x, uRes.y / uImg.y); vec2 size = uImg * s; return (p - (uRes - size) * .5) / size; }
void main() {
  vec2 p = vec2(gl_FragCoord.x * uRes.x / uSize.x, uRes.y - gl_FragCoord.y * uRes.y / uSize.y);
  o = vec4(texture(uSharp, cover(p)).rgb, 1.);
}`;

export const DOWN = HEAD + `
uniform sampler2D uSrc;
uniform vec2 uSize;
void main() { o = texture(uSrc, gl_FragCoord.xy / uSize); }`;

export const BLUR = HEAD + `
uniform sampler2D uSrc;
uniform vec2 uSize, uDir;
void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 d = uDir / uSize;
  vec3 c = texture(uSrc, uv).rgb * .2270270270;
  c += (texture(uSrc, uv + d * 1.3846153846).rgb + texture(uSrc, uv - d * 1.3846153846).rgb) * .3162162162;
  c += (texture(uSrc, uv + d * 3.2307692308).rgb + texture(uSrc, uv - d * 3.2307692308).rgb) * .0702702703;
  o = vec4(c, 1.);
}`;

const FRAMEWORK_A = `
uniform vec2 uRes, uImg, uPointer;
uniform int uCount;
uniform vec4 uRect[${MAX_SURFACES}];
uniform vec4 uClip[${MAX_SURFACES}];
uniform float uRadius[${MAX_SURFACES}];
uniform vec2 uAnchor[${MAX_SURFACES}];
uniform float uDpr, uSigma0, uDark, uTime, uDelta, uFrame, uScroll;
uniform float uRefraction, uBevel, uIor, uRadial, uLens, uRipple, uFrost, uSaturation, uDispersion, uAdapt, uSpecular, uPointerLight, uShadow, uBound;

vec2 cover(vec2 p) { float s = max(uRes.x / uImg.x, uRes.y / uImg.y); vec2 size = uImg * s; return (p - (uRes - size) * .5) / size; }
float sdRoundRect(vec2 p, vec4 r, float rad) { vec2 c = r.xy + r.zw * .5; vec2 q = abs(p - c) - (r.zw * .5 - rad); return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - rad; }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float valueNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
vec2 noiseSlope(vec2 p) { float e = .02; return vec2(valueNoise(p + vec2(e, 0.)) - valueNoise(p - vec2(e, 0.)), valueNoise(p + vec2(0., e)) - valueNoise(p - vec2(0., e))) / (2. * e); }
vec3 toLab(vec3 c) {
  vec3 l = mat3(.4122214708, .2119034982, .0883024619, .5363325363, .6806995451, .2817188376, .0514459929, .1073969566, .6299787005) * c;
  l = pow(max(l, 0.), vec3(1. / 3.));
  return mat3(.2104542553, 1.9779984951, .0259040371, .7936177850, -2.4285922050, .7827717662, -.0040720468, .4505937099, -.8086757660) * l;
}
vec3 fromLab(vec3 c) {
  vec3 l = mat3(1., 1., 1., .3963377774, -.1055613458, -.0894841775, .2158037573, -.0638541728, -1.2914855480) * c;
  l = l * l * l;
  return mat3(4.0767416621, -1.2684380046, -.0041960863, -3.3077115913, 2.6097574011, -.7034186147, .2309699292, -.3413193965, 1.7076147010) * l;
}
`;

const FRAMEWORK_B = `bool clipped(vec2 p, int i) { vec4 c = uClip[i]; return p.x < c.x || p.y < c.y || p.x > c.z || p.y > c.w; }
float field(vec2 p, out int idx) {
  float d = 1e9; idx = -1;
  for (int i = 0; i < ${MAX_SURFACES}; i++) { if (i >= uCount) break; if (clipped(p, i)) continue; float s = sdRoundRect(p, uRect[i], uRadius[i]); if (s < d) { d = s; idx = i; } }
  return d;
}

struct Glass {
  vec2 p;
  float depth;
  vec2 normal;
  vec2 centre;
  vec2 half_;
  float radius;
  vec2 world;
};

struct Lens {
  vec2 n;
  vec3 N;
  float t;
  vec2 dome;
  vec2 ripple;
};

Lens lens(Glass g) {
  vec2 n = g.normal;
  float t = clamp(g.depth / (uBevel * uDpr), 0., 1.);
  float u = 1. - t;
  float slope = u / sqrt(max(1. - u * u, 1e-3));
  vec2 q = (g.p - g.centre) / g.half_;
  vec2 qc = abs(g.p - g.centre) - (g.half_ - g.radius);
  float corner = smoothstep(0., g.radius * .5 + 1., min(qc.x, qc.y));
  n = normalize(mix(n, normalize(g.p - g.centre + 1e-4), uRadial * (1. - corner)) + 1e-6);
  vec2 dome = -q * uLens * 1.6;
  vec2 ripple = noiseSlope(g.p / (260. * uDpr)) * uRipple * .35;
  vec3 N = normalize(vec3(n * min(slope, 6.) + dome * .25 + ripple, 1.));
  return Lens(n, N, t, dome, ripple);
}
vec3 transmit(Glass g, Lens l) {
  vec2 q = (g.p - g.centre) / g.half_;
  float r2 = clamp(dot(q, q) * .5, 0., 1.);
  vec3 rr = refract(vec3(0., 0., -1.), l.N, 1. / uIor);
  vec2 off = rr.xy / max(-rr.z, .2) * uRefraction * uDpr;
  off += (g.p - g.centre) * uLens * .16 * (1. - r2);
  off += l.ripple * 26. * uDpr;
  float sigma = uFrost * 56. * uDpr * mix(.3, 1., smoothstep(0., 1., l.t));
  vec3 c = vec3(wallpaper(g.p - off * (1. + uDispersion), sigma).r, wallpaper(g.p - off, sigma).g, wallpaper(g.p - off * (1. - uDispersion), sigma).b);
  return max(mix(vec3(dot(c, vec3(.2126, .7152, .0722))), c, uSaturation), 0.);
}
vec3 legible(vec3 c, vec2 p) {
  float around = toLab(wallpaper(p, 80. * uDpr)).x;
  vec3 lab = toLab(c);
  lab.x = clamp(lab.x + (uDark < .5 ? max(.80 - around, 0.) : -max(around - .42, 0.)) * uAdapt * 1.4, 0., 1.);
  vec3 adapted = fromLab(lab);
  if (max(max(adapted.r, adapted.g), adapted.b) > 1.) { lab.yz *= .85; adapted = fromLab(lab); }
  return clamp(adapted, 0., 1.);
}
vec3 bounded(vec3 c) {
  vec3 lab = toLab(c);
  float x = (uDark < .5 ? .80 - lab.x : lab.x - .42) + .12;
  if (x <= 0.) return c;
  float shift = x - .12 * (1. - exp(-x / .12));
  lab.x += uDark < .5 ? shift : -shift;
  vec3 out_ = fromLab(lab);
  if (max(max(out_.r, out_.g), out_.b) > 1.) { lab.yz *= .85; out_ = fromLab(lab); }
  return clamp(out_, 0., 1.);
}
vec3 highlight(Glass g, Lens l) {
  bool pointer = uPointer.x >= 0.;
  vec2 L = pointer ? normalize(uPointer - g.centre + 1e-4) : normalize(vec2(-.6, -.8));
  float lit = pointer ? mix(abs(dot(l.n, L)) * .4, max(dot(l.n, L), 0.), .75) * (.6 + uPointerLight * .4) : abs(dot(l.n, L));
  float fresnel = pow(1. - l.N.z, 2.5);
  float rim = smoothstep(2. * uDpr, 0., g.depth);
  float sheen = pow(max(dot(normalize(vec3(l.dome * .25 + l.ripple, 1.)), normalize(vec3(-.45, -.6, .66))), 0.), 24.) * abs(uLens) * .5;
  float pool = pointer ? uPointerLight * .16 * smoothstep(260. * uDpr, 0., length(g.p - uPointer)) : 0.;
  return vec3(uSpecular * (fresnel * lit * .9 + rim * (.25 + .75 * lit) + sheen) + pool) * mix(.9, .55, uDark);
}
`;

export const IMAGE_SOURCE: GlassSource = { glsl: `
uniform sampler2D uSharp, uL0, uL1, uL2, uL3, uL4, uL5;
vec3 pyramidLevel(int i, vec2 uv) {
  if (i <= 0) return texture(uL0, uv).rgb;
  if (i == 1) return texture(uL1, uv).rgb;
  if (i == 2) return texture(uL2, uv).rgb;
  if (i == 3) return texture(uL3, uv).rgb;
  if (i == 4) return texture(uL4, uv).rgb;
  return texture(uL5, uv).rgb;
}
vec3 wallpaper(vec2 p, float sigma) {
  vec2 uv = vec2(p.x / uRes.x, 1. - p.y / uRes.y);
  if (sigma < uSigma0) return mix(texture(uSharp, cover(p)).rgb, pyramidLevel(0, uv), sigma / uSigma0);
  float f = clamp(log2(sigma / uSigma0), 0., ${PYRAMID_LEVELS - 1}. - .001);
  int i = int(floor(f));
  return mix(pyramidLevel(i, uv), pyramidLevel(i + 1, uv), fract(f));
}
vec3 backdrop(vec2 p) { return texture(uSharp, cover(p)).rgb; }
`, params: {}, animated: false, image: true };


export const DEFAULT_GLASS = `
vec3 glassColor(Glass g) {
  Lens l = lens(g);
  vec3 c = legible(transmit(g, l), g.p);
  if (uBound > 0.) c = mix(c, bounded(c), uBound);
  return c + highlight(g, l);
}
`;

const MAIN = `
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, 0.), vec3(1. / 2.4)) - .055, step(.0031308, c)); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  int idx;
  float d = field(p, idx);
  float shade = 0.;
  for (int i = 0; i < ${MAX_SURFACES}; i++) {
    if (i >= uCount) break;
    if (clipped(p, i)) continue;
    float s = max(sdRoundRect(p - vec2(0., 10. * uDpr), uRect[i], uRadius[i]), 0.);
    shade = max(shade, exp(-s * s / (2. * pow(14. * uDpr, 2.))));
  }
  vec3 outside = backdrop(p) * (1. - uShadow * .35 * shade * step(0., d));
  vec3 c = outside;
  if (idx >= 0 && d <= 1.) {
    float e = 1.5 * uDpr;
    vec4 r = uRect[idx];
    float rad = uRadius[idx];
    vec2 grad = vec2(sdRoundRect(p + vec2(e, 0.), r, rad) - sdRoundRect(p - vec2(e, 0.), r, rad), sdRoundRect(p + vec2(0., e), r, rad) - sdRoundRect(p - vec2(0., e), r, rad));
    Glass g = Glass(p, max(-d, 0.), length(grad) > 0. ? normalize(grad) : vec2(0.), r.xy + r.zw * .5, r.zw * .5, rad, p + uAnchor[idx]);
    c = mix(outside, glassColor(g), smoothstep(.75, -.75, d));
  }
  o = vec4(toSrgb(c) + (hash(gl_FragCoord.xy) - .5) / 255., 1.);
}`;

export type MaterialParams = Record<string, { token: string; value: number }>;

export interface GlassMaterial {
    glsl: string;
    params: MaterialParams;
    pointer?: (values: Record<string, number>) => boolean;
}

export interface GlassSource {
    glsl: string;
    params: MaterialParams;
    animated: boolean;
    image: boolean;
}

export const LIQUID: GlassMaterial = { glsl: DEFAULT_GLASS, params: {} };

export function uniformName(key: string): string {
    return `u${key[0].toUpperCase()}${key.slice(1)}`;
}

export function glassShader(material: GlassMaterial = LIQUID, source: GlassSource = IMAGE_SOURCE, header = ''): string {
    const uniforms = (params: MaterialParams) => Object.keys(params).map((key) => `uniform float ${uniformName(key)};\n`).join('');
    return HEAD + FRAMEWORK_A + header + uniforms(source.params) + source.glsl + FRAMEWORK_B + uniforms(material.params) + material.glsl + MAIN;
}
