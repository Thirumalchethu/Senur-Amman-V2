"use client";

/**
 * CorridorScene
 * -------------
 * Shared 3D "temple corridor" backdrop used on both the login page and the
 * dashboard page. Two variants:
 *   - "entrance": used behind the login form. Camera dollies down a pillared
 *      corridor and settles facing a closed gateway.
 *   - "sanctum":  used behind the dashboard after sign-in. Camera glides into
 *      an inner hall lit by the deity image, then settles so the real
 *      Dashboard panel can fade in over it.
 *
 * This component only draws the 3D environment. All real data, forms and
 * tables (Dashboard.js, the login form) stay ordinary 2D DOM/React — they are
 * rendered by the parent page as an overlay on top of this canvas. Numbers,
 * tables and inputs are deliberately kept flat and readable; the 3D layer is
 * atmosphere, not the UI itself.
 */

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles, Text, useTexture, useCursor } from "@react-three/drei";
import * as THREE from "three";

const GOLD = "#D9AD52";
const GOLD_BRIGHT = "#F0C874";
const MAROON_DEEP = "#3E0F16";

function useFloorTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#2a0d12";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "rgba(217,173,82,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.beginPath();
    ctx.moveTo(64, 4);
    ctx.lineTo(124, 64);
    ctx.lineTo(64, 124);
    ctx.lineTo(4, 64);
    ctx.closePath();
    ctx.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 16);
    return tex;
  }, []);
}

function Floor() {
  const tex = useFloorTexture();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -18]}>
      <planeGeometry args={[14, 60]} />
      <meshStandardMaterial map={tex} roughness={0.85} metalness={0.1} />
    </mesh>
  );
}

function Pillars({ count = 7 }) {
  const pillars = [];
  for (let i = 0; i < count; i++) {
    const z = 6 - i * 5.5;
    [-4.6, 4.6].forEach((x) => {
      pillars.push(
        <group key={`${i}-${x}`}>
          <mesh position={[x, 2.5, z]}>
            <cylinderGeometry args={[0.32, 0.4, 5, 10]} />
            <meshStandardMaterial color="#9c7431" emissive="#4a3210" emissiveIntensity={0.4} roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[x, 5.15, z]}>
            <sphereGeometry args={[0.16, 8, 8]} />
            <meshBasicMaterial color={GOLD_BRIGHT} />
          </mesh>
        </group>
      );
    });
    if (i % 2 === 0) {
      pillars.push(<pointLight key={`pl-${i}`} position={[0, 4.5, z]} color={GOLD_BRIGHT} intensity={0.5} distance={10} />);
    }
  }
  return <>{pillars}</>;
}

function Gateway({ locked = false }) {
  const color = locked ? "#5a2a2a" : GOLD;
  return (
    <group position={[0, 0, -34]}>
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[3.2, 3.6, 0.2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      {[-1.8, 1.8].map((x) => (
        <mesh key={x} position={[x, 1.9, 0.02]}>
          <boxGeometry args={[0.3, 3.9, 0.3]} />
          <meshStandardMaterial color={GOLD} emissive="#6b4a1c" emissiveIntensity={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 3.85, 0.02]}>
        <boxGeometry args={[4, 0.32, 0.32]} />
        <meshStandardMaterial color={GOLD} emissive="#6b4a1c" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 4.5, 0.02]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.4, 0.95, 4]} />
        <meshStandardMaterial color={GOLD} emissive="#6b4a1c" emissiveIntensity={0.3} />
      </mesh>
      <pointLight position={[0, 3, 3]} color={GOLD_BRIGHT} intensity={1.1} distance={14} />
    </group>
  );
}

function SanctumBackdrop({ imageUrl }) {
  const [hovered, setHovered] = useState(false); // unused, keeps useCursor import tree-shake safe
  useCursor(hovered);
  const texture = useTexture(imageUrl);
  return (
    <group position={[0, 2.1, -33.5]}>
      <mesh>
        <planeGeometry args={[3.2, 4]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[3.9, 4.7]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD_BRIGHT} emissiveIntensity={0.5} />
      </mesh>
      <pointLight position={[0, 1, 2]} color={GOLD_BRIGHT} intensity={1.6} distance={16} />
    </group>
  );
}

function CameraRig({ startZ, restZ, lookAt, duration = 4.2, onDone }) {
  const { camera } = useThree();
  const doneRef = useRef(false);
  const startTime = useRef(null);
  useFrame((state) => {
    if (startTime.current === null) startTime.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startTime.current;
    const p = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    camera.position.z = startZ + (restZ - startZ) * eased;
    camera.position.y = 2.3 + Math.sin(state.clock.elapsedTime * 1.6) * 0.04;
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    if (p >= 1 && !doneRef.current) {
      doneRef.current = true;
      onDone && onDone();
    }
  });
  return null;
}

function SceneContents({ variant, deityImage, onIntroDone, reduceMotion }) {
  const restZ = variant === "sanctum" ? -24 : -19;
  return (
    <>
      <color attach="background" args={[MAROON_DEEP === "#3E0F16" ? "#0d0405" : "#0d0405"]} />
      <fog attach="fog" args={["#0d0405", 12, 52]} />
      <ambientLight color="#3a1a12" intensity={0.9} />
      <hemisphereLight args={["#6e1f2a", "#0d0405", 0.5]} />
      <pointLight position={[0, 4, 6]} color={GOLD} intensity={0.9} distance={20} />

      <Floor />
      <Pillars />
      {variant === "sanctum" ? (
        <Suspense fallback={<Gateway />}>
          <SanctumBackdrop imageUrl={deityImage} />
        </Suspense>
      ) : (
        <Gateway />
      )}

      {!reduceMotion && (
        <Sparkles
          count={220}
          scale={[9, 6, 46]}
          position={[0, 3, -16]}
          size={3}
          speed={0.25}
          color={GOLD_BRIGHT}
          opacity={0.75}
        />
      )}

      <CameraRig
        startZ={11}
        restZ={restZ}
        lookAt={[0, 1.9, -34]}
        duration={reduceMotion ? 0.2 : 4.2}
        onDone={onIntroDone}
      />
    </>
  );
}

export default function CorridorScene({ variant = "entrance", deityImage, onIntroDone, className }) {
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Canvas
      className={className}
      dpr={[1, 2]}
      camera={{ position: [0, 2.3, 11], fov: 58, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
      style={{ position: "fixed", inset: 0 }}
    >
      <SceneContents
        variant={variant}
        deityImage={deityImage}
        onIntroDone={onIntroDone}
        reduceMotion={reduceMotion}
      />
    </Canvas>
  );
}
