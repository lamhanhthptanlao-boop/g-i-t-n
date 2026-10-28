import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { createNameSprite } from '../../utils/threeTextSprite';

interface StealEgg3DProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
}

interface EggAgent {
  group: THREE.Group;
  student: Student;
  eggMesh: THREE.Mesh;
}

export const StealEgg3D: React.FC<StealEgg3DProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hatchedName, setHatchedName] = useState<string>('');
  const eggsRef = useRef<EggAgent[]>([]);
  const targetEggRef = useRef<EggAgent | null>(null);

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
    scene.background = new THREE.Color(0x180d2b);
    scene.fog = new THREE.FogExp2(0x180d2b, 0.04);

    const count = Math.max(1, students.length);
    const nestRadius = Math.max(5.0, Math.sqrt(count) * 1.9);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, nestRadius * 0.95, nestRadius * 1.45);
    camera.lookAt(0, 0.5, 0);

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
    keyLight.position.set(nestRadius, nestRadius * 1.5, nestRadius);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xd8b4fe, 0x3b0764, 1.3);
    scene.add(hemiLight);

    // Stone Pedestal
    const baseGeo = new THREE.CylinderGeometry(nestRadius, nestRadius * 1.1, 0.4, 32);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const pedestal = new THREE.Mesh(baseGeo, stoneMat);
    pedestal.position.y = -0.2;
    scene.add(pedestal);

    // Giant Straw Nest Ring
    const nestGeo = new THREE.TorusGeometry(nestRadius, 0.5, 16, 48);
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 });
    const nest = new THREE.Mesh(nestGeo, strawMat);
    nest.rotation.x = Math.PI / 2;
    nest.position.y = 0.2;
    scene.add(nest);

    // Shared egg geometries
    const eggGeo = new THREE.SphereGeometry(0.5, 20, 20);
    eggGeo.scale(0.85, 1.35, 0.85);

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    const ribbonGeo = new THREE.TorusGeometry(0.45, 0.04, 8, 20);
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });

    const eggAgents: EggAgent[] = [];

    // Arrange eggs in spiral/rings inside nest
    students.forEach((student, idx) => {
      const eggGroup = new THREE.Group();

      const egg = new THREE.Mesh(eggGeo, goldMat);
      egg.position.y = 0.65;
      eggGroup.add(egg);

      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbon.rotation.x = Math.PI / 2;
      ribbon.position.y = 0.62;
      eggGroup.add(ribbon);

      // Student Name Badge
      const nameSprite = createNameSprite(student.name, {
        bgColor: 'rgba(24, 13, 43, 0.9)',
        textColor: '#fde047',
        borderColor: student.called ? '#10b981' : '#f59e0b',
        scale: 0.85,
      });
      nameSprite.position.set(0, 1.5, 0);
      eggGroup.add(nameSprite);

      // Distribute in golden spiral
      const goldenAngle = 2.39996; // ~137.5 degrees
      const dist = (nestRadius - 0.9) * Math.sqrt((idx + 1) / (students.length + 1));
      const theta = idx * goldenAngle;
      const px = Math.cos(theta) * dist;
      const pz = Math.sin(theta) * dist;

      eggGroup.position.set(px, 0.05, pz);
      scene.add(eggGroup);

      eggAgents.push({
        group: eggGroup,
        student,
        eggMesh: egg,
      });
    });

    eggsRef.current = eggAgents;

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Camera gentle rotation
      camera.position.x = Math.sin(elapsed * 0.06) * (nestRadius * 1.45);
      camera.position.z = Math.cos(elapsed * 0.06) * (nestRadius * 1.45);
      camera.lookAt(0, 0.5, 0);

      // Subtle egg golden gleam
      eggAgents.forEach((agent, i) => {
        agent.eggMesh.rotation.y = elapsed * 0.5 + i * 0.2;
      });

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
      setHatchedName('');
      return;
    }

    const targetEgg = eggsRef.current.find((e) => e.student.id === selectedStudent.id);
    targetEggRef.current = targetEgg || null;

    sound.playEggCrack();

    const timer = setTimeout(() => {
      sound.playEggCrack();
      sound.playWinnerFanfare();
      setHatchedName(selectedStudent.name);

      if (targetEgg) {
        targetEgg.group.position.y = 1.2;
      }

      const endTimer = setTimeout(() => {
        onPickEnd();
      }, 1500);

      return () => clearTimeout(endTimer);
    }, 1800);

    return () => clearTimeout(timer);
  }, [isPicking, selectedStudent, onPickEnd]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 bg-slate-900 rounded-3xl border border-purple-500/40 shadow-2xl overflow-hidden min-h-[420px]">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <span className="text-xl">🥚</span>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Ổ Trứng Vàng ({students.length} Quả Trứng Tương Ứng {students.length} Học Sinh)
        </span>
      </div>

      <div ref={mountRef} className="w-full h-80 sm:h-96 flex items-center justify-center relative cursor-grab" />

      {hatchedName ? (
        <div className="absolute inset-x-6 bottom-4 z-20 p-4 bg-purple-950/95 border-2 border-amber-400 rounded-2xl shadow-xl text-center backdrop-blur animate-bounce">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
            ✨ TRỨNG VÀNG ĐÃ NỞ RA TÊN CỦA BẠN!
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-200 block mt-0.5">
            {hatchedName}
          </span>
        </div>
      ) : (
        <div className="absolute bottom-4 inset-x-6 z-10 text-center text-xs font-semibold text-slate-300">
          {isPicking ? '🥚 Đang đập vỏ quả trứng vàng may mắn...' : 'Mỗi học sinh đều có 1 quả trứng vàng phát sáng trong ổ!'}
        </div>
      )}
    </div>
  );
};
