import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { createNameSprite } from '../../utils/threeTextSprite';

interface CatchDuck3DProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
}

interface DuckAgent {
  group: THREE.Group;
  student: Student;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  posX: number;
  posZ: number;
  speed: number;
  angle: number;
  wobbleOffset: number;
}

export const CatchDuck3D: React.FC<CatchDuck3DProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [caughtName, setCaughtName] = useState<string>('');
  const ducksRef = useRef<DuckAgent[]>([]);
  const targetDuckRef = useRef<DuckAgent | null>(null);

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
    scene.background = new THREE.Color(0x0a192f);
    scene.fog = new THREE.FogExp2(0x0a192f, 0.04);

    const count = Math.max(1, students.length);
    // Dynamic pond radius based on student count
    const pondRadius = Math.max(5.5, Math.sqrt(count) * 2.2);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, pondRadius * 0.9, pondRadius * 1.5);
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
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.8);
    keyLight.position.set(pondRadius, pondRadius * 1.5, pondRadius);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x064e3b, 1.2);
    scene.add(hemiLight);

    // Large Pond Water
    const waterGeo = new THREE.CylinderGeometry(pondRadius, pondRadius, 0.2, 48);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const pond = new THREE.Mesh(waterGeo, waterMat);
    pond.position.y = -0.1;
    scene.add(pond);

    // Green Pond Rim
    const rimGeo = new THREE.TorusGeometry(pondRadius, 0.35, 16, 48);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    scene.add(rim);

    // Shared duck geometries & materials for high performance
    const bodyGeo = new THREE.SphereGeometry(0.5, 16, 16);
    bodyGeo.scale(1, 0.75, 1.25);
    const headGeo = new THREE.SphereGeometry(0.35, 14, 14);
    const beakGeo = new THREE.ConeGeometry(0.16, 0.3, 12);
    beakGeo.scale(1.3, 0.5, 1);
    const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const wingGeo = new THREE.SphereGeometry(0.32, 12, 12);
    wingGeo.scale(0.2, 0.6, 0.85);

    const duckYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.35,
      metalness: 0.05,
    });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1 });

    const duckAgents: DuckAgent[] = [];

    // Create 1 Duck per student
    students.forEach((student, i) => {
      const duck = new THREE.Group();

      const body = new THREE.Mesh(bodyGeo, duckYellowMat);
      body.position.set(0, 0.35, 0);
      duck.add(body);

      const head = new THREE.Mesh(headGeo, duckYellowMat);
      head.position.set(0, 0.8, 0.4);
      duck.add(head);

      const beak = new THREE.Mesh(beakGeo, beakMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.75, 0.8);
      duck.add(beak);

      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(0.22, 0.85, 0.6);
      duck.add(eyeL);

      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(-0.22, 0.85, 0.6);
      duck.add(eyeR);

      const wingL = new THREE.Mesh(wingGeo, duckYellowMat);
      wingL.position.set(0.52, 0.45, -0.05);
      duck.add(wingL);

      const wingR = new THREE.Mesh(wingGeo, duckYellowMat);
      wingR.position.set(-0.52, 0.45, -0.05);
      duck.add(wingR);

      // Student Name Sprite Label
      const nameSprite = createNameSprite(student.name, {
        bgColor: 'rgba(15, 23, 42, 0.9)',
        textColor: '#ffffff',
        borderColor: student.called ? '#10b981' : '#f59e0b',
        scale: 0.9,
      });
      nameSprite.position.set(0, 1.45, 0);
      duck.add(nameSprite);

      // Distribute randomly across the pond
      const spawnRadius = (pondRadius - 1.2) * Math.sqrt(Math.random());
      const spawnAngle = Math.random() * Math.PI * 2;
      const px = Math.cos(spawnAngle) * spawnRadius;
      const pz = Math.sin(spawnAngle) * spawnRadius;

      duck.position.set(px, 0.05, pz);
      scene.add(duck);

      duckAgents.push({
        group: duck,
        student,
        wingL,
        wingR,
        posX: px,
        posZ: pz,
        speed: 0.6 + Math.random() * 0.8,
        angle: Math.random() * Math.PI * 2,
        wobbleOffset: Math.random() * 10,
      });
    });

    ducksRef.current = duckAgents;

    // Net / Scoop Tool
    const netGroup = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
    );
    handle.position.set(0, 1.75, 0);
    netGroup.add(handle);

    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.05, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 })
    );
    hoop.rotation.x = Math.PI / 2;
    netGroup.add(hoop);
    netGroup.position.set(0, 10, 0);
    scene.add(netGroup);

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update each duck's swimming position
      duckAgents.forEach((agent) => {
        agent.angle += (Math.random() - 0.5) * dt * 2;
        agent.posX += Math.cos(agent.angle) * agent.speed * dt;
        agent.posZ += Math.sin(agent.angle) * agent.speed * dt;

        // Keep inside pond boundaries
        const dist = Math.sqrt(agent.posX * agent.posX + agent.posZ * agent.posZ);
        if (dist > pondRadius - 1.1) {
          agent.angle = Math.atan2(-agent.posZ, -agent.posX) + (Math.random() - 0.5) * 0.5;
        }

        agent.group.position.x = agent.posX;
        agent.group.position.z = agent.posZ;
        agent.group.rotation.y = -agent.angle + Math.PI / 2;
        agent.group.position.y = 0.04 + Math.sin(elapsed * 4 + agent.wobbleOffset) * 0.04;

        // Wing flaps
        const flap = Math.sin(elapsed * 8 + agent.wobbleOffset) * 0.2;
        agent.wingL.rotation.z = flap;
        agent.wingR.rotation.z = -flap;
      });

      // Camera gently rotates around the pond
      camera.position.x = Math.sin(elapsed * 0.08) * (pondRadius * 1.5);
      camera.position.z = Math.cos(elapsed * 0.08) * (pondRadius * 1.5);
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

  // When picking triggers: find the chosen student's duck and highlight it
  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setCaughtName('');
      return;
    }

    const targetDuck = ducksRef.current.find((d) => d.student.id === selectedStudent.id);
    targetDuckRef.current = targetDuck || null;

    sound.playDuckQuack();

    const timer = setTimeout(() => {
      sound.playDuckQuack();
      sound.playWinnerFanfare();
      setCaughtName(selectedStudent.name);

      if (targetDuck) {
        targetDuck.group.position.y = 1.2; // Lift caught duck!
      }

      const endTimer = setTimeout(() => {
        onPickEnd();
      }, 1500);

      return () => clearTimeout(endTimer);
    }, 1800);

    return () => clearTimeout(timer);
  }, [isPicking, selectedStudent, onPickEnd]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 bg-slate-900 rounded-3xl border border-sky-500/40 shadow-2xl overflow-hidden min-h-[420px]">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <span className="text-xl">🦆</span>
        <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
          Đàn Vịt Lớp Học ({students.length} Chú Vịt Tương Ứng {students.length} Học Sinh)
        </span>
      </div>

      <div ref={mountRef} className="w-full h-80 sm:h-96 flex items-center justify-center relative cursor-grab" />

      {caughtName ? (
        <div className="absolute inset-x-6 bottom-4 z-20 p-4 bg-sky-950/95 border-2 border-amber-400 rounded-2xl shadow-xl text-center backdrop-blur animate-bounce">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
            🎯 ĐÃ BẮT ĐƯỢC CHÚ VỊT CỦA BẠN!
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white block mt-0.5">
            {caughtName}
          </span>
        </div>
      ) : (
        <div className="absolute bottom-4 inset-x-6 z-10 text-center text-xs font-semibold text-slate-300">
          {isPicking ? '🦆 Đang quăng vợt tìm chú vịt may mắn...' : 'Mỗi học sinh có 1 chú vịt riêng mang tên mình trong hồ!'}
        </div>
      )}
    </div>
  );
};
