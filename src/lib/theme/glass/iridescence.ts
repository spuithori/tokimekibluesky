import type { GlassMaterial } from './shader';

export const IRIDESCENCE: GlassMaterial = {
    params: {
        filmIor: { token: '--glass-film-ior', value: 1.33 },
        filmMin: { token: '--glass-film-min', value: 80 },
        filmMax: { token: '--glass-film-max', value: 1000 },
        filmDrain: { token: '--glass-film-drain', value: 1 },
        filmSwirl: { token: '--glass-film-swirl', value: 0.3 },
        filmScale: { token: '--glass-film-scale', value: 1000 },
        filmGain: { token: '--glass-film-gain', value: 6 },
        filmAmbient: { token: '--glass-film-ambient', value: 0.04 },
        filmBody: { token: '--glass-film-body', value: 0.45 },
        filmSheen: { token: '--glass-film-sheen', value: 0.18 },
        filmTilt: { token: '--glass-film-tilt', value: 0 },
    },
    pointer: (values) => values.filmTilt > 0,
    glsl: `
const mat3 XYZ_TO_SRGB = mat3(3.2404542, -.9692660, .0556434, -1.5371385, 1.8760108, -.2040259, -.4985314, .0415560, 1.0572252);
vec3 sensitivity(float opd) {
  float phase = 6.2831853 * opd * 1e-9;
  vec3 v = vec3(4.3278e9, 9.3046e9, 6.6121e9);
  vec3 xyz = vec3(.84659, 1.00022, 1.00112) * cos(vec3(1.6810e6, 1.7953e6, 2.2084e6) * phase) * exp(-phase * phase * v);
  xyz.x += .15387 * cos(2.2399e6 * phase) * exp(-4.5282e9 * phase * phase);
  return XYZ_TO_SRGB * xyz;
}
float schlick(float f0, float c) { float m = 1. - c; float m2 = m * m; return f0 + (1. - f0) * m2 * m2 * m; }
vec3 filmReflectance(float cos1, float d) {
  float n = uFilmIor;
  float cos2 = sqrt(max(1. - (1. - cos1 * cos1) / (n * n), 0.));
  float f0 = pow((n - 1.) / (n + 1.), 2.);
  float r12 = schlick(f0, cos1);
  float r23 = schlick(f0, cos2);
  float t = 1. - r12;
  float r123 = clamp(r12 * r23, 1e-5, .9999);
  float a = sqrt(r123);
  float rs = t * t * r23 / (1. - r123);
  float opd = 2. * n * d * cos2;
  float cm = (rs - t) * a;
  vec3 c = vec3(r12 + rs) + cm * 2. * sensitivity(opd);
  c += cm * a * 2. * sensitivity(2. * opd);
  return max(c, 0.);
}
float fbm(vec2 p) {
  float s = 0., a = .5;
  for (int i = 0; i < 4; i++) { s += a * valueNoise(p); p = p * 2.03 + vec2(17.3, 9.1); a *= .5; }
  return s / .9375;
}
float filmThickness(Glass g) {
  vec2 w = g.world / (uFilmScale * uDpr);
  vec2 warp = vec2(fbm(w + vec2(1.7, 9.2)), fbm(w + vec2(8.3, 2.8))) - .5;
  float flow = fbm(w * vec2(1., 2.) + warp * 2.) - .5;
  float v = clamp((g.p.y - g.centre.y + g.half_.y) / (2. * g.half_.y), 0., 1.);
  return mix(uFilmMin, uFilmMax, clamp(mix(.5, sqrt(v), uFilmDrain) + flow * uFilmSwirl, 0., 1.));
}
vec3 glassColor(Glass g) {
  Lens l = lens(g);
  vec2 tilt = uPointer.x >= 0. ? (uPointer - g.centre) / uRes.y * uFilmTilt : vec2(0.);
  vec3 V = normalize(vec3(-tilt, 1.));
  float cos1 = clamp(dot(l.N, V), .02, 1.);
  vec3 R = filmReflectance(cos1, filmThickness(g));
  vec3 bounce = reflect(-V, normalize(vec3(l.dome * .25 + l.ripple, 1.)));
  vec2 b = bounce.xy / max(bounce.z, .05) - uLens * vec2(.4, .48);
  float env = mix(uFilmAmbient, 1., exp(-dot(b, b) / (2. * uFilmSheen * uFilmSheen)));
  vec3 c = transmit(g, l) * (1. - dot(R, vec3(.2126, .7152, .0722))) + R * env * uFilmGain * mix(1., uFilmBody, smoothstep(0., 1., l.t));
  float rim = smoothstep(2. * uDpr, 0., g.depth);
  return bounded(legible(c, g.p)) + R * rim * uSpecular * 4.;
}
`,
};
