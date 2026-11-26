import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChristmasMiniGameId, Student } from '../../types';

interface ChristmasScene3DProps {
  miniGame: ChristmasMiniGameId;
  students: Student[];
  isPicking: boolean;
  selectedStudents: Student[];
  isGiftOpened: boolean;
  starBurstKey: number;
  onWebGLUnavailable: () => void;
}

interface VillagerNode {
  student: Student;
  group: THREE.Group;
  halo: THREE.Mesh;
  sprite: THREE.Sprite;
  baseX: number;
  baseZ: number;
  phase: number;
}

interface OrnamentNode {
  student: Student;
  group: THREE.Group;
  sphere: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  sprite: THREE.Sprite;
  basePos: THREE.Vector3;
  phase: number;
}

interface ReindeerRig {
  group: THREE.Group;
  legs: THREE.Mesh[];
  offset: number;
}

// Reusable math helpers outside render loop (zero GC)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 2.5, 0);
const _beamVec = new THREE.Vector3();
const _beamDir = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

/**
 * High-DPI full UTF-8 Vietnamese name sprite so diacritics render sharply on classroom projectors.
 */
function createChristmasNameSprite(
  name: string,
  options: {
    highlighted?: boolean;
    called?: boolean;
    scale?: number;
  } = {}
): THREE.Sprite {
  const { highlighted = false, called = false, scale = 1.0 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const padX = 12;
    const padY = 12;
    const w = canvas.width - padX * 2;
    const h = canvas.height - padY * 2;
    const r = 28;

    ctx.beginPath();
    ctx.moveTo(padX + r, padY);
    ctx.lineTo(padX + w - r, padY);
    ctx.quadraticCurveTo(padX + w, padY, padX + w, padY + r);
    ctx.lineTo(padX + w, padY + h - r);
    ctx.quadraticCurveTo(padX + w, padY + h, padX + w - r, padY + h);
    ctx.lineTo(padX + r, padY + h);
    ctx.quadraticCurveTo(padX, padY + h, padX, padY + h - r);
    ctx.lineTo(padX, padY + r);
    ctx.quadraticCurveTo(padX, padY, padX + r, padY);
    ctx.closePath();

    ctx.fillStyle = highlighted
      ? 'rgba(180, 22, 36, 0.96)'
      : called
      ? 'rgba(6, 78, 59, 0.9)'
      : 'rgba(15, 23, 42, 0.9)';
    ctx.fill();

    ctx.lineWidth = highlighted ? 7 : 5;
    ctx.strokeStyle = highlighted ? '#fde047' : called ? '#34d399' : '#f8fafc';
    ctx.stroke();

    const text = name.normalize('NFC');
    let fontSize = 36;
    ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif`;
    while (ctx.measureText(text).width > w - 36 && fontSize > 22) {
      fontSize -= 2;
      ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif`;
    }

    ctx.fillStyle = highlighted ? '#fef08a' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.45 * scale, 0.54 * scale, 1);
  sprite.renderOrder = highlighted ? 50 : 20;
  return sprite;
}

/**
 * Procedural feathered pine-needle texture so Christmas trees have rich organic foliage depth.
 */
function createPineNeedleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0c3b24';
    ctx.fillRect(0, 0, 256, 256);

    const tones = ['#0f4d2e', '#145a36', '#196f3d', '#0b351f', '#227c47'];
    for (let i = 0; i < 650; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const len = 10 + Math.random() * 14;
      const angle = (Math.random() - 0.5) * 1.3 + Math.PI / 2;
      ctx.strokeStyle = tones[i % tones.length];
      ctx.lineWidth = 1.4 + Math.random() * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
    // Subtle frosty needle tips
    ctx.fillStyle = 'rgba(226, 232, 240, 0.22)';
    for (let i = 0; i < 140; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export const ChristmasScene3D: React.FC<ChristmasScene3DProps> = ({
  miniGame,
  students,
  isPicking,
  selectedStudents,
  isGiftOpened,
  starBurstKey,
  onWebGLUnavailable,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Mutable live state refs so React UI updates never rebuild the WebGL scene
  const stateRef = useRef({
    miniGame,
    isPicking,
    selectedIds: new Set<string>(),
    isGiftOpened,
    starBurstKey: 0,
    mouseX: 0,
    mouseY: 0,
  });

  useEffect(() => {
    stateRef.current.miniGame = miniGame;
    stateRef.current.isPicking = isPicking;
    stateRef.current.selectedIds = new Set(selectedStudents.map((s) => s.id));
    stateRef.current.isGiftOpened = isGiftOpened;
  }, [miniGame, isPicking, selectedStudents, isGiftOpened]);

  // Ref for dynamic student nodes so roster changes rebuild only student sprites/actors
  const dynamicGroupRef = useRef<{
    rebuildStudents: ((list: Student[]) => void) | null;
    triggerStarBurst: (() => void) | null;
  }>({
    rebuildStudents: null,
    triggerStarBurst: null,
  });

  useEffect(() => {
    if (starBurstKey > 0 && starBurstKey !== stateRef.current.starBurstKey) {
      stateRef.current.starBurstKey = starBurstKey;
      dynamicGroupRef.current.triggerStarBurst?.();
    }
  }, [starBurstKey]);

  // Main WebGL Scene Setup (mounts once)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2') || probe.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      const testCanvas = document.createElement('canvas');
      if (!testCanvas.getContext('webgl2') && !testCanvas.getContext('webgl')) {
        onWebGLUnavailable();
        return;
      }
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      onWebGLUnavailable();
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      onWebGLUnavailable();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09152e);
    scene.fog = new THREE.FogExp2(0x09152e, 0.0135);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 180);
    camera.position.set(0, 10.5, 22);
    camera.lookAt(0, 2.5, 0);

    // Environment reflections for metallic ornaments & gold trim
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Warm/cool 3-point winter lighting
    const hemiLight = new THREE.HemisphereLight(0x8ec5fc, 0x1e293b, 1.05);
    scene.add(hemiLight);

    const moonKeyLight = new THREE.DirectionalLight(0xfff1d6, 1.85);
    moonKeyLight.position.set(16, 26, 18);
    if (!isSoftwareGl) {
      moonKeyLight.castShadow = true;
      moonKeyLight.shadow.mapSize.set(1024, 1024);
      moonKeyLight.shadow.camera.left = -22;
      moonKeyLight.shadow.camera.right = 22;
      moonKeyLight.shadow.camera.top = 22;
      moonKeyLight.shadow.camera.bottom = -22;
      moonKeyLight.shadow.bias = -0.0005;
      moonKeyLight.shadow.normalBias = 0.02;
    }
    scene.add(moonKeyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-18, 12, -16);
    scene.add(rimLight);

    const treeWarmGlow = new THREE.PointLight(0xffb703, 3.2, 22, 1.5);
    treeWarmGlow.position.set(0, 4.2, 0);
    scene.add(treeWarmGlow);

    // Disposable resource tracking
    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(res: T): T => {
      disposables.push(res);
      return res;
    };

    // 1. Snow-covered Terrain & Distant Mountains
    const snowMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.88,
        metalness: 0.02,
      })
    );
    const groundGeo = track(new THREE.CircleGeometry(75, 64));
    const ground = new THREE.Mesh(groundGeo, snowMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Snow hills & village path
    const pathMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.92,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    const ringPathGeo = track(new THREE.RingGeometry(4.2, 6.4, 48));
    const ringPath = new THREE.Mesh(ringPathGeo, pathMat);
    ringPath.rotation.x = -Math.PI / 2;
    ringPath.position.y = 0.02;
    ringPath.receiveShadow = true;
    scene.add(ringPath);

    // Horizon snow-capped mountain perimeter (no boxed indoor walls!)
    const mountainMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.95,
      })
    );
    const mountainCapMat = track(
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 })
    );
    const mountainConeGeo = track(new THREE.ConeGeometry(8, 15, 7));
    const mountainCapGeo = track(new THREE.ConeGeometry(3.2, 6, 7));

    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const dist = 48 + (i % 3) * 6;
      const mGroup = new THREE.Group();
      const base = new THREE.Mesh(mountainConeGeo, mountainMat);
      base.position.y = 7.5;
      const cap = new THREE.Mesh(mountainCapGeo, mountainCapMat);
      cap.position.y = 12.1;
      mGroup.add(base, cap);
      const s = 0.9 + (i % 4) * 0.28;
      mGroup.scale.set(s, s * (0.85 + (i % 3) * 0.2), s);
      mGroup.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
      mGroup.rotation.y = ang;
      scene.add(mGroup);
    }

    // 2. Moon & Starry Night Sky
    const moonMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xfef3c7,
      })
    );
    const moon = new THREE.Mesh(track(new THREE.SphereGeometry(2.8, 24, 24)), moonMat);
    moon.position.set(-20, 22, -38);
    scene.add(moon);

    const skyStarCount = 260;
    const skyStarPositions = new Float32Array(skyStarCount * 3);
    for (let i = 0; i < skyStarCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.42;
      const r = 68 + Math.random() * 14;
      skyStarPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      skyStarPositions[i * 3 + 1] = Math.max(6, r * Math.cos(phi));
      skyStarPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const skyStarGeo = track(new THREE.BufferGeometry());
    skyStarGeo.setAttribute('position', new THREE.BufferAttribute(skyStarPositions, 3));
    const skyStarMat = track(
      new THREE.PointsMaterial({
        color: 0xfef08a,
        size: 0.42,
        transparent: true,
        opacity: 0.85,
      })
    );
    scene.add(new THREE.Points(skyStarGeo, skyStarMat));

    // 3. Grand Central Lifelike Layered Christmas Tree
    const treeGroup = new THREE.Group();
    const pineTex = track(createPineNeedleTexture());
    const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x4a2c16, roughness: 0.94 }));
    const pineMat = track(
      new THREE.MeshStandardMaterial({
        map: pineTex,
        color: 0x1e6b43,
        roughness: 0.82,
        metalness: 0.04,
      })
    );
    const pineDeepMat = track(
      new THREE.MeshStandardMaterial({
        map: pineTex,
        color: 0x11472a,
        roughness: 0.88,
      })
    );
    const snowTipMat = track(
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, metalness: 0.02 })
    );

    const trunk = new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.72, 2.0, 12)), trunkMat);
    trunk.position.y = 1.0;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Core inner foliage shadow cones so there are no gaps between boughs
    const innerCoreGeo = track(new THREE.ConeGeometry(2.35, 6.1, 14));
    const innerCore = new THREE.Mesh(innerCoreGeo, pineDeepMat);
    innerCore.position.y = 4.55;
    innerCore.castShadow = true;
    treeGroup.add(innerCore);

    // Reusable bough frond geometries for realistic drooping pine branches
    const boughConeGeo = track(new THREE.ConeGeometry(0.56, 1.75, 7));
    boughConeGeo.rotateX(Math.PI / 2);
    boughConeGeo.translate(0, 0, 0.75);

    const snowCapGeo = track(new THREE.ConeGeometry(0.36, 1.05, 6));
    snowCapGeo.rotateX(Math.PI / 2);
    snowCapGeo.translate(0, 0.14, 0.92);

    const whorlConfigs = [
      { y: 1.75, radius: 2.35, count: 14, scale: 1.25, pitch: 0.34 },
      { y: 2.65, radius: 2.02, count: 13, scale: 1.12, pitch: 0.32 },
      { y: 3.55, radius: 1.7, count: 12, scale: 1.0, pitch: 0.3 },
      { y: 4.42, radius: 1.38, count: 11, scale: 0.88, pitch: 0.28 },
      { y: 5.25, radius: 1.05, count: 10, scale: 0.75, pitch: 0.25 },
      { y: 6.02, radius: 0.74, count: 8, scale: 0.6, pitch: 0.22 },
      { y: 6.72, radius: 0.44, count: 7, scale: 0.46, pitch: 0.18 },
    ];

    whorlConfigs.forEach((tier, tIdx) => {
      for (let b = 0; b < tier.count; b++) {
        const ang = (b / tier.count) * Math.PI * 2 + tIdx * 0.42;
        const boughHolder = new THREE.Group();
        boughHolder.position.set(
          Math.cos(ang) * tier.radius * 0.45,
          tier.y + ((b % 3) - 1) * 0.08,
          Math.sin(ang) * tier.radius * 0.45
        );
        boughHolder.rotation.y = -ang + Math.PI / 2;
        boughHolder.rotation.x = tier.pitch + (b % 2) * 0.06;

        const frond = new THREE.Mesh(boughConeGeo, b % 2 === 0 ? pineMat : pineDeepMat);
        const s = tier.scale * (0.92 + (b % 3) * 0.08);
        frond.scale.set(s, s * 0.78, s * 1.15);
        frond.castShadow = true;
        frond.receiveShadow = true;
        boughHolder.add(frond);

        // Subtle snow dusting on alternating upper pine tips
        if ((b + tIdx) % 2 === 0) {
          const snowDust = new THREE.Mesh(snowCapGeo, snowTipMat);
          snowDust.scale.set(s * 0.88, s * 0.45, s * 0.95);
          boughHolder.add(snowDust);
        }

        // Side branchlets for fuller natural pine silhouette
        const sideL = new THREE.Mesh(boughConeGeo, pineMat);
        sideL.scale.set(s * 0.58, s * 0.5, s * 0.75);
        sideL.rotation.y = 0.48;
        sideL.position.set(0.14 * s, 0, 0.32 * s);
        const sideR = new THREE.Mesh(boughConeGeo, pineMat);
        sideR.scale.set(s * 0.58, s * 0.5, s * 0.75);
        sideR.rotation.y = -0.48;
        sideR.position.set(-0.14 * s, 0, 0.32 * s);
        boughHolder.add(sideL, sideR);

        treeGroup.add(boughHolder);
      }
    });

    // Top crown spire
    const crownCone = new THREE.Mesh(track(new THREE.ConeGeometry(0.55, 1.35, 9)), pineMat);
    crownCone.position.y = 7.38;
    crownCone.castShadow = true;
    treeGroup.add(crownCone);

    // Sweeping Golden Ribbon Garland spiraling across tiers (inspired by reference image)
    const ribbonPoints: THREE.Vector3[] = [];
    const ribbonTurns = 3.6;
    const ribbonSamples = 96;
    for (let i = 0; i <= ribbonSamples; i++) {
      const t = i / ribbonSamples;
      const y = 1.65 + t * 5.35 + Math.sin(t * Math.PI * 16) * 0.14;
      const rad = 2.95 * (1 - t * 0.8) + 0.14;
      const theta = t * Math.PI * 2 * ribbonTurns;
      ribbonPoints.push(new THREE.Vector3(Math.cos(theta) * rad, y, Math.sin(theta) * rad));
    }
    const ribbonCurve = new THREE.CatmullRomCurve3(ribbonPoints);
    const ribbonGeo = track(new THREE.TubeGeometry(ribbonCurve, 96, 0.085, 7, false));
    const ribbonGarlandMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.25,
        metalness: 0.85,
        roughness: 0.22,
      })
    );
    treeGroup.add(new THREE.Mesh(ribbonGeo, ribbonGarlandMat));

    // True 5-Pointed Bevelled Golden Star Topper
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.62 : 0.26;
      const a = (i * Math.PI) / 5 + Math.PI / 2;
      const sx = Math.cos(a) * r;
      const sy = Math.sin(a) * r;
      if (i === 0) starShape.moveTo(sx, sy);
      else starShape.lineTo(sx, sy);
    }
    starShape.closePath();
    const starExtrudeGeo = track(
      new THREE.ExtrudeGeometry(starShape, {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.04,
        bevelSegments: 2,
      })
    );
    starExtrudeGeo.center();
    const starTopMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.05,
        roughness: 0.18,
        metalness: 0.9,
      })
    );
    const starTopper = new THREE.Group();
    starTopper.add(new THREE.Mesh(starExtrudeGeo, starTopMat));
    starTopper.position.y = 8.28;
    treeGroup.add(starTopper);

    // Decorative Accent Baubles nestled in the pine branches
    const accentBaubleGeo = track(new THREE.SphereGeometry(0.16, 12, 12));
    const accentPalette = [0xdc2626, 0xf59e0b, 0x0ea5e9, 0xec4899, 0x10b981];
    for (let i = 0; i < 20; i++) {
      const t = (i + 0.4) / 21;
      const y = 1.7 + t * 5.1;
      const r = 2.85 * (1 - t * 0.79);
      const ang = i * 2.15 + 0.5;
      const bMat = track(
        new THREE.MeshStandardMaterial({
          color: accentPalette[i % accentPalette.length],
          roughness: 0.16,
          metalness: 0.72,
        })
      );
      const bauble = new THREE.Mesh(accentBaubleGeo, bMat);
      bauble.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
      treeGroup.add(bauble);
    }

    // Twinkling Christmas String Lights around the boughs
    const fairyLightMeshes: Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; phase: number; baseHex: number }> = [];
    const bulbGeo = track(new THREE.SphereGeometry(0.1, 10, 10));
    const bulbPalette = [0xef4444, 0xfacc15, 0x38bdf8, 0x4ade80, 0xf472b6];
    for (let i = 0; i < 56; i++) {
      const t = i / 56;
      const y = 1.55 + t * 5.85;
      const radius = 3.0 * (1 - t * 0.81) + 0.12;
      const ang = t * Math.PI * 13;
      const colorHex = bulbPalette[i % bulbPalette.length];
      const mat = track(
        new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 1.5,
          roughness: 0.2,
        })
      );
      const bulb = new THREE.Mesh(bulbGeo, mat);
      bulb.position.set(Math.cos(ang) * radius, y, Math.sin(ang) * radius);
      treeGroup.add(bulb);
      fairyLightMeshes.push({ mesh: bulb, mat, phase: i * 0.65, baseHex: colorHex });
    }

    scene.add(treeGroup);

    // 4. Snow-Roofed Cottages (multi-part 3D houses around perimeter)
    const wallColors = [0xfef3c7, 0xfecdd3, 0xdbeafe, 0xfde68a, 0xe0e7ff];
    const roofColors = [0xb91c1c, 0x15803d, 0x991b1b, 0x1e40af];
    const windowGlowMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.3,
        roughness: 0.2,
      })
    );
    const woodMat = track(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }));
    const brickMat = track(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.9 }));

    const smokePuffs: Array<{ mesh: THREE.Mesh; baseY: number; offset: number }> = [];
    const smokeGeo = track(new THREE.SphereGeometry(0.24, 8, 8));
    const smokeMat = track(
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.42 })
    );

    const cottagePositions = [
      { x: -11.5, z: -7.5, rot: 0.45 },
      { x: 11.5, z: -7.5, rot: -0.45 },
      { x: -14, z: 2.5, rot: 1.15 },
      { x: 14, z: 2.5, rot: -1.15 },
      { x: -7, z: -13.5, rot: 0.15 },
      { x: 7, z: -13.5, rot: -0.15 },
    ];

    cottagePositions.forEach((cp, idx) => {
      const cottage = new THREE.Group();
      const wallMat = track(
        new THREE.MeshStandardMaterial({
          color: wallColors[idx % wallColors.length],
          roughness: 0.85,
        })
      );
      const roofMat = track(
        new THREE.MeshStandardMaterial({
          color: roofColors[idx % roofColors.length],
          roughness: 0.65,
        })
      );

      const body = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 2.2, 2.8)), wallMat);
      body.position.y = 1.1;
      body.castShadow = true;
      body.receiveShadow = true;
      cottage.add(body);

      const roof = new THREE.Mesh(track(new THREE.ConeGeometry(2.6, 1.8, 4)), roofMat);
      roof.position.y = 3.05;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      cottage.add(roof);

      const snowRoof = new THREE.Mesh(track(new THREE.ConeGeometry(2.68, 1.3, 4)), snowTipMat);
      snowRoof.position.y = 3.32;
      snowRoof.rotation.y = Math.PI / 4;
      cottage.add(snowRoof);

      const door = new THREE.Mesh(track(new THREE.BoxGeometry(0.75, 1.25, 0.12)), woodMat);
      door.position.set(0, 0.65, 1.42);
      cottage.add(door);

      // Glowing windows
      const winL = new THREE.Mesh(track(new THREE.BoxGeometry(0.65, 0.65, 0.12)), windowGlowMat);
      winL.position.set(-0.9, 1.25, 1.42);
      const winR = new THREE.Mesh(track(new THREE.BoxGeometry(0.65, 0.65, 0.12)), windowGlowMat);
      winR.position.set(0.9, 1.25, 1.42);
      cottage.add(winL, winR);

      // Chimney + animated smoke puffs
      const chimney = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 1.1, 0.45)), brickMat);
      chimney.position.set(0.85, 3.25, -0.4);
      cottage.add(chimney);

      for (let s = 0; s < 3; s++) {
        const puff = new THREE.Mesh(smokeGeo, smokeMat);
        puff.position.set(cp.x + 0.85, 4.1 + s * 0.7, cp.z - 0.4);
        scene.add(puff);
        smokePuffs.push({ mesh: puff, baseY: 4.1, offset: s * 1.1 + idx * 0.5 });
      }

      cottage.position.set(cp.x, 0, cp.z);
      cottage.rotation.y = cp.rot;
      scene.add(cottage);
    });

    // 5. Lifelike Multi-Tier Snow-Frosted Pine Forest + Fences + Street Lamps + Detailed Snowmen
    const outerPineTrunkGeo = track(new THREE.CylinderGeometry(0.18, 0.34, 1.3, 8));
    const outerTierGeos = [
      track(new THREE.ConeGeometry(1.55, 1.6, 9)),
      track(new THREE.ConeGeometry(1.25, 1.45, 9)),
      track(new THREE.ConeGeometry(0.95, 1.3, 9)),
      track(new THREE.ConeGeometry(0.65, 1.15, 8)),
      track(new THREE.ConeGeometry(0.38, 0.95, 8)),
    ];
    const outerSnowCapGeos = [
      track(new THREE.ConeGeometry(1.38, 0.65, 9)),
      track(new THREE.ConeGeometry(1.08, 0.58, 9)),
      track(new THREE.ConeGeometry(0.8, 0.52, 9)),
    ];
    const warmPineBulbMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.4,
        roughness: 0.2,
      })
    );
    const tinyBulbGeo = track(new THREE.SphereGeometry(0.075, 8, 8));

    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2 + 0.14;
      const dist = 17.5 + (i % 5) * 3.2;
      const pine = new THREE.Group();
      const tr = new THREE.Mesh(outerPineTrunkGeo, trunkMat);
      tr.position.y = 0.65;
      pine.add(tr);

      const tierYs = [1.55, 2.35, 3.1, 3.8, 4.42];
      outerTierGeos.forEach((geo, tIdx) => {
        const layer = new THREE.Mesh(geo, tIdx % 2 === 0 ? pineMat : pineDeepMat);
        layer.position.y = tierYs[tIdx];
        layer.rotation.y = tIdx * 0.55 + i * 0.3;
        layer.castShadow = true;
        pine.add(layer);

        if (tIdx < 3) {
          const cap = new THREE.Mesh(outerSnowCapGeos[tIdx], snowTipMat);
          cap.position.y = tierYs[tIdx] + 0.38;
          cap.rotation.y = layer.rotation.y;
          pine.add(cap);
        }
      });

      // Closer village pines get warm golden fairy bulbs (like the snowy street scene!)
      if (i % 2 === 0) {
        for (let b = 0; b < 6; b++) {
          const bt = b / 6;
          const by = 1.4 + bt * 2.6;
          const br = 1.45 * (1 - bt * 0.72);
          const ba = b * 1.9 + i;
          const bulb = new THREE.Mesh(tinyBulbGeo, warmPineBulbMat);
          bulb.position.set(Math.cos(ba) * br, by, Math.sin(ba) * br);
          pine.add(bulb);
        }
      }

      const sc = 0.85 + (i % 4) * 0.26;
      pine.scale.set(sc, sc * (0.95 + (i % 3) * 0.15), sc);
      pine.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
      scene.add(pine);
    }

    // Snow-topped Fences
    const postGeo = track(new THREE.BoxGeometry(0.16, 0.9, 0.16));
    const railGeo = track(new THREE.BoxGeometry(1.8, 0.12, 0.08));
    for (let i = 0; i < 12; i++) {
      if (i >= 4 && i <= 7) continue; // front entrance gap
      const ang = (i / 12) * Math.PI * 2;
      const fence = new THREE.Group();
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.y = 0.45;
      const cap = new THREE.Mesh(track(new THREE.SphereGeometry(0.14, 8, 8)), snowTipMat);
      cap.position.y = 0.94;
      const rail1 = new THREE.Mesh(railGeo, woodMat);
      rail1.position.y = 0.65;
      const rail2 = new THREE.Mesh(railGeo, woodMat);
      rail2.position.y = 0.35;
      fence.add(post, cap, rail1, rail2);
      fence.position.set(Math.cos(ang) * 16.5, 0, Math.sin(ang) * 16.5);
      fence.rotation.y = -ang + Math.PI / 2;
      scene.add(fence);
    }

    // Village Lamp Posts with Festive Glow
    const lampMetalMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.35 }));
    const lampAngles = [0.65, 2.5, 3.8, 5.65];
    lampAngles.forEach((ang) => {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.11, 3.1, 8)), lampMetalMat);
      pole.position.y = 1.55;
      const lantern = new THREE.Mesh(track(new THREE.SphereGeometry(0.28, 12, 12)), windowGlowMat);
      lantern.position.y = 3.2;
      const hat = new THREE.Mesh(track(new THREE.ConeGeometry(0.4, 0.25, 8)), lampMetalMat);
      hat.position.y = 3.48;
      lamp.add(pole, lantern, hat);
      lamp.position.set(Math.cos(ang) * 7.2, 0, Math.sin(ang) * 7.2);
      scene.add(lamp);
    });

    // Detailed Pixar-Style Snowmen (rosy cheeks, knitted scarf tails, twig arms, top hat with pine sprig)
    const carrotMat = track(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 }));
    const coalMat = track(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }));
    const rosyMat = track(new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.6 }));
    const scarfColors = [0xdc2626, 0x2563eb];
    [
      { x: -3.9, z: 2.6, rot: 0.42 },
      { x: 4.0, z: 2.3, rot: -0.48 },
    ].forEach((sm, idx) => {
      const snowman = new THREE.Group();
      const b1 = new THREE.Mesh(track(new THREE.SphereGeometry(0.68, 16, 14)), snowMat);
      b1.position.y = 0.58;
      const b2 = new THREE.Mesh(track(new THREE.SphereGeometry(0.5, 16, 14)), snowMat);
      b2.position.y = 1.44;
      const b3 = new THREE.Mesh(track(new THREE.SphereGeometry(0.38, 16, 14)), snowMat);
      b3.position.y = 2.12;

      const scarfMat = track(new THREE.MeshStandardMaterial({ color: scarfColors[idx], roughness: 0.75 }));
      const scarf = new THREE.Mesh(track(new THREE.TorusGeometry(0.36, 0.1, 8, 18)), scarfMat);
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = 1.8;
      const scarfTail = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.55, 0.08)), scarfMat);
      scarfTail.position.set(0.22, 1.52, 0.32);
      scarfTail.rotation.z = -0.25;

      // Belly buttons
      [1.25, 1.45, 1.62].forEach((by) => {
        const btn = new THREE.Mesh(track(new THREE.SphereGeometry(0.055, 8, 8)), coalMat);
        btn.position.set(0, by, 0.49);
        snowman.add(btn);
      });

      // Twig arms
      const armGeo = track(new THREE.CylinderGeometry(0.03, 0.04, 0.72, 6));
      const armL = new THREE.Mesh(armGeo, woodMat);
      armL.position.set(-0.68, 1.55, 0);
      armL.rotation.z = 1.05;
      const armR = new THREE.Mesh(armGeo, woodMat);
      armR.position.set(0.68, 1.55, 0);
      armR.rotation.z = -1.05;

      // Carrot nose, eyes, rosy cheeks
      const nose = new THREE.Mesh(track(new THREE.ConeGeometry(0.07, 0.34, 8)), carrotMat);
      nose.rotation.x = Math.PI / 2;
      nose.position.set(0, 2.12, 0.45);
      const eyeL = new THREE.Mesh(track(new THREE.SphereGeometry(0.05, 8, 8)), coalMat);
      eyeL.position.set(-0.13, 2.24, 0.34);
      const eyeR = new THREE.Mesh(track(new THREE.SphereGeometry(0.05, 8, 8)), coalMat);
      eyeR.position.set(0.13, 2.24, 0.34);
      const cheekL = new THREE.Mesh(track(new THREE.SphereGeometry(0.06, 8, 8)), rosyMat);
      cheekL.position.set(-0.22, 2.1, 0.31);
      const cheekR = new THREE.Mesh(track(new THREE.SphereGeometry(0.06, 8, 8)), rosyMat);
      cheekR.position.set(0.22, 2.1, 0.31);

      // Top hat + red band + pine sprig
      const hatBrim = new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 16)), coalMat);
      hatBrim.position.y = 2.44;
      const hatTop = new THREE.Mesh(track(new THREE.CylinderGeometry(0.26, 0.28, 0.42, 16)), coalMat);
      hatTop.position.y = 2.66;
      const hatBand = new THREE.Mesh(track(new THREE.CylinderGeometry(0.285, 0.285, 0.09, 16)), scarfMat);
      hatBand.position.y = 2.51;
      const hatSprig = new THREE.Mesh(track(new THREE.ConeGeometry(0.06, 0.2, 6)), pineMat);
      hatSprig.position.set(0.22, 2.62, 0.2);
      hatSprig.rotation.z = -0.35;

      snowman.add(
        b1, b2, b3, scarf, scarfTail, armL, armR,
        nose, eyeL, eyeR, cheekL, cheekR,
        hatBrim, hatTop, hatBand, hatSprig
      );
      snowman.position.set(sm.x, 0, sm.z);
      snowman.rotation.y = sm.rot;
      scene.add(snowman);
    });

    // Scattered colorful gifts under the tree
    const giftWrapColors = [0xdc2626, 0x2563eb, 0x16a34a, 0x9333ea, 0xf59e0b];
    const ribbonGoldMat = track(
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.25 })
    );
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const dist = 2.2 + (i % 2) * 0.7;
      const gift = new THREE.Group();
      const boxMat = track(
        new THREE.MeshStandardMaterial({ color: giftWrapColors[i % giftWrapColors.length], roughness: 0.45 })
      );
      const box = new THREE.Mesh(track(new THREE.BoxGeometry(0.65, 0.55, 0.65)), boxMat);
      box.position.y = 0.275;
      const rib1 = new THREE.Mesh(track(new THREE.BoxGeometry(0.68, 0.58, 0.12)), ribbonGoldMat);
      rib1.position.y = 0.28;
      const rib2 = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.58, 0.68)), ribbonGoldMat);
      rib2.position.y = 0.28;
      gift.add(box, rib1, rib2);
      gift.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
      gift.rotation.y = ang;
      scene.add(gift);
    }

    // 6. Santa Claus on Sleigh + 3 Reindeer Flying in the Sky
    const santaFlightGroup = new THREE.Group();
    const sleighGroup = new THREE.Group();

    const sleighRedMat = track(
      new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.35, metalness: 0.2 })
    );
    const sleighGoldMat = track(
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.85 })
    );
    const sleighBody = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 0.85, 1.35)), sleighRedMat);
    sleighBody.position.y = 0.7;
    sleighGroup.add(sleighBody);

    const runnerGeo = track(new THREE.BoxGeometry(2.9, 0.1, 0.1));
    const runnerL = new THREE.Mesh(runnerGeo, sleighGoldMat);
    runnerL.position.set(0, 0.15, 0.58);
    const runnerR = new THREE.Mesh(runnerGeo, sleighGoldMat);
    runnerR.position.set(0, 0.15, -0.58);
    sleighGroup.add(runnerL, runnerR);

    // Santa Claus actor inside sleigh
    const santaGroup = new THREE.Group();
    const skinMat = track(new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.6 }));
    const whiteFurMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
    const santaCoat = new THREE.Mesh(track(new THREE.ConeGeometry(0.55, 1.1, 12)), sleighRedMat);
    santaCoat.position.y = 0.55;
    const santaHead = new THREE.Mesh(track(new THREE.SphereGeometry(0.32, 12, 12)), skinMat);
    santaHead.position.y = 1.25;
    const santaBeard = new THREE.Mesh(track(new THREE.SphereGeometry(0.28, 10, 10)), whiteFurMat);
    santaBeard.position.set(0.14, 1.12, 0);
    const santaHat = new THREE.Mesh(track(new THREE.ConeGeometry(0.32, 0.65, 10)), sleighRedMat);
    santaHat.position.set(-0.05, 1.65, 0);
    santaHat.rotation.z = 0.25;
    const santaPom = new THREE.Mesh(track(new THREE.SphereGeometry(0.1, 8, 8)), whiteFurMat);
    santaPom.position.set(-0.18, 1.95, 0);
    const giftSack = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.55, 12, 12)),
      track(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }))
    );
    giftSack.position.set(-0.65, 0.85, 0);
    santaGroup.add(santaCoat, santaHead, santaBeard, santaHat, santaPom, giftSack);
    santaGroup.position.set(0.25, 0.65, 0);
    sleighGroup.add(santaGroup);
    santaFlightGroup.add(sleighGroup);

    // Three Animated Reindeer pulling the sleigh (+X direction is forward)
    const deerFurMat = track(new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 }));
    const antlerMat = track(new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 }));
    const redNoseMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 1.8,
      })
    );
    const reindeerRigs: ReindeerRig[] = [];
    const deerOffsets = [
      { x: 2.8, z: -0.75 },
      { x: 2.8, z: 0.75 },
      { x: 4.55, z: 0 }, // Lead reindeer (Rudolph!)
    ];

    deerOffsets.forEach((doff, idx) => {
      const deer = new THREE.Group();
      const torso = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 0.55, 0.48)), deerFurMat);
      torso.position.y = 0.75;
      const neck = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.2, 0.55, 8)), deerFurMat);
      neck.position.set(0.48, 1.1, 0);
      neck.rotation.z = -0.35;
      const head = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 0.3, 0.3)), deerFurMat);
      head.position.set(0.66, 1.38, 0);
      const antL = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.04, 0.45, 6)), antlerMat);
      antL.position.set(0.58, 1.68, 0.14);
      antL.rotation.x = 0.35;
      const antR = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.04, 0.45, 6)), antlerMat);
      antR.position.set(0.58, 1.68, -0.14);
      antR.rotation.x = -0.35;
      deer.add(torso, neck, head, antL, antR);

      if (idx === 2) {
        const rudolphNose = new THREE.Mesh(track(new THREE.SphereGeometry(0.11, 10, 10)), redNoseMat);
        rudolphNose.position.set(0.92, 1.38, 0);
        deer.add(rudolphNose);
      }

      const legGeo = track(new THREE.CylinderGeometry(0.07, 0.05, 0.65, 8));
      const legs: THREE.Mesh[] = [];
      [
        { x: 0.38, z: 0.16 },
        { x: 0.38, z: -0.16 },
        { x: -0.38, z: 0.16 },
        { x: -0.38, z: -0.16 },
      ].forEach((lp) => {
        const leg = new THREE.Mesh(legGeo, deerFurMat);
        leg.position.set(lp.x, 0.35, lp.z);
        deer.add(leg);
        legs.push(leg);
      });

      deer.position.set(doff.x, 0.1, doff.z);
      santaFlightGroup.add(deer);
      reindeerRigs.push({ group: deer, legs, offset: idx * 1.1 });
    });

    santaFlightGroup.position.set(0, 11.5, 0);
    scene.add(santaFlightGroup);

    // 7. Magical Spotlight Beam from Santa's Sleigh to Chosen Student (Game 1 & 2)
    const beamGeo = track(new THREE.ConeGeometry(2.1, 1, 24, 1, true));
    // Shift geometry so tip is at local origin (0,0,0) and widens down +Y when oriented
    beamGeo.translate(0, -0.5, 0);
    const beamMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const spotlightBeam = new THREE.Mesh(beamGeo, beamMat);
    spotlightBeam.visible = false;
    scene.add(spotlightBeam);

    const winnerSpotLight = new THREE.SpotLight(0xfef08a, 0, 32, Math.PI / 7, 0.5, 1.2);
    scene.add(winnerSpotLight);
    scene.add(winnerSpotLight.target);

    // 8. Center 3D Santa Gift Box for Game 3 (SANTA'S GIFT)
    const centerGiftGroup = new THREE.Group();
    const bigBoxMat = track(
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.1 })
    );
    const bigBoxBase = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 2.4, 3.2)), bigBoxMat);
    bigBoxBase.position.y = 1.2;
    bigBoxBase.castShadow = true;
    centerGiftGroup.add(bigBoxBase);

    const bigRibbon1 = new THREE.Mesh(track(new THREE.BoxGeometry(3.28, 2.42, 0.45)), ribbonGoldMat);
    bigRibbon1.position.y = 1.21;
    const bigRibbon2 = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 2.42, 3.28)), ribbonGoldMat);
    bigRibbon2.position.y = 1.21;
    centerGiftGroup.add(bigRibbon1, bigRibbon2);

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 2.4, -1.65);
    const lidMesh = new THREE.Mesh(track(new THREE.BoxGeometry(3.45, 0.55, 3.45)), bigBoxMat);
    lidMesh.position.set(0, 0.25, 1.65);
    const bowRing1 = new THREE.Mesh(track(new THREE.TorusGeometry(0.48, 0.14, 10, 20)), ribbonGoldMat);
    bowRing1.position.set(-0.35, 0.72, 1.65);
    bowRing1.rotation.y = 0.4;
    const bowRing2 = new THREE.Mesh(track(new THREE.TorusGeometry(0.48, 0.14, 10, 20)), ribbonGoldMat);
    bowRing2.position.set(0.35, 0.72, 1.65);
    bowRing2.rotation.y = -0.4;
    lidPivot.add(lidMesh, bowRing1, bowRing2);
    centerGiftGroup.add(lidPivot);

    // Rising gift glow pillar when opened
    const giftGlowPillar = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.5, 0.85, 6.0, 20, 1, true)),
      track(
        new THREE.MeshBasicMaterial({
          color: 0xfde047,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );
    giftGlowPillar.position.y = 4.2;
    centerGiftGroup.add(giftGlowPillar);

    centerGiftGroup.position.set(0, 0, 7.6);
    centerGiftGroup.visible = false;
    scene.add(centerGiftGroup);

    // 9. Dynamic Student Layers (Game 1 Villagers & Game 2 Tree Ornaments)
    const villagersContainer = new THREE.Group();
    const ornamentsContainer = new THREE.Group();
    scene.add(villagersContainer, ornamentsContainer);

    let villagerNodes: VillagerNode[] = [];
    let ornamentNodes: OrnamentNode[] = [];

    const elfHatColors = [0xdc2626, 0x16a34a, 0x2563eb, 0x9333ea, 0xea580c, 0x0891b2];
    const villagerBodyGeo = track(new THREE.CylinderGeometry(0.28, 0.42, 0.85, 12));
    const villagerHeadGeo = track(new THREE.SphereGeometry(0.28, 12, 12));
    const villagerHatGeo = track(new THREE.ConeGeometry(0.3, 0.52, 10));
    const haloGeo = track(new THREE.RingGeometry(0.55, 0.85, 24));
    const ornamentGeo = track(new THREE.SphereGeometry(0.28, 14, 14));
    const ornamentCapGeo = track(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8));

    const rebuildStudents = (list: Student[]) => {
      // Clear previous sprites/materials cleanly
      villagerNodes.forEach((v) => {
        v.sprite.material.map?.dispose();
        v.sprite.material.dispose();
        v.halo.geometry === haloGeo || v.halo.geometry.dispose();
        (v.halo.material as THREE.Material).dispose();
      });
      ornamentNodes.forEach((o) => {
        o.sprite.material.map?.dispose();
        o.sprite.material.dispose();
        o.mat.dispose();
      });
      villagersContainer.clear();
      ornamentsContainer.clear();
      villagerNodes = [];
      ornamentNodes = [];

      const safeList = list.length > 0 ? list : [];
      const total = Math.max(1, safeList.length);

      safeList.forEach((student, idx) => {
        const colorHex = elfHatColors[idx % elfHatColors.length];
        const accentMat = track(
          new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 })
        );

        // --- Game 1: Cute 3D Villager/Elf Actor ---
        const vGroup = new THREE.Group();
        const vBody = new THREE.Mesh(villagerBodyGeo, accentMat);
        vBody.position.y = 0.42;
        vBody.castShadow = true;
        const vHead = new THREE.Mesh(villagerHeadGeo, skinMat);
        vHead.position.y = 1.02;
        const vHat = new THREE.Mesh(villagerHatGeo, accentMat);
        vHat.position.y = 1.42;
        const vPom = new THREE.Mesh(track(new THREE.SphereGeometry(0.08, 8, 8)), whiteFurMat);
        vPom.position.y = 1.7;

        const haloMat = new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = -Math.PI / 2;
        halo.position.y = 0.04;

        const vSprite = createChristmasNameSprite(student.name, {
          called: student.called,
          scale: 0.92,
        });
        vSprite.position.set(0, 2.25, 0);

        vGroup.add(vBody, vHead, vHat, vPom, halo, vSprite);

        // Arrange students in an organic village semicircle/rings so names don't overlap!
        const ringIndex = Math.floor(idx / 12);
        const itemsInRing = Math.min(12, total - ringIndex * 12);
        const posInRing = idx % 12;
        const arcSpan = Math.PI * 1.45;
        const ang =
          -Math.PI / 2 - arcSpan / 2 + ((posInRing + 0.5) / Math.max(1, itemsInRing)) * arcSpan;
        const radius = 5.4 + ringIndex * 2.6;
        const bx = Math.cos(ang) * radius;
        const bz = Math.sin(ang) * radius + 1.8;

        vGroup.position.set(bx, 0, bz);
        vGroup.lookAt(0, 0, 12);
        villagersContainer.add(vGroup);

        villagerNodes.push({
          student,
          group: vGroup,
          halo,
          sprite: vSprite,
          baseX: bx,
          baseZ: bz,
          phase: idx * 0.65,
        });

        // --- Game 2: Christmas Tree Bauble Ornament ---
        const oGroup = new THREE.Group();
        const oMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.2,
          roughness: 0.18,
          metalness: 0.65,
        });
        const sphere = new THREE.Mesh(ornamentGeo, oMat);
        const cap = new THREE.Mesh(ornamentCapGeo, sleighGoldMat);
        cap.position.y = 0.3;

        const oSprite = createChristmasNameSprite(student.name, {
          called: student.called,
          scale: 0.85,
        });
        oSprite.position.set(0, -0.58, 0);

        oGroup.add(sphere, cap, oSprite);

        // Spiral distribution around front/sides of the Christmas tree
        const progress = (idx + 0.5) / total;
        const treeY = 1.65 + progress * 5.2;
        const coneR = 3.05 * (1 - ((treeY - 1.4) / 6.3) * 0.78);
        const theta = idx * 2.39996; // Golden angle spiral for clean spacing!
        const ox = Math.cos(theta) * (coneR + 0.25);
        const oz = Math.sin(theta) * (coneR + 0.25);

        const basePos = new THREE.Vector3(ox, treeY, oz);
        oGroup.position.copy(basePos);
        ornamentsContainer.add(oGroup);

        ornamentNodes.push({
          student,
          group: oGroup,
          sphere,
          mat: oMat,
          sprite: oSprite,
          basePos,
          phase: idx * 0.8,
        });
      });
    };

    rebuildStudents(students);
    dynamicGroupRef.current.rebuildStudents = rebuildStudents;

    // 10. Continuous Snowfall Particle System
    const snowCount = isSoftwareGl ? 320 : 750;
    const snowPositions = new Float32Array(snowCount * 3);
    const snowSpeeds = new Float32Array(snowCount);
    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 56;
      snowPositions[i * 3 + 1] = Math.random() * 26;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 56;
      snowSpeeds[i] = 1.4 + Math.random() * 1.8;
    }
    const snowGeo = track(new THREE.BufferGeometry());
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snowParticleMat = track(
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.26,
        transparent: true,
        opacity: 0.88,
      })
    );
    const snowPoints = new THREE.Points(snowGeo, snowParticleMat);
    scene.add(snowPoints);

    // 11. Star Burst Particles (Game 5 Reward Explosion)
    const burstCount = 90;
    const burstPositions = new Float32Array(burstCount * 3);
    const burstVelocities: THREE.Vector3[] = [];
    for (let i = 0; i < burstCount; i++) {
      burstVelocities.push(new THREE.Vector3());
    }
    const burstGeo = track(new THREE.BufferGeometry());
    burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));
    const burstMat = track(
      new THREE.PointsMaterial({
        color: 0xfde047,
        size: 0.48,
        transparent: true,
        opacity: 0,
      })
    );
    const burstPoints = new THREE.Points(burstGeo, burstMat);
    burstPoints.visible = false;
    scene.add(burstPoints);

    let burstLife = 0;
    dynamicGroupRef.current.triggerStarBurst = () => {
      burstLife = 1.0;
      burstPoints.visible = true;
      burstMat.opacity = 1;
      for (let i = 0; i < burstCount; i++) {
        burstPositions[i * 3] = 0;
        burstPositions[i * 3 + 1] = 4.5;
        burstPositions[i * 3 + 2] = 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const spd = 4 + Math.random() * 8;
        burstVelocities[i].set(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.abs(Math.cos(phi)) * spd + 2,
          Math.sin(phi) * Math.sin(theta) * spd
        );
      }
      burstGeo.attributes.position.needsUpdate = true;
    };

    // Mouse/Pointer Parallax Listener
    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      stateRef.current.mouseX = nx;
      stateRef.current.mouseY = ny;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop (with Software WebGL pacing per threejs/SKILL.md)
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let lidOpenProgress = 0;
    let villageFlyTimer = 0;
    let wasVillagePicking = false;

    function afterDraw(cb: () => void) {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } catch {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;

      // 1. Snowfall continuous motion
      const snowAttr = snowGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < snowCount; i++) {
        let y = snowAttr.getY(i) - snowSpeeds[i] * dt;
        let x = snowAttr.getX(i) + Math.sin(elapsed * 0.8 + i) * 0.35 * dt;
        if (y < 0) {
          y = 25;
          x = (Math.random() - 0.5) * 56;
        }
        snowAttr.setY(i, y);
        snowAttr.setX(i, x);
      }
      snowAttr.needsUpdate = true;

      // 2. Chimney smoke puffs rising
      smokePuffs.forEach((sp) => {
        const cycle = (elapsed * 0.45 + sp.offset) % 3;
        sp.mesh.position.y = sp.baseY + cycle * 1.1;
        sp.mesh.scale.setScalar(0.6 + cycle * 0.4);
      });

      // 3. Santa + 3 Reindeer soaring across sky (synchronized 3.6s pass across all mini-games when picking)
      if (st.isPicking) {
        if (!wasVillagePicking) {
          villageFlyTimer = 0;
          wasVillagePicking = true;
        }
        villageFlyTimer += dt;
        const passProgress = Math.min(1, villageFlyTimer / 3.6);
        const fx = THREE.MathUtils.lerp(-18, 17, passProgress);
        const fy = 11.2 + Math.sin(passProgress * Math.PI) * 1.1;
        const fz = -2.5;
        santaFlightGroup.position.set(fx, fy, fz);
        santaFlightGroup.rotation.y = 0; // Flying +X (left to right across horizon)
        santaFlightGroup.rotation.z = Math.sin(elapsed * 2.5) * 0.05;
      } else {
        wasVillagePicking = false;
        const flightAngle = elapsed * 0.24;
        const fx = Math.cos(flightAngle) * 12.5;
        const fz = Math.sin(flightAngle) * 10.5 - 1.5;
        const fy = 10.8 + Math.sin(elapsed * 1.4) * 0.7;
        santaFlightGroup.position.set(fx, fy, fz);
        // Tangent heading along ellipse (+X is forward)
        const nextX = Math.cos(flightAngle + 0.05) * 12.5;
        const nextZ = Math.sin(flightAngle + 0.05) * 10.5 - 1.5;
        santaFlightGroup.rotation.y = Math.atan2(-(nextZ - fz), nextX - fx);
        santaFlightGroup.rotation.z = Math.sin(elapsed * 1.5) * 0.05;
      }

      reindeerRigs.forEach((rig) => {
        const gallop = Math.sin(elapsed * 10 + rig.offset);
        rig.group.position.y = 0.1 + Math.abs(gallop) * 0.14;
        rig.legs[0].rotation.z = gallop * 0.6;
        rig.legs[1].rotation.z = gallop * 0.55;
        rig.legs[2].rotation.z = -gallop * 0.6;
        rig.legs[3].rotation.z = -gallop * 0.55;
      });

      // 4. Twinkling Christmas tree lights & topper rotation
      starTopper.rotation.y = elapsed * 0.9;
      const twinkleSpeed = st.isPicking ? 10 : 3.2;
      fairyLightMeshes.forEach((fl) => {
        const pulse = 0.6 + Math.sin(elapsed * twinkleSpeed + fl.phase) * 0.55;
        fl.mat.emissiveIntensity = Math.max(0.25, pulse * 1.6);
      });

      // 5. Mini-Game Specific Visibility & Animations
      const showVillagers = st.miniGame === 'village';
      const showOrnaments = st.miniGame === 'tree';
      villagersContainer.visible = showVillagers;
      ornamentsContainer.visible = showOrnaments;
      centerGiftGroup.visible = st.miniGame === 'santa_gift';

      let primaryFocusPos: THREE.Vector3 | null = null;

      if (showVillagers) {
        villagerNodes.forEach((vn) => {
          const isChosen = st.selectedIds.has(vn.student.id);
          if (st.isPicking) {
            vn.group.position.y = Math.abs(Math.sin(elapsed * 9 + vn.phase)) * 0.55;
            vn.group.position.x = vn.baseX + Math.sin(elapsed * 4 + vn.phase) * 0.35;
          } else if (isChosen) {
            vn.group.position.y = 0.35 + Math.abs(Math.sin(elapsed * 5)) * 0.45;
            vn.group.position.x = vn.baseX;
            primaryFocusPos = vn.group.position;
          } else {
            vn.group.position.y = Math.abs(Math.sin(elapsed * 2.2 + vn.phase)) * 0.08;
            vn.group.position.x = vn.baseX;
          }
          const haloMat = vn.halo.material as THREE.MeshBasicMaterial;
          haloMat.opacity = isChosen ? 0.75 + Math.sin(elapsed * 6) * 0.2 : 0;
          const targetScale = isChosen ? 1.45 : 1.0;
          vn.group.scale.x = THREE.MathUtils.damp(vn.group.scale.x, targetScale, 6, dt);
          vn.group.scale.y = THREE.MathUtils.damp(vn.group.scale.y, targetScale, 6, dt);
          vn.group.scale.z = THREE.MathUtils.damp(vn.group.scale.z, targetScale, 6, dt);
          vn.sprite.renderOrder = isChosen ? 60 : 20;
        });
      }

      if (showOrnaments) {
        treeGroup.rotation.y = st.isPicking
          ? treeGroup.rotation.y + dt * 1.35
          : Math.sin(elapsed * 0.35) * 0.15;

        ornamentNodes.forEach((on) => {
          const isChosen = st.selectedIds.has(on.student.id);
          on.group.position.y =
            on.basePos.y +
            Math.sin(elapsed * (st.isPicking ? 7 : 2) + on.phase) * (st.isPicking ? 0.14 : 0.05);
          const targetScale = isChosen ? 2.15 : 1.0;
          on.group.scale.x = THREE.MathUtils.damp(on.group.scale.x, targetScale, 6, dt);
          on.group.scale.y = THREE.MathUtils.damp(on.group.scale.y, targetScale, 6, dt);
          on.group.scale.z = THREE.MathUtils.damp(on.group.scale.z, targetScale, 6, dt);
          on.mat.emissiveIntensity = isChosen ? 1.7 + Math.sin(elapsed * 8) * 0.4 : 0.22;
          on.sprite.renderOrder = isChosen ? 60 : 20;
          if (isChosen) {
            primaryFocusPos = on.group.getWorldPosition(_beamVec);
          }
        });
      } else {
        treeGroup.rotation.y = THREE.MathUtils.damp(treeGroup.rotation.y, 0, 4, dt);
      }

      // Spotlight beam from Santa's Sleigh to chosen student
      if (primaryFocusPos && !st.isPicking) {
        spotlightBeam.visible = true;
        const startPos = santaFlightGroup.position;
        _beamDir.subVectors(primaryFocusPos, startPos);
        const len = Math.max(1, _beamDir.length());
        spotlightBeam.position.copy(startPos);
        spotlightBeam.scale.set(1, len, 1);
        _beamDir.normalize();
        _quat.setFromUnitVectors(new THREE.Vector3(0, -1, 0), _beamDir);
        spotlightBeam.quaternion.copy(_quat);

        winnerSpotLight.position.copy(startPos);
        winnerSpotLight.target.position.copy(primaryFocusPos);
        winnerSpotLight.intensity = 45;
      } else {
        spotlightBeam.visible = false;
        winnerSpotLight.intensity = 0;
      }

      // Game 3: Center Gift Box Opening Animation
      if (st.miniGame === 'santa_gift') {
        const targetOpen = st.isGiftOpened ? 1 : 0;
        lidOpenProgress = THREE.MathUtils.damp(lidOpenProgress, targetOpen, 5, dt);
        lidPivot.rotation.x = -lidOpenProgress * 1.45;
        lidPivot.position.y = 2.4 + lidOpenProgress * 0.45;
        (giftGlowPillar.material as THREE.MeshBasicMaterial).opacity = lidOpenProgress * 0.42;
        centerGiftGroup.rotation.y = st.isPicking
          ? Math.sin(elapsed * 16) * 0.12
          : Math.sin(elapsed * 0.7) * 0.14;
      } else {
        lidOpenProgress = 0;
      }

      // Game 5: Star Burst Particles
      if (burstLife > 0) {
        burstLife = Math.max(0, burstLife - dt * 0.65);
        burstMat.opacity = burstLife;
        const bAttr = burstGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < burstCount; i++) {
          burstVelocities[i].y -= 7.5 * dt;
          bAttr.setXYZ(
            i,
            bAttr.getX(i) + burstVelocities[i].x * dt,
            bAttr.getY(i) + burstVelocities[i].y * dt,
            bAttr.getZ(i) + burstVelocities[i].z * dt
          );
        }
        bAttr.needsUpdate = true;
        if (burstLife <= 0.01) burstPoints.visible = false;
      }

      // 6. Smooth Camera Framing + Mouse Parallax per mini-game
      const px = st.mouseX * 1.35;
      const py = -st.mouseY * 0.75;

      if (st.miniGame === 'tree') {
        _targetCamPos.set(px * 0.85, 5.8 + py * 0.6, 12.2);
        _targetLookAt.set(0, 4.4, 0);
      } else if (st.miniGame === 'santa_gift') {
        _targetCamPos.set(px * 0.75, 4.8 + py * 0.5, 14.5);
        _targetLookAt.set(0, 2.2, 6.2);
      } else if (st.miniGame === 'mystery_gift' || st.miniGame === 'star_rewards') {
        _targetCamPos.set(px * 0.6 + Math.sin(elapsed * 0.12) * 1.8, 7.8 + py * 0.5, 18.5);
        _targetLookAt.set(0, 3.8, 0);
      } else {
        // 'village'
        _targetCamPos.set(px * 1.1, 9.2 + py * 0.7, 19.5);
        _targetLookAt.set(0, 2.4, 1.0);
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 3.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 3.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 3.5, dt);
      _currentLookAt.x = THREE.MathUtils.damp(_currentLookAt.x, _targetLookAt.x, 3.5, dt);
      _currentLookAt.y = THREE.MathUtils.damp(_currentLookAt.y, _targetLookAt.y, 3.5, dt);
      _currentLookAt.z = THREE.MathUtils.damp(_currentLookAt.z, _targetLookAt.z, 3.5, dt);
      camera.lookAt(_currentLookAt);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (!isSoftwareGl) {
      try {
        renderer.compile(scene, camera);
      } catch {
        // Ignore shader pre-warm issues
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      villagerNodes.forEach((v) => {
        v.sprite.material.map?.dispose();
        v.sprite.material.dispose();
        (v.halo.material as THREE.Material).dispose();
      });
      ornamentNodes.forEach((o) => {
        o.sprite.material.map?.dispose();
        o.sprite.material.dispose();
        o.mat.dispose();
      });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      dynamicGroupRef.current.rebuildStudents = null;
      dynamicGroupRef.current.triggerStarBurst = null;
    };
  }, [onWebGLUnavailable]);

  // Rebuild student meshes & sprites whenever the student list or called status updates
  useEffect(() => {
    dynamicGroupRef.current.rebuildStudents?.(students);
  }, [students]);

  // Helper unused variable guard
  void _upVec;

  return <div ref={mountRef} className="absolute inset-0 w-full h-full overflow-hidden" />;
};
