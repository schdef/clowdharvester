import Phaser from 'phaser';

/**
 * Cloud Harvesters - CloudShader & Procedural Cloud Utilities
 * Fragment shader for soft cloud mist distortion and procedural multi-blob generation.
 */

export const CloudMistFragShader = `
precision mediump float;

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

// Simplex/Perlin noise approximation
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = outTexCoord;
  float n = noise(uv * 8.0 + vec2(uTime * 0.05, 0.0)) * 0.03;
  vec4 color = texture2D(uMainSampler, uv + vec2(n, n * 0.5));
  gl_FragColor = color;
}
`;

/**
 * Generates procedural soft cloud textures dynamically on a Phaser Scene's texture manager
 */
export function generateCloudTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  primaryColor: number,
  highlightColor: number
): void {
  if (scene.textures.exists(key)) return;

  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return;

  const ctx = canvas.getContext();
  const hexPrimary = Phaser.Display.Color.IntegerToColor(primaryColor);
  const hexHighlight = Phaser.Display.Color.IntegerToColor(highlightColor);

  ctx.clearRect(0, 0, width, height);

  // Gradient for vertical soft falloff
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, `rgba(${hexHighlight.red}, ${hexHighlight.green}, ${hexHighlight.blue}, 0.95)`);
  grad.addColorStop(0.5, `rgba(${hexPrimary.red}, ${hexPrimary.green}, ${hexPrimary.blue}, 0.85)`);
  grad.addColorStop(1, `rgba(${hexPrimary.red}, ${hexPrimary.green}, ${hexPrimary.blue}, 0.4)`);

  ctx.fillStyle = grad;

  // Draw overlapping soft organic cloud puffs (Monument Valley style)
  const puffs = [
    { x: width * 0.25, y: height * 0.55, r: height * 0.38 },
    { x: width * 0.45, y: height * 0.42, r: height * 0.46 },
    { x: width * 0.68, y: height * 0.48, r: height * 0.40 },
    { x: width * 0.85, y: height * 0.58, r: height * 0.32 },
    { x: width * 0.15, y: height * 0.65, r: height * 0.28 },
  ];

  puffs.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Base pill to unify the bottom
  const baseY = height * 0.5;
  const baseH = height * 0.38;
  ctx.beginPath();
  ctx.roundRect(width * 0.08, baseY, width * 0.84, baseH, [16, 16, 24, 24]);
  ctx.fill();

  canvas.refresh();
}
