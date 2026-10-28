import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { createNameSprite } from '../../utils/threeTextSprite';

interface CatchChicken3DProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
}

interface ChickenAgent {
  group: THREE.Group;
  student: Student;
  head: THREE.Mesh;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  posX: number;
  posZ: number;
  speed: number;
  angle: number;
  hopOffset: number;
}

export const CatchChicken3D: React.FC<CatchChicken3DProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [caughtName, setCaughtName] = useState<string>('');
  const chickensRef = useRef<ChickenAgent[]>([]);
  const targetChickenRef = useRef<ChickenAgent | null>(null);

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
    const yardRadius = Math.max(5.5, Math.sqrt(count) * 2.2);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, yardRadius * 0.9, yardRadius * 1.5);
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
    keyLight.position.set(yardRadius, yardRadius * 1.5, yardRadius);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x86efac, 0x1e3a8a, 1.2);
    scene.add(hemiLight);

    // Grassy Yard Floor
    const grassGeo = new THREE.CylinderGeometry(yardRadius, yardRadius, 0.2, 48);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = -0.1;
    scene.add(grass);

    // Perimeter Fence Posts
    const fencePosts = Math.max(16, Math.floor(yardRadius * 3));
    for (let i = 0; i < fencePosts; i++) {
      const a = (i / fencePosts) * Math.PI * 2;
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8);
      const postMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(Math.cos(a) * (yardRadius - 0.2), 0.3, Math.sin(a) * (yardRadius - 0.2));
      scene.add(post);
    }

    // Shared chicken geometries & materials
    const bodyGeo = new THREE.SphereGeometry(0.48, 14, 14);
    bodyGeo.scale(0.9, 1.1, 1.2);
    const headGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const combGeo = new THREE.ConeGeometry(0.14, 0.3, 8);
    combGeo.scale(0.4, 1, 1.5);
    const beakGeo = new THREE.ConeGeometry(0.12, 0.24, 8);
    const wattleGeo = new THREE.SphereGeometry(0.08, 8, 8);
    wattleGeo.scale(0.7, 1.4, 0.7);
    const wingGeo = new THREE.SphereGeometry(0.32, 10, 10);
    wingGeo.scale(0.2, 0.7, 1.1);

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });

    const chickenAgents: ChickenAgent[] = [];

    // Create 1 Chicken per student
    students.forEach((student) => {
      const chicken = new THREE.Group();

      const body = new THREE.Mesh(bodyGeo, whiteMat);
      body.position.set(0, 0.45, 0);
      chicken.add(body);

      const head = new THREE.Mesh(headGeo, whiteMat);
      head.position.set(0, 0.95, 0.35);
      chicken.add(head);

      const comb = new THREE.Mesh(combGeo, redMat);
      comb.position.set(0, 1.3, 0.35);
      chicken.add(comb);

      const beak = new THREE.Mesh(beakGeo, yellowMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.92, 0.65);
      chicken.add(beak);

      const wattle = new THREE.Mesh(wattleGeo, redMat);
      wattle.position.set(0, 0.78, 0.55);
      chicken.add(wattle);

      const wingL = new THREE.Mesh(wingGeo, whiteMat);
      wingL.position.set(0.48, 0.52, 0);
      chicken.add(wingL);

      const wingR = new THREE.Mesh(wingGeo, whiteMat);
      wingR.position.set(-0.48, 0.52, 0);
      chicken.add(wingR);

      // Student Name Sprite Badge
      const nameSprite = createNameSprite(student.name, {
        bgColor: 'rgba(15, 23, 42, 0.9)',
        textColor: '#ffffff',
        borderColor: student.called ? '#10b981' : '#ef4444',
        scale: 0.85,
      });
      nameSprite.position.set(0, 1.55, 0);
      chicken.add(nameSprite);

      // Random position inside yard
      const spawnRadius = (yardRadius - 1.2) * Math.sqrt(Math.random());
      const spawnAngle = Math.random() * Math.PI * 2;
      const px = Math.cos(spawnAngle) * spawnRadius;
      const pz = Math.sin(spawnAngle) * spawnRadius;

      chicken.position.set(px, 0, pz);
      scene.add(chicken);

      chickenAgents.push({
        group: chicken,
        student,
        head,
        wingL,
        wingR,
        posX: px,
        posZ: pz,
        speed: 0.5 + Math.random() * 0.7,
        angle: Math.random() * Math.PI * 2,
        hopOffset: Math.random() * 10,
      });
    });

    chickensRef.current = chickenAgents;

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      chickenAgents.forEach((agent) => {
        agent.angle += (Math.random() - 0.5) * dt * 2;
        agent.posX += Math.cos(agent.angle) * agent.speed * dt;
        agent.posZ += Math.sin(agent.angle) * agent.speed * dt;

        const dist = Math.sqrt(agent.posX * agent.posX + agent.posZ * agent.posZ);
        if (dist > yardRadius - 1.1) {
          agent.angle = Math.atan2(-agent.posZ, -agent.posX) + (Math.random() - 0.5) * 0.5;
        }

        agent.group.position.x = agent.posX;
        agent.group.position.z = agent.posZ;
        agent.group.rotation.y = -agent.angle + Math.PI / 2;

        // Hopping & pecking motion
        const hop = Math.abs(Math.sin(elapsed * 6 + agent.hopOffset)) * 0.2;
        agent.group.position.y = hop;
        agent.head.rotation.x = Math.sin(elapsed * 8 + agent.hopOffset) * 0.2;

        const flap = Math.sin(elapsed * 10 + agent.hopOffset) * 0.2;
        agent.wingL.rotation.z = flap;
        agent.wingR.rotation.z = -flap;
      });

      // Rotating arena camera
      camera.position.x = Math.sin(elapsed * 0.08) * (yardRadius * 1.5);
      camera.position.z = Math.cos(elapsed * 0.08) * (yardRadius * 1.5);
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
      setCaughtName('');
      return;
    }

    const targetChicken = chickensRef.current.find((c) => c.student.id === selectedStudent.id);
    targetChickenRef.current = targetChicken || null;

    sound.playChickenCluck();

    const timer = setTimeout(() => {
      sound.playChickenCluck();
      sound.playWinnerFanfare();
      setCaughtName(selectedStudent.name);

      if (targetChicken) {
        targetChicken.group.position.y = 1.3;
      }

      const endTimer = setTimeout(() => {
        onPickEnd();
      }, 1500);

      return () => clearTimeout(endTimer);
    }, 1800);

    return () => clearTimeout(timer);
  }, [isPicking, selectedStudent, onPickEnd]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 bg-slate-900 rounded-3xl border border-emerald-500/40 shadow-2xl overflow-hidden min-h-[420px]">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <span className="text-xl">🐔</span>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Đàn Gà Trong Sân ({students.length} Chú Gà Tương Ứng {students.length} Học Sinh)
        </span>
      </div>

      <div ref={mountRef} className="w-full h-80 sm:h-96 flex items-center justify-center relative cursor-grab" />

      {caughtName ? (
        <div className="absolute inset-x-6 bottom-4 z-20 p-4 bg-emerald-950/95 border-2 border-amber-400 rounded-2xl shadow-xl text-center backdrop-blur animate-bounce">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
            🎉 ĐÃ BẮT ĐƯỢC CHÚ GÀ CỦA BẠN!
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white block mt-0.5">
            {caughtName}
          </span>
        </div>
      ) : (
        <div className="absolute bottom-4 inset-x-6 z-10 text-center text-xs font-semibold text-slate-300">
          {isPicking ? '🐔 Đang rượt bắt chú gà may mắn...' : 'Mỗi học sinh sở hữu 1 chú gà tinh nghịch trong sân!'}
        </div>
      )}
    </div>
  );
};
