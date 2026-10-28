import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';

interface XocDia3DProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
}

export const XocDia3D: React.FC<XocDia3DProps> = ({
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [revealedName, setRevealedName] = useState<string>('');
  const bowlRef = useRef<THREE.Group | null>(null);

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

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    scene.fog = new THREE.FogExp2(0x111827, 0.05);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 4.2, 5.8);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 3.2);
    keyLight.position.set(4, 7, 4);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xfef08a, 0x1e1b4b, 1.2);
    scene.add(hemiLight);

    // Luxury Red Felt Table Surface
    const tableGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.2, 32);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.8 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.1;
    scene.add(table);

    // Ceramic Plate (Đĩa sứ men trắng viền vàng)
    const plateGeo = new THREE.CylinderGeometry(1.8, 1.3, 0.2, 32);
    const porcelainMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const plate = new THREE.Mesh(plateGeo, porcelainMat);
    plate.position.y = 0.05;
    scene.add(plate);

    // Gold rim on plate
    const goldRimGeo = new THREE.TorusGeometry(1.8, 0.04, 8, 32);
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.15,
    });
    const plateRim = new THREE.Mesh(goldRimGeo, goldMat);
    plateRim.rotation.x = Math.PI / 2;
    plateRim.position.y = 0.15;
    scene.add(plateRim);

    // 4 Two-Tone Coins (Quân vị: 1 mặt đỏ, 1 mặt trắng)
    const coinGroup = new THREE.Group();
    const coinPositions = [
      [0.45, 0.18, 0.45],
      [-0.45, 0.18, 0.45],
      [0.45, 0.18, -0.45],
      [-0.45, 0.18, -0.45],
    ];

    coinPositions.forEach(([x, y, z], idx) => {
      const coin = new THREE.Group();
      // Top half red
      const redHalf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.03, 16),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 })
      );
      redHalf.position.y = 0.015;
      coin.add(redHalf);

      // Bottom half white
      const whiteHalf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.03, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
      );
      whiteHalf.position.y = -0.015;
      coin.add(whiteHalf);

      coin.position.set(x, y, z);
      // Random flip
      if (idx % 2 === 0) {
        coin.rotation.x = Math.PI;
      }
      coinGroup.add(coin);
    });
    scene.add(coinGroup);

    // Ceramic Bowl (Bát sứ tráng men úp lên)
    const bowlGroup = new THREE.Group();

    // Inverted Hemisphere Bowl
    const bowlGeo = new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const bowl = new THREE.Mesh(bowlGeo, porcelainMat);
    bowl.rotation.x = Math.PI; // invert bowl so it covers plate
    bowl.position.y = 1.5;
    bowlGroup.add(bowl);

    // Gold rim on bowl
    const bowlRim = new THREE.Mesh(goldRimGeo, goldMat);
    bowlRim.rotation.x = Math.PI / 2;
    bowlRim.position.y = 1.5;
    bowlRim.scale.set(0.84, 0.84, 0.84);
    bowlGroup.add(bowlRim);

    // Bowl knob (chân bát)
    const knobGeo = new THREE.CylinderGeometry(0.4, 0.45, 0.2, 16);
    const knob = new THREE.Mesh(knobGeo, goldMat);
    knob.position.y = 1.55;
    bowlGroup.add(knob);

    bowlGroup.position.set(0, 0, 0);
    scene.add(bowlGroup);
    bowlRef.current = bowlGroup;

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Gentle table shine
      scene.rotation.y = Math.sin(elapsed * 0.4) * 0.05;

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
  }, []);

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setRevealedName('');
      if (bowlRef.current) {
        bowlRef.current.position.y = 0;
      }
      return;
    }

    // Play shaking sounds
    sound.playXocDiaShake();

    // Vigorously shake bowl
    let shakeStep = 0;
    const shakeInterval = setInterval(() => {
      if (bowlRef.current) {
        bowlRef.current.position.x = (Math.random() - 0.5) * 0.4;
        bowlRef.current.position.z = (Math.random() - 0.5) * 0.4;
        bowlRef.current.rotation.z = (Math.random() - 0.5) * 0.15;
      }
      shakeStep++;
      if (shakeStep > 12) {
        clearInterval(shakeInterval);
        if (bowlRef.current) {
          bowlRef.current.position.set(0, 2.5, 0); // Lift bowl up to reveal!
          bowlRef.current.rotation.set(0, 0, 0);
        }
        sound.playBowlOpen();
        sound.playWinnerFanfare();
        setRevealedName(selectedStudent.name);

        setTimeout(() => {
          onPickEnd();
        }, 1500);
      }
    }, 110);

    return () => clearInterval(shakeInterval);
  }, [isPicking, selectedStudent, onPickEnd]);

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center justify-center p-4 bg-slate-900 rounded-3xl border border-rose-500/40 shadow-2xl overflow-hidden min-h-[380px]">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <span className="text-xl">🎲</span>
        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
          Trò chơi dân gian: Xóc Đĩa May Mắn
        </span>
      </div>

      <div ref={mountRef} className="w-full h-72 sm:h-80 flex items-center justify-center relative cursor-grab" />

      {revealedName ? (
        <div className="absolute inset-x-6 bottom-4 z-20 p-4 bg-rose-950/90 border-2 border-amber-400 rounded-2xl shadow-xl text-center backdrop-blur animate-bounce">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
            🪙 MỞ BÁT: CHÚC MỪNG BẠN!
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white block mt-0.5">
            {revealedName}
          </span>
        </div>
      ) : (
        <div className="absolute bottom-4 inset-x-6 z-10 text-center text-xs font-semibold text-slate-300">
          {isPicking ? '🎲 Đang xóc đĩa lách cách...' : 'Nhấn "GỌI TÊN NGAY" để xóc đĩa mở bát!'}
        </div>
      )}
    </div>
  );
};
