import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';

interface LotteryDrum3DProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
  duration?: number;
}

export const LotteryDrum3D: React.FC<LotteryDrum3DProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
  duration = 4,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [revealedBall, setRevealedBall] = useState<Student | null>(null);
  const drumGroupRef = useRef<THREE.Group | null>(null);
  const ballMeshesRef = useRef<THREE.Mesh[]>([]);

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
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.04);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.8, 6.8);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio Stage Lighting
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 3.2);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e1b4b, 1.2);
    scene.add(hemiLight);

    // Stage Platform
    const stageGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.3, 48);
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.3 });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = -0.15;
    scene.add(stage);

    // Glowing Neon Stage Rim
    const rimGeo = new THREE.TorusGeometry(3.65, 0.05, 8, 48);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
    });
    const stageRim = new THREE.Mesh(rimGeo, rimMat);
    stageRim.rotation.x = Math.PI / 2;
    stageRim.position.y = 0.02;
    scene.add(stageRim);

    // Metallic Stand Pillars (Chân đế kim loại mạ vàng)
    const standMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.15,
    });

    const standL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.2, 16), standMat);
    standL.position.set(1.9, 1.1, 0);
    scene.add(standL);

    const standR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.2, 16), standMat);
    standR.position.set(-1.9, 1.1, 0);
    scene.add(standR);

    // Center Rotating Drum Group
    const drumGroup = new THREE.Group();
    drumGroup.position.set(0, 1.7, 0);

    // Wire Mesh Cage Cylinder
    const drumGeo = new THREE.CylinderGeometry(1.6, 1.6, 3.0, 24, 6, true);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.2,
      wireframe: true,
    });
    const drumWire = new THREE.Mesh(drumGeo, wireMat);
    drumWire.rotation.z = Math.PI / 2;
    drumGroup.add(drumWire);

    // End Caps (Vành bịt hai đầu lồng)
    const capGeo = new THREE.CylinderGeometry(1.62, 1.62, 0.08, 32);
    const capL = new THREE.Mesh(capGeo, standMat);
    capL.rotation.z = Math.PI / 2;
    capL.position.x = 1.5;
    drumGroup.add(capL);

    const capR = new THREE.Mesh(capGeo, standMat);
    capR.rotation.z = Math.PI / 2;
    capR.position.x = -1.5;
    drumGroup.add(capR);

    // Spheres inside drum (Quả cầu xổ số tương ứng học sinh)
    const ballColors = [0xef4444, 0xf59e0b, 0x10b981, 0x3b82f6, 0x8b5cf6, 0xec4899];
    const ballMeshes: THREE.Mesh[] = [];
    const ballCount = Math.max(8, Math.min(60, students.length));

    for (let i = 0; i < ballCount; i++) {
      const bGeo = new THREE.SphereGeometry(0.24, 14, 14);
      const bMat = new THREE.MeshPhysicalMaterial({
        color: ballColors[i % ballColors.length],
        metalness: 0.2,
        roughness: 0.2,
        clearcoat: 0.8,
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);

      // Random position inside cylinder
      bMesh.position.set(
        (Math.random() - 0.5) * 2.4,
        (Math.random() - 0.5) * 1.8,
        (Math.random() - 0.5) * 1.8
      );
      drumGroup.add(bMesh);
      ballMeshes.push(bMesh);
    }

    ballMeshesRef.current = ballMeshes;
    drumGroupRef.current = drumGroup;
    scene.add(drumGroup);

    // Chute (Ống dẫn bóng lăn ra)
    const chuteGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.6, 16, 1, true, 0, Math.PI);
    const chuteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
    const chute = new THREE.Mesh(chuteGeo, chuteMat);
    chute.rotation.x = Math.PI / 4;
    chute.position.set(0, 0.4, 1.8);
    scene.add(chute);

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Idle gentle rotation
      if (drumGroupRef.current) {
        if (!isPicking) {
          drumGroupRef.current.rotation.x += 0.008;
        }
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

  // Execute pick animation with tumbling physics
  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setRevealedBall(null);
      return;
    }

    setRevealedBall(null);
    let spinSpeed = 0.35;
    const startTime = performance.now();
    const animDuration = (duration || 4) * 1000;

    const interval = setInterval(() => {
      sound.playLotteryTumble();
    }, 180);

    const tumbleAnim = () => {
      const now = performance.now();
      const progress = Math.min(1, (now - startTime) / animDuration);

      if (drumGroupRef.current) {
        // Ease out deceleration
        spinSpeed = 0.45 * (1 - progress * 0.7);
        drumGroupRef.current.rotation.x += spinSpeed;

        // Tumble balls inside
        ballMeshesRef.current.forEach((ball) => {
          ball.position.y = Math.sin(now * 0.02 + ball.position.x * 5) * 0.9;
          ball.position.z = Math.cos(now * 0.02 + ball.position.y * 5) * 0.9;
        });
      }

      if (progress < 1) {
        requestAnimationFrame(tumbleAnim);
      } else {
        clearInterval(interval);
        sound.playWinnerFanfare();
        setRevealedBall(selectedStudent);

        setTimeout(() => {
          onPickEnd();
        }, 1500);
      }
    };

    requestAnimationFrame(tumbleAnim);

    return () => {
      clearInterval(interval);
    };
  }, [isPicking, selectedStudent, duration, onPickEnd]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden min-h-[420px]">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <span className="text-xl">🎰</span>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
            Máy Rút Thăm Điện Tử 3D
          </span>
          <span className="text-[10px] text-slate-400">
            Lồng quay chứa {students.length} quả cầu đại diện toàn bộ học sinh
          </span>
        </div>
      </div>

      <div ref={mountRef} className="w-full h-80 sm:h-96 flex items-center justify-center relative cursor-grab" />

      {revealedBall ? (
        <div className="absolute inset-x-6 bottom-4 z-20 p-4 bg-slate-900/95 border-2 border-amber-400 rounded-2xl shadow-2xl text-center backdrop-blur animate-bounce">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-300">
              QUẢ CẦU MAY MẮN ĐÃ LĂN RA!
            </span>
          </div>
          <span className="text-3xl sm:text-4xl font-black text-white block mt-0.5">
            {revealedBall.name}
          </span>
        </div>
      ) : (
        <div className="absolute bottom-4 inset-x-6 z-10 text-center text-xs font-semibold text-slate-300">
          {isPicking ? '🎰 Các quả cầu đang nhào lộn trong lồng...' : 'Nhấn "GỌI TÊN NGAY" để quay lồng rút thăm điện tử!'}
        </div>
      )}
    </div>
  );
};
