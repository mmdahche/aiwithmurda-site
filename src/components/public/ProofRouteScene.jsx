import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const sceneColors = {
  completed: "#59f36b",
  current: "#ffc53d",
  future: "#315d77",
  route: "#1f7650",
  pulse: "#eefcf2",
};

function buildRoutePoints(totalDays) {
  return Array.from({ length: totalDays }, (_, index) => {
    const progress = totalDays <= 1 ? 0 : index / (totalDays - 1);
    const stagedProgress = Math.sqrt(progress);
    return new THREE.Vector3(
      -7.7 + stagedProgress * 15.4,
      Math.sin(progress * Math.PI * 3.1) * 0.62 + (progress - 0.5) * 0.55,
      Math.cos(progress * Math.PI * 2.2) * 0.72 + Math.sin(progress * 8) * 0.2,
    );
  });
}

function ProofRoute({ activeDay, totalDays, reduceMotion }) {
  const groupRef = useRef(null);
  const pulseRef = useRef(null);
  const points = useMemo(() => buildRoutePoints(totalDays), [totalDays]);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  const routeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 240, 0.045, 8, false), [curve]);
  const nodeGeometry = useMemo(() => new THREE.BoxGeometry(0.17, 0.17, 0.17), []);
  const currentGeometry = useMemo(() => new THREE.OctahedronGeometry(0.34, 0), []);
  const ringGeometry = useMemo(() => new THREE.TorusGeometry(0.56, 0.026, 8, 48), []);
  const pulseGeometry = useMemo(() => new THREE.SphereGeometry(0.09, 16, 16), []);
  const completedMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: sceneColors.completed, emissive: sceneColors.completed, emissiveIntensity: 1.3 }),
    [],
  );
  const futureMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3d88ad", emissive: "#174c68", emissiveIntensity: 0.68 }),
    [],
  );
  const currentMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: sceneColors.current, emissive: sceneColors.current, emissiveIntensity: 2.1 }),
    [],
  );
  const routeMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: sceneColors.route, transparent: true, opacity: 0.82 }),
    [],
  );
  const ringMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: sceneColors.current, transparent: true, opacity: 0.72 }),
    [],
  );
  const pulseMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: sceneColors.pulse }), []);

  useFrame(({ clock, pointer }) => {
    if (groupRef.current) {
      const targetY = reduceMotion ? 0 : pointer.x * 0.16;
      const targetX = reduceMotion ? -0.08 : -0.08 + pointer.y * 0.06;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.035);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.035);
    }

    if (pulseRef.current) {
      const fixedProgress = Math.max(0, Math.min(1, (activeDay - 1) / Math.max(1, totalDays - 1)));
      const pulseProgress = reduceMotion ? fixedProgress : (clock.getElapsedTime() * 0.045) % 1;
      curve.getPointAt(pulseProgress, pulseRef.current.position);
      pulseRef.current.scale.setScalar(reduceMotion ? 1 : 0.82 + Math.sin(clock.getElapsedTime() * 4) * 0.2);
    }
  });

  const activeIndex = Math.max(0, Math.min(totalDays - 1, activeDay - 1));
  const activePosition = points[activeIndex];

  return (
    <group ref={groupRef} rotation={[-0.08, 0, -0.04]}>
      <mesh geometry={routeGeometry} material={routeMaterial} />
      {points.map((point, index) => {
        const day = index + 1;
        const isCurrent = day === activeDay;
        const material = isCurrent ? currentMaterial : day < activeDay ? completedMaterial : futureMaterial;
        return (
          <mesh
            key={day}
            position={point}
            geometry={isCurrent ? currentGeometry : nodeGeometry}
            material={material}
            rotation={[index * 0.09, index * 0.13, index * 0.08]}
            scale={isCurrent ? 1 : day < activeDay ? 1.08 : 0.82}
          />
        );
      })}
      <mesh position={activePosition} geometry={ringGeometry} material={ringMaterial} rotation={[Math.PI / 2, 0, 0]} />
      <mesh ref={pulseRef} geometry={pulseGeometry} material={pulseMaterial} />
    </group>
  );
}

export default function ProofRouteScene({ activeDay, totalDays, reduceMotion }) {
  const preserveForVisualTest =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("visual-test");

  return (
    <Canvas
      camera={{ position: [0, 0.65, 11.2], fov: 44 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: preserveForVisualTest,
      }}
    >
      <fog attach="fog" args={["#020504", 10, 20]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 5, 6]} intensity={1.5} color="#d8ffe3" />
      <pointLight position={[-4, -1, 5]} intensity={18} distance={12} color="#25f35b" />
      <pointLight position={[5, 2, 3]} intensity={14} distance={10} color="#ffb31f" />
      <ProofRoute activeDay={activeDay} totalDays={totalDays} reduceMotion={reduceMotion} />
    </Canvas>
  );
}
