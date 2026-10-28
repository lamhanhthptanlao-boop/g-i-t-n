import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { createNameSprite } from '../../utils/threeTextSprite';

interface HologramCard3DProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
  duration?: number;
}

export const HologramCard3D: React.FC<HologramCard3DProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
  duration = 4,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [revealedName, setRevealedName] = useState<string>('');
  const ringGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050b14);
    scene.fog = new THREE.FogExp2(0x050b14, 0.05);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio Cyber Lighting
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 3.0);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 2.0);
    rimLight.position.set(-3, -2, -3);
    scene.add(rimLight);

    // Floor Cyber Grid
    const gridGeo = new THREE.RingGeometry(0.5, 3.8, 32);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = Math.PI / 2;
    grid.position.y = -1.2;
    scene.add(grid);

    // Revolving Hologram Card Ring
    const ringGroup = new THREE.Group();
    const count = Math.max(1, students.length);
    const radius = Math.max(2.4, Math.sqrt(count) * 0.85);

    students.forEach((student, i) => {
      const angle = (i / count) * Math.PI * 2;
      const cardGroup = new THREE.Group();

      // Translucent Cyber Glass Backplate
      const cardGeo = new THREE.PlaneGeometry(1.4, 0.75);
      const cardMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        metalness: 0.1,
        roughness: 0.1,
        transmission: isSoftwareGl ? 0 : 0.85,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      cardGroup.add(cardMesh);

      // Card Luminous Border
      const borderGeo = new THREE.EdgesGeometry(cardGeo);
      const borderMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
      const border = new THREE.LineSegments(borderGeo, borderMat);
      cardGroup.add(border);

      // Student Name Sprite on top
      const nameSprite = createNameSprite(student.name, {
        bgColor: 'rgba(2, 132, 199, 0.4)',
        textColor: '#ffffff',
        borderColor: '#38bdf8',
        scale: 0.8,
      });
      nameSprite.position.set(0, 0, 0.05);
      cardGroup.add(nameSprite);

      cardGroup.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      cardGroup.rotation.y = -angle + Math.PI / 2;
      ringGroup.add(cardGroup);
    });

    ringGroupRef.current = ringGroup;
    scene.add(ringGroup);

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      if (ringGroupRef.current && !isPicking) {
        ringGroupRef.current.rotation.y = elapsed * 0.3;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [students, isPicking]);

  // Pick Animation
  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setRevealedName('');
      return;
    }

    setRevealedName('');
    const startTime = performance.now();
    const animDuration = (duration || 4) * 1000;
    let speed = 0.15;

    const interval = setInterval(() => {
      sound.playSparkle();
    }, 280);

    const spinRing = () => {
      const now = performance.now();
      const progress = Math.min(1, (now - startTime) / animDuration);

      if (ringGroupRef.current) {
        speed = 0.25 * (1 - progress * 0.8);
        ringGroupRef.current.rotation.y += speed;
      }

      if (progress < 1) {
        requestAnimationFrame(spinRing);
      } else {
        clearInterval(interval);
        sound.playWinnerFanfare();
        setRevealedName(selectedStudent.name);

        setTimeout(() => {
          onPickEnd();
        }, 1500);
      }
    };

    requestAnimationFrame(spinRing);

    return () => clearInterval(interval);
  }, [isPicking, selectedStudent, duration, onPickEnd]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border border-cyan-500/40 shadow-2xl overflow-hidden min-h-[420px]">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <span className="text-xl">🌌</span>
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
          Thẻ Tên Hologram 3D ({students.length} Thẻ Tương Ứng {students.length} Học Sinh)
        </span>
      </div>

      <div ref={mountRef} className="w-full h-80 sm:h-96 flex items-center justify-center relative cursor-grab" />

      {revealedName ? (
        <div className="absolute inset-x-6 bottom-4 z-20 p-4 bg-cyan-950/95 border-2 border-cyan-400 rounded-2xl shadow-[0_0_30px_#06b6d4] text-center backdrop-blur animate-bounce">
          <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-widest block">
            💎 THẺ HOLOGRAM ĐƯỢC CHỌN
          </span>
          <span className="text-3xl sm:text-4xl font-black text-white block mt-0.5">
            {revealedName}
          </span>
        </div>
      ) : (
        <div className="absolute bottom-4 inset-x-6 z-10 text-center text-xs font-semibold text-slate-300">
          {isPicking ? '🌀 Đang quét các thẻ hologram phát sáng...' : 'Các thẻ hologram 3D xoay quanh không gian sân khấu!'}
        </div>
      )}
    </div>
  );
};
