import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';

interface GashaponMachine3DProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
  duration?: number;
}

export const GashaponMachine3D: React.FC<GashaponMachine3DProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
  duration = 4,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [capsuleOpened, setCapsuleOpened] = useState<Student | null>(null);
  const crankRef = useRef<THREE.Mesh | null>(null);
  const droppedCapsuleRef = useRef<THREE.Group | null>(null);

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
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.05);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 6.2);
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

    // Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xffedd5, 3.2);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xfef08a, 0x1e1b4b, 1.2);
    scene.add(hemiLight);

    // Gashapon Body Base (Thân máy đỏ)
    const baseGeo = new THREE.CylinderGeometry(1.4, 1.6, 1.8, 32);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const machineBase = new THREE.Mesh(baseGeo, redMat);
    machineBase.position.y = 0.9;
    scene.add(machineBase);

    // Glass Globe (Vòm kính cầu chứa viên nang)
    const glassGeo = new THREE.SphereGeometry(1.5, 32, 24);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: isSoftwareGl ? 0 : 0.9,
      transparent: true,
      opacity: isSoftwareGl ? 0.35 : 1,
      roughness: 0.05,
      ior: 1.5,
    });
    const glassGlobe = new THREE.Mesh(glassGeo, glassMat);
    glassGlobe.position.y = 2.6;
    scene.add(glassGlobe);

    // Top Machine Cap
    const capGeo = new THREE.ConeGeometry(1.2, 0.6, 32);
    const cap = new THREE.Mesh(capGeo, redMat);
    cap.position.y = 4.1;
    scene.add(cap);

    // Chrome Crank Dial (Tay quay cơ học)
    const dialMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    const dialGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 16);
    dialGeo.rotateX(Math.PI / 2);
    const crank = new THREE.Mesh(dialGeo, dialMat);
    crank.position.set(0, 1.0, 1.45);
    scene.add(crank);
    crankRef.current = crank;

    // Dispenser Chute Opening (Máng nhả viên nang)
    const chuteGeo = new THREE.BoxGeometry(0.8, 0.5, 0.4);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x09090b });
    const chute = new THREE.Mesh(chuteGeo, darkMat);
    chute.position.set(0, 0.35, 1.4);
    scene.add(chute);

    // Mini Capsules inside glass globe
    const capsuleColors = [0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899, 0x8b5cf6];
    const capsuleCount = Math.max(8, Math.min(45, students.length));

    for (let i = 0; i < capsuleCount; i++) {
      const capGroup = new THREE.Group();
      const topHalf = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: capsuleColors[i % capsuleColors.length] })
      );
      const bottomHalf = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 12, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      capGroup.add(topHalf);
      capGroup.add(bottomHalf);

      capGroup.position.set(
        (Math.random() - 0.5) * 1.8,
        2.6 + (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.8
      );
      scene.add(capGroup);
    }

    // Dropped Capsule Model (in chute)
    const dropGroup = new THREE.Group();
    const dTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b })
    );
    const dBottom = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    dropGroup.add(dTop);
    dropGroup.add(dBottom);
    dropGroup.position.set(0, -10, 0); // hidden initially
    scene.add(dropGroup);
    droppedCapsuleRef.current = dropGroup;

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Idle gentle machine turn
      scene.rotation.y = Math.sin(elapsed * 0.3) * 0.05;

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
  }, [students]);

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setCapsuleOpened(null);
      if (droppedCapsuleRef.current) {
        droppedCapsuleRef.current.position.set(0, -10, 0);
      }
      return;
    }

    setCapsuleOpened(null);
    sound.playSpinTick(0.8);

    // Turn crank dial
    let crankAngle = 0;
    const crankInterval = setInterval(() => {
      crankAngle += Math.PI / 4;
      if (crankRef.current) {
        crankRef.current.rotation.z = crankAngle;
      }
      sound.playSpinTick(1.4);
    }, 100);

    const dropTimer = setTimeout(() => {
      clearInterval(crankInterval);

      if (droppedCapsuleRef.current) {
        droppedCapsuleRef.current.position.set(0, 0.45, 1.55); // capsule drops into tray
      }
      sound.playGiftOpen();
      sound.playWinnerFanfare();
      setCapsuleOpened(selectedStudent);

      const endTimer = setTimeout(() => {
        onPickEnd();
      }, 1500);

      return () => clearTimeout(endTimer);
    }, (duration * 1000) * 0.6);

    return () => {
      clearInterval(crankInterval);
      clearTimeout(dropTimer);
    };
  }, [isPicking, selectedStudent, duration, onPickEnd]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border border-red-500/40 shadow-2xl overflow-hidden min-h-[420px]">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <span className="text-xl">🔮</span>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400 block">
            Máy Chọn Viên Nang Bí Mật (Gashapon 3D)
          </span>
          <span className="text-[10px] text-slate-400">
            Chứa {students.length} viên nang hai màu cho từng bạn
          </span>
        </div>
      </div>

      <div ref={mountRef} className="w-full h-80 sm:h-96 flex items-center justify-center relative cursor-grab" />

      {capsuleOpened ? (
        <div className="absolute inset-x-6 bottom-4 z-20 p-4 bg-slate-900/95 border-2 border-amber-400 rounded-2xl shadow-2xl text-center backdrop-blur animate-bounce">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
            🎉 VIÊN NANG MAY MẮN ĐÃ TÁCH MỞ!
          </span>
          <span className="text-3xl sm:text-4xl font-black text-white block mt-0.5">
            {capsuleOpened.name}
          </span>
        </div>
      ) : (
        <div className="absolute bottom-4 inset-x-6 z-10 text-center text-xs font-semibold text-slate-300">
          {isPicking ? '🔮 Đang xoay tay quay nhả viên nang...' : 'Nhấn "GỌI TÊN NGAY" để quay máy gắp viên nang bí mật!'}
        </div>
      )}
    </div>
  );
};
