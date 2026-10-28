import * as THREE from 'three';

/**
 * Creates a high-resolution, lightweight 2D canvas sprite for 3D name badges.
 * Always billboards (faces the camera) and renders sharp text without external fonts.
 */
export function createNameSprite(
  name: string,
  options: {
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
    scale?: number;
  } = {}
): THREE.Sprite {
  const {
    bgColor = 'rgba(15, 23, 42, 0.85)',
    textColor = '#ffffff',
    borderColor = '#f59e0b',
    scale = 1.0,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);

    // Rounded Pill background
    const r = 24;
    const x = 8;
    const y = 8;
    const w = 240;
    const h = 48;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // Name text (truncated if too long)
    const displayName = name.length > 15 ? name.substring(0, 14) + '…' : name;
    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName, 128, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.5 * scale, 0.38 * scale, 1);
  return sprite;
}
