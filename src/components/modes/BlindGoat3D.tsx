import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { createNameSprite } from '../../utils/threeTextSprite';

interface BlindGoat3DProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
}

interface GoatAgent {
  group: THREE.Group;
  student: Student;
  bell: THREE.Mesh;
  posX: number;
  posZ: number;
  speed: number;
  angle: number;
  pranceOffset: number;
}

export const BlindGoat3D: React.FC<BlindGoat3DProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [taggedName, setTaggedName] = useState<string>('');
  const goatsRef = useRef<GoatAgent[]>([]);
  const targetGoatRef = useRef<GoatAgent | null>(null);

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
    scene.background = new THREE.Color(0x0e1726);
    scene.fog = new THREE.FogExp2(0x0e1726, 0.04);

    const count = Math.max(1, students.length);
    const arenaRadius = Math.max(5.5, Math.sqrt(count) * 2.2);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, arenaRadius * 0.9, arenaRadius * 1.5);
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
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.8);
    keyLight.position.set(arenaRadius, arenaRadius * 1.5, arenaRadius);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x14532d, 1.2);
    scene.add(hemiLight);

    // Sandy Arena Ground
    const groundGeo = new THREE.CylinderGeometry(arenaRadius, arenaRadius, 0.2, 48);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.1;
    scene.add(ground);

    // Shared Goat geometries & materials
    const bodyGeo = new THREE.CapsuleGeometry(0.42, 0.7, 8, 12);
    bodyGeo.rotateX(Math.PI / 2);
    const headGeo = new THREE.ConeGeometry(0.28, 0.6, 12);
    headGeo.rotateX(-Math.PI / 3);
    const hornGeo = new THREE.TorusGeometry(0.24, 0.05, 6, 12, Math.PI / 1.3);
    const blindfoldGeo = new THREE.TorusGeometry(0.28, 0.06, 6, 12);
    const bellGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6);

    const furMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const bellMat = new THREE.MeshPhysicalMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 });

    const goatAgents: GoatAgent[] = [];

    // Create 1 Goat per student
    students.forEach((student) => {
      const goat = new THREE.Group();

      const body = new THREE.Mesh(bodyGeo, furMat);
      body.position.set(0, 0.75, 0);
      goat.add(body);

      const head = new THREE.Mesh(headGeo, furMat);
      head.position.set(0, 1.15, 0.5);
      goat.add(head);

      const hornL = new THREE.Mesh(hornGeo, hornMat);
      hornL.position.set(0.2, 1.45, 0.35);
      hornL.rotation.z = 0.5;
      goat.add(hornL);

      const hornR = new THREE.Mesh(hornGeo, hornMat);
      hornR.position.set(-0.2, 1.45, 0.35);
      hornR.rotation.z = -0.5;
      goat.add(hornR);

      const blindfold = new THREE.Mesh(blindfoldGeo, redMat);
      blindfold.position.set(0, 1.25, 0.55);
      blindfold.rotation.x = Math.PI / 6;
      goat.add(blindfold);

      const bell = new THREE.Mesh(bellGeo, bellMat);
      bell.position.set(0, 0.85, 0.55);
      goat.add(bell);

      // 4 Legs
      const legPositions = [
        [0.22, 0.28, 0.3],
        [-0.22, 0.28, 0.3],
        [0.22, 0.28, -0.3],
        [-0.22, 0.28, -0.3],
      ];
      legPositions.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(legGeo, furMat);
        leg.position.set(x, y, z);
        goat.add(leg);
      });

      // Student Name Badge
      const nameSprite = createNameSprite(student.name, {
        bgColor: 'rgba(14, 23, 38, 0.9)',
        textColor: '#ffffff',
        borderColor: student.called ? '#10b981' : '#f59e0b',
        scale: 0.85,
      });
      nameSprite.position.set(0, 1.7, 0);
      goat.add(nameSprite);

      // Random position inside arena
      const spawnRadius = (arenaRadius - 1.2) * Math.sqrt(Math.random());
      const spawnAngle = Math.random() * Math.PI * 2;
      const px = Math.cos(spawnAngle) * spawnRadius;
      const pz = Math.sin(spawnAngle) * spawnRadius;

      goat.position.set(px, 0, pz);
      scene.add(goat);

      goatAgents.push({
        group: goat,
        student,
        bell,
        posX: px,
        posZ: pz,
        speed: 0.5 + Math.random() * 0.7,
        angle: Math.random() * Math.PI * 2,
        pranceOffset: Math.random() * 10,
      });
    });

    goatsRef.current = goatAgents;

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      goatAgents.forEach((agent) => {
        agent.angle += (Math.random() - 0.5) * dt * 2;
        agent.posX += Math.cos(agent.angle) * agent.speed * dt;
        agent.posZ += Math.sin(agent.angle) * agent.speed * dt;

        const dist = Math.sqrt(agent.posX * agent.posX + agent.posZ * agent.posZ);
        if (dist > arenaRadius - 1.1) {
          agent.angle = Math.atan2(-agent.posZ, -agent.posX) + (Math.random() - 0.5) * 0.5;
        }

        agent.group.position.x = agent.posX;
        agent.group.position.z = agent.posZ;
        agent.group.rotation.y = -agent.angle + Math.PI / 2;

        const prance = Math.abs(Math.sin(elapsed * 5 + agent.pranceOffset)) * 0.15;
        agent.group.position.y = prance;

        agent.bell.position.x = Math.sin(elapsed * 8 + agent.pranceOffset) * 0.04;
      });

      camera.position.x = Math.sin(elapsed * 0.07) * (arenaRadius * 1.5);
      camera.position.z = Math.cos(elapsed * 0.07) * (arenaRadius * 1.5);
      camera.lookAt(0, 0.4, 0);

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
      setTaggedName('');
      return;
    }

    const targetGoat = goatsRef.current.find((g) => g.student.id === selectedStudent.id);
    targetGoatRef.current = targetGoat || null;

    sound.playGoatBleat();

    const timer = setTimeout(() => {
      sound.playGoatBleat();
      sound.playWinnerFanfare();
      setTaggedName(selectedStudent.name);

      if (targetGoat) {
        targetGoat.group.position.y = 1.3;
      }

      const endTimer = setTimeout(() => {
        onPickEnd();
      }, 1500);

      return () => clearTimeout(endTimer);
    }, 1800);

    return () => clearTimeout(timer);
  }, [isPicking, selectedStudent, onPickEnd]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 bg-slate-900 rounded-3xl border border-amber-500/40 shadow-2xl overflow-hidden min-h-[420px]">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <span className="text-xl">🐐</span>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Đàn Dê Trong Sân ({students.length} Chú Dê Tương Ứng {students.length} Học Sinh)
        </span>
      </div>

      <div ref={mountRef} className="w-full h-80 sm:h-96 flex items-center justify-center relative cursor-grab" />

      {taggedName ? (
        <div className="absolute inset-x-6 bottom-4 z-20 p-4 bg-amber-950/95 border-2 border-amber-400 rounded-2xl shadow-xl text-center backdrop-blur animate-bounce">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
            🔔 ĐÃ BẮT TRÚNG CHÚ DÊ CỦA BẠN!
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white block mt-0.5">
            {taggedName}
          </span>
        </div>
      ) : (
        <div className="absolute bottom-4 inset-x-6 z-10 text-center text-xs font-semibold text-slate-300">
          {isPicking ? '🐐 Đang đuổi bắt chú dê may mắn...' : 'Mỗi học sinh sở hữu 1 chú dê bịt mắt chuông vàng trong sân!'}
        </div>
      )}
    </div>
  );
};
