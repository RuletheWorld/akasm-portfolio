"use client";
/**
 * The WebGL boarding-pass gate: a bendable pass floating over a card reader.
 * Our own implementation of the behaviour documented in BUILD_PLAN §4.
 */
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import { CARD_H, CARD_R, CARD_T, CARD_W, OM, READER_D, READER_H, READER_TILT, READER_W, SLOT_HALF, SLOT_TOP, pxPerUnit, rig, zOnTilt } from "./constants";
import { clamp, damp, smoothstep, spring, type Spring } from "@/lib/motion";
import { drawLcd, LED, makePaperTexture, makeScratchTexture, type LcdStatus } from "@/lib/textures";
import { drawPassBack, drawPassFront, passFonts } from "@/lib/passArt";
import { play, playThrottled } from "@/lib/sound";
import { softMotion } from "@/lib/canRun3D";

if (typeof window !== "undefined") RectAreaLightUniformsLib.init();

export type SceneProps = {
  status: LcdStatus;
  setStatus: (s: LcdStatus) => void;
  onSwiped: () => void;
  onReady: () => void;
  bg: string;
};

const RB_DYNAMIC = 0, RB_KINEMATIC = 2; // rapier RigidBodyType values

/* ───────────── camera rig: world units ↔ CSS pixels ───────────── */
function CameraRig() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const px = pxPerUnit(size.width, size.height);
    const visibleH = size.height / px;
    const cam = camera as THREE.PerspectiveCamera;
    rig.px = px; rig.visibleH = visibleH; rig.camY = -25 / px;
    cam.position.set(0, rig.camY, visibleH / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))));
    cam.lookAt(0, rig.camY, 0);
    cam.updateProjectionMatrix();
    const readerBottomY = OM.readerY - READER_H / 2;
    const yPx = size.height / 2 - (readerBottomY - rig.camY) * px;
    document.documentElement.style.setProperty("--reader-bottom-px", `${yPx}px`);
  }, [size, camera]);
  return null;
}

/* ───────────── curve shader patch (bend + slant + rounded corners) ───────────── */
type CurveU = { uCurve: { value: number }; uSlant: { value: number } };
function patchCurve(mat: THREE.Material, u: CurveU, alphaCorners: boolean) {
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u, { uHalf: { value: new THREE.Vector2(CARD_W / 2, CARD_H / 2) }, uR: { value: CARD_R } });
    s.vertexShader = s.vertexShader
      .replace("#include <common>", `#include <common>
        uniform float uCurve; uniform float uSlant; uniform vec2 uHalf; varying vec2 vLocal;`)
      .replace("#include <beginnormal_vertex>", `
        float nxN = position.x / uHalf.x;
        vec3 objectNormal = normalize(vec3(-(2.0*uCurve*nxN + uSlant) * 0.5, 0.0, 1.0));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
        #endif`)
      .replace("#include <begin_vertex>", `
        float nx = position.x / uHalf.x;
        vec3 transformed = position;
        transformed.z += uHalf.x * (uCurve*(nx*nx - 1.0/3.0) + uSlant*nx);
        vLocal = position.xy;`);
    if (alphaCorners)
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", `#include <common>
          uniform vec2 uHalf; uniform float uR; varying vec2 vLocal;
          float sdRound(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }`)
        .replace("#include <dithering_fragment>", `#include <dithering_fragment>
          float d = sdRound(vLocal, uHalf, uR); float aa = fwidth(d);
          gl_FragColor.a *= 1.0 - smoothstep(-aa, aa, d);`);
    else
      s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
        varying vec2 vLocal;`);
  };
}

const quat = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

/* ───────────── the pass ───────────── */
type Mode = "hover" | "drag" | "release" | "fall" | "hidden";

function PassCard({ textures, statusRef, setStatus, onSwiped, cardY }: {
  textures: { front: THREE.Texture; back: THREE.Texture };
  statusRef: React.MutableRefObject<LcdStatus>;
  setStatus: (s: LcdStatus) => void;
  onSwiped: () => void;
  cardY: React.MutableRefObject<{ x: number; y: number; visible: number }>;
}) {
  const body = useRef<RapierRigidBody>(null);
  const { camera, gl } = useThree();
  const st = useRef({
    mode: "hover" as Mode,
    opacity: 0,
    inSlot: false,
    granted: false,
    swipe: [] as { t: number; x: number }[],
    prevY: OM.hoverY, prevX: 0,
    rx: 0, z: 0, curRz: 0,
    grabLocal: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    stillMs: 0,
    prevPos: new THREE.Vector3(0, OM.hoverY, 0),
    prevV: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    curve: { x: 0, v: 0 } as Spring,
    slant: { x: 0, v: 0 } as Spring,
    ndc: new THREE.Vector2(),
    lastErr: 0,
    // drag follow springs: the card trails the pointer with a little weight instead of snapping to it
    fx: { x: 0, v: 0 } as Spring,
    fy: { x: OM.hoverY, v: 0 } as Spring,
    // respawn drop-in offset (falls in from above with a small bounce)
    drop: { x: 0, v: 0 } as Spring,
    calm: false,
  });
  useEffect(() => { st.current.calm = softMotion(); }, []);

  const { mats, depthMats, uFront, uBack } = useMemo(() => {
    const uFront: CurveU = { uCurve: { value: 0 }, uSlant: { value: 0 } };
    const uBack: CurveU = { uCurve: { value: 0 }, uSlant: { value: 0 } };
    const mk = (map: THREE.Texture, u: CurveU) => {
      const m = new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0, envMapIntensity: 0.18, transparent: true, side: THREE.FrontSide });
      patchCurve(m, u, true);
      return m;
    };
    const mkDepth = (u: CurveU) => {
      const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
      patchCurve(d, u, false);
      return d;
    };
    return { mats: [mk(textures.front, uFront), mk(textures.back, uBack)], depthMats: [mkDepth(uFront), mkDepth(uBack)], uFront, uBack };
  }, [textures]);

  const geo = useMemo(() => new THREE.PlaneGeometry(CARD_W, CARD_H, 90, 18), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

  // track pointer on window so drags survive leaving the card
  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      st.current.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const up = () => release();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

  const pointerOnZ0 = () => {
    ray.setFromCamera(st.current.ndc, camera);
    const out = new THREE.Vector3();
    return ray.ray.intersectPlane(plane, out) ?? out.set(0, 0, 0);
  };

  const grab = (e: ThreeEvent<PointerEvent>) => {
    const s = st.current, b = body.current;
    if (!b || s.mode === "hidden" || s.granted) return;
    e.stopPropagation();
    const r = gl.domElement.getBoundingClientRect();
    s.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (b.bodyType() !== RB_KINEMATIC) b.setBodyType(RB_KINEMATIC, true);
    const t = b.translation(), q = b.rotation();
    s.q.set(q.x, q.y, q.z, q.w);
    const hit = pointerOnZ0();
    s.grabLocal.set(hit.x - t.x, hit.y - t.y, 0).applyQuaternion(s.q.clone().invert());
    s.grabLocal.z = 0;
    s.prevX = t.x; s.prevY = t.y;
    s.fx.x = t.x; s.fy.x = t.y; s.fx.v = s.vel.x; s.fy.v = s.vel.y;
    // picked up while seated in the slot (resting there after a release or a fall): keep it seated
    const seated = Math.abs(t.x) < SLOT_HALF && t.y < SLOT_TOP + 0.12 && t.y > SLOT_TOP - CARD_H * 0.6;
    s.inSlot = seated;
    if (seated) { s.prevY = SLOT_TOP; setStatus("near"); }
    s.swipe = seated ? [{ t: performance.now(), x: t.x }] : [];
    s.mode = "drag";
    document.body.style.cursor = "grabbing";
  };

  const release = () => {
    const s = st.current, b = body.current;
    if (!b || s.mode !== "drag") return;
    document.body.style.cursor = "";
    if (s.inSlot) {
      s.mode = "release";
      play("press");
      if (!s.granted && statusRef.current === "near") setStatus("idle");
    } else {
      b.setBodyType(RB_DYNAMIC, true);
      const rnd = () => Math.random() * 2 - 1;
      // real throw: carry the drag momentum into the rigid body, spin from the sideways speed
      const vx = clamp(s.vel.x * 0.9, -12, 12), vy = clamp(s.vel.y * 0.8, -8, 10);
      b.setLinvel({ x: vx - s.curRz * 1.2, y: vy + 0.6, z: 0.4 * rnd() }, true);
      b.setAngvel({ x: clamp(vy * 0.12, -1.5, 1.5) + 0.4 * rnd(), y: 0.5 * rnd(), z: clamp(-vx * 0.38, -4, 4) + 0.5 * rnd() }, true);
      s.stillMs = 0;
      s.mode = "fall";
    }
  };

  const resetToHover = () => {
    const s = st.current, b = body.current;
    if (!b) return;
    b.setBodyType(RB_KINEMATIC, true);
    s.drop.x = s.calm ? 0.25 : 1.5; s.drop.v = 0;
    b.setTranslation({ x: 0, y: OM.hoverY + s.drop.x, z: 0 }, true);
    b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    Object.assign(s, { mode: "hover", opacity: 0, inSlot: false, rx: 0, z: 0, curRz: 0 });
    s.prevPos.set(0, OM.hoverY, 0);
    s.prevV.set(0, 0, 0);
  };

  useFrame((state, rawDt) => {
    const b = body.current;
    if (!b) return;
    const dt = Math.min(rawDt, 1 / 20);
    const s = st.current, t = state.clock.elapsedTime;
    switch (s.mode) {
      case "hover": {
        const amp = s.calm ? 0.35 : 1;
        spring(s.drop, 0, 90, 9, dt);
        b.setNextKinematicTranslation({ x: Math.sin(0.5 * t) * 0.05 * amp, y: OM.hoverY + Math.sin(1.2 * t) * 0.1 * amp + s.drop.x, z: 0 });
        const q = quat(Math.sin(0.7 * t) * 0.09 * amp, Math.sin(0.4 * t) * 0.06 * amp, Math.sin(0.9 * t) * 0.08 * amp + s.drop.v * 0.02);
        b.setNextKinematicRotation(q);
        s.q.copy(q);
        s.opacity = Math.min(1, s.opacity + dt / OM.fadeInS);
        break;
      }
      case "drag": {
        const p = pointerOnZ0();
        const tgtQ = quat(s.rx, 0, s.curRz);
        const off = s.grabLocal.clone().applyQuaternion(tgtQ);
        p.sub(off);
        // small magnetic band above the slot lip so a card resting on it snaps in
        const overReader = Math.abs(p.x) < SLOT_HALF && p.y < SLOT_TOP + 0.1;
        if (overReader) {
          if (s.inSlot || s.prevY >= SLOT_TOP - 0.12) {
            p.y = SLOT_TOP;
            if (!s.inSlot) {
              s.inSlot = true;
              play("press");
              if (!s.granted) setStatus("near");
              s.swipe = [{ t: performance.now(), x: p.x }];
            }
          } else {
            p.x = Math.sign(p.x || 1) * SLOT_HALF; // came from the side: pushed out
          }
        } else if (s.inSlot) {
          s.inSlot = false;
          if (!s.granted) {
            const now = performance.now();
            if (now - s.lastErr > 600) { s.lastErr = now; play("error"); setStatus("error"); }
            else if (statusRef.current === "near") setStatus("idle");
          }
        }
        let rz: number;
        let ty = p.y;
        if (s.inSlot) {
          const over = Math.max(0, Math.abs(p.x) - CARD_W / 2);
          rz = -Math.sign(p.x) * Math.min(over * 0.9, 0.85);
          ty -= over * 0.36;
          s.rx = damp(s.rx, READER_TILT, 10, dt);
          s.z = damp(s.z, zOnTilt(ty), 12, dt);
          // a swipe = the pass travels traverseSpan along the slot within swipeWindowMs (distance + speed)
          const now = performance.now();
          s.swipe.push({ t: now, x: p.x });
          while (s.swipe.length > 1 && now - s.swipe[0].t > OM.swipeWindowMs) s.swipe.shift();
          let lo = Infinity, hi = -Infinity;
          for (const q of s.swipe) { lo = Math.min(lo, q.x); hi = Math.max(hi, q.x); }
          if (hi - lo > OM.traverseSpan && !s.granted) { s.granted = true; onSwiped(); }
        } else {
          const dx = p.x - s.prevX;
          rz = clamp(s.grabLocal.x * 0.28, -0.35, 0.35) + clamp(-dx * 4, -0.3, 0.3);
          s.rx = damp(s.rx, 0, 8, dt);
          s.z = damp(s.z, 0, 10, dt);
        }
        s.curRz = damp(s.curRz, rz, s.inSlot ? 8 : 4.5, dt);
        s.q.slerp(quat(s.rx, 0, s.curRz), 1 - Math.exp(-16 * dt));
        // direct kinematic follow (as on mikes.cv): the pass sits exactly under the pointer
        s.fx.x = p.x; s.fy.x = ty;
        b.setNextKinematicTranslation({ x: s.fx.x, y: s.fy.x, z: s.z });
        b.setNextKinematicRotation(s.q);
        s.prevY = p.y; s.prevX = p.x;
        s.opacity = Math.min(1, s.opacity + dt / OM.fadeInS);
        break;
      }
      case "release": {
        const cur = b.translation();
        const x = damp(cur.x, clamp(cur.x, -0.9, 0.9), 6, dt);
        s.curRz = damp(s.curRz, 0, 8, dt);
        s.rx = damp(s.rx, READER_TILT, 10, dt);
        const y = damp(cur.y, SLOT_TOP, 10, dt);
        s.q.slerp(quat(s.rx, 0, s.curRz), 1 - Math.exp(-12 * dt));
        b.setNextKinematicTranslation({ x, y, z: zOnTilt(y) });
        b.setNextKinematicRotation(s.q);
        break;
      }
      case "fall": {
        const pos = b.translation(), v = b.linvel();
        const sp = Math.hypot(v.x, v.y, v.z);
        s.stillMs = sp < 0.05 ? s.stillMs + dt * 1000 : 0;
        const offscreen = pos.y < rig.camY - rig.visibleH / 2 - 2 || Math.abs(pos.x) > rig.visibleH * 2;
        // a pass that comes to rest in the slot stays there, ready to be swiped (as on mikes.cv)
        const inSlotZone = Math.abs(pos.x) < CARD_W / 2 + 0.1 && Math.abs(pos.y - SLOT_TOP) < 0.35;
        if (offscreen || (s.stillMs > 1200 && !inSlotZone)) {
          s.mode = "hidden";
          s.opacity = 0;
          setTimeout(resetToHover, OM.respawnMs);
          if (statusRef.current === "error" || statusRef.current === "near") setStatus("idle");
        }
        break;
      }
    }

    // bend spring from acceleration
    const tr = b.translation();
    const pos = new THREE.Vector3(tr.x, tr.y, tr.z);
    const v = pos.clone().sub(s.prevPos).divideScalar(Math.max(dt, 1e-3));
    const a = v.clone().sub(s.prevV).divideScalar(Math.max(dt, 1e-3));
    s.vel.lerp(v, 0.5);
    s.prevPos.copy(pos); s.prevV.copy(v);
    const lift = smoothstep(0.25, 0.6, pos.y - SLOT_TOP);
    const tgtCurve = (0.16 + clamp(a.y * 0.024, -0.6, 0.6)) * lift;
    const tgtSlant = clamp(-a.x * 0.024, -0.5, 0.5) * lift;
    spring(s.curve, tgtCurve, 120, 13, dt);
    spring(s.slant, tgtSlant, 120, 13, dt);
    uFront.uCurve.value = s.curve.x; uFront.uSlant.value = s.slant.x;
    uBack.uCurve.value = -s.curve.x; uBack.uSlant.value = s.slant.x;
    mats.forEach((m) => { m.opacity = s.opacity; m.depthWrite = s.opacity > 0.98; });
    cardY.current.x = pos.x; cardY.current.y = pos.y; cardY.current.visible = s.opacity;
  });

  const onCollide = () => {
    const b = body.current;
    if (!b) return;
    const v = b.linvel();
    if (Math.hypot(v.x, v.y, v.z) > 0.5) playThrottled("press", 90, 0.6);
  };

  const over = () => { if (st.current.mode !== "drag") document.body.style.cursor = "grab"; };
  const out = () => { if (st.current.mode !== "drag") document.body.style.cursor = ""; };

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} ccd gravityScale={0.8} angularDamping={1.2} linearDamping={1.1} position={[0, OM.hoverY, 0]}>
      <CuboidCollider args={[CARD_W / 2, CARD_H / 2, CARD_T / 2]} restitution={0.22} friction={0.35} onCollisionEnter={onCollide} />
      <mesh geometry={geo} material={mats[0]} customDepthMaterial={depthMats[0]} position-z={CARD_T / 2} castShadow onPointerDown={grab} onPointerOver={over} onPointerOut={out} renderOrder={2} />
      <mesh geometry={geo} material={mats[1]} customDepthMaterial={depthMats[1]} position-z={-CARD_T / 2} rotation-y={Math.PI} castShadow onPointerDown={grab} renderOrder={2} />
    </RigidBody>
  );
}

/* ───────────── reader ───────────── */
function radialTexture(inner: string, outer: string) {
  const c = Object.assign(document.createElement("canvas"), { width: 128, height: 128 });
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function Reader({ status, cardY }: { status: LcdStatus; cardY: React.MutableRefObject<{ x: number; y: number; visible: number }> }) {
  const paper = useMemo(() => makePaperTexture("#e8ddc6"), []);
  const paper2 = useMemo(() => makePaperTexture("#ddd1b6"), []);
  const scratch = useMemo(() => makeScratchTexture(), []);
  const lcd = useMemo(() => {
    const c = Object.assign(document.createElement("canvas"), { width: 512, height: 128 });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { c, t };
  }, []);
  const halo = useMemo(() => radialTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)"), []);
  const spot = useMemo(() => radialTexture("rgba(33,29,20,1)", "rgba(33,29,20,0)"), []);
  const led = useRef<THREE.MeshPhysicalMaterial>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const spotMesh = useRef<THREE.Mesh>(null);
  const glow = useRef(0.2);

  useEffect(() => {
    let alive = true;
    const draw = () => { if (!alive) return; drawLcd(lcd.c.getContext("2d")!, status); lcd.t.needsUpdate = true; };
    draw();
    document.fonts.load('62px "DSEG14 Classic"').then(draw).catch(() => {});
    return () => { alive = false; };
  }, [status, lcd]);

  useFrame((_, dt) => {
    const on = status !== "idle";
    const col = new THREE.Color(LED[status]);
    glow.current = damp(glow.current, on ? 2.6 : 0.2, 9, dt);
    if (led.current) { led.current.color.lerp(col, 0.2); led.current.emissive.lerp(col, 0.2); led.current.emissiveIntensity = glow.current; }
    if (haloMat.current) { haloMat.current.color.lerp(col, 0.2); haloMat.current.opacity = 0.16 * clamp((glow.current - 0.2) / 2.4, 0, 1) * 2.2; }
    if (light.current) { light.current.color.lerp(col, 0.2); light.current.intensity = 0.5 * clamp((glow.current - 0.2) / 2.4, 0, 1); }
    // soft contact shadow on the slot, sharper as the card nears
    if (spotMesh.current) {
      const c = cardY.current;
      const lift = clamp((c.y - SLOT_TOP) / 1.6, 0, 1);
      const m = spotMesh.current.material as THREE.MeshBasicMaterial;
      const near = 1 - smoothstep(1.4, 2.6, Math.abs(c.x));
      m.opacity = (0.46 + (0.07 - 0.46) * lift) * near * c.visible;
      // keep the contact shadow on the reader's top face: never wider than the reader, never past its ends
      const sc = Math.min(0.75 + lift * 0.6, (READER_W - 0.12) / 3.2);
      const room = (READER_W - 0.12 - 3.2 * sc) / 2;
      spotMesh.current.scale.set(sc, 0.16 + lift * 0.4, 1);
      spotMesh.current.position.x = clamp(c.x * 0.9, -room, room);
    }
  });

  const H = READER_H, D = READER_D, W = READER_W, gap = 0.035, shellD = D / 2 - gap;
  const fz = D / 2; // front face z
  const paperMat = (map: THREE.Texture) => (
    <meshStandardMaterial map={map} bumpMap={scratch} bumpScale={0.08} roughness={0.82} envMapIntensity={0.9} />
  );
  return (
    <group position={[0, OM.readerY, 0]} rotation-x={READER_TILT}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W / 2, H / 2, shellD / 2]} position={[0, 0, gap + shellD / 2]} />
        <CuboidCollider args={[W / 2, H / 2, shellD / 2]} position={[0, 0, -gap - shellD / 2]} />
        <CuboidCollider args={[W / 2, (H - 0.5) / 2, gap]} position={[0, -0.25, 0]} />
      </RigidBody>
      {/* back + front shells: the gap between them is the slot */}
      <RoundedBox args={[W, H, shellD]} radius={0.05} smoothness={3} position={[0, 0, -gap - shellD / 2]} castShadow receiveShadow>{paperMat(paper2)}</RoundedBox>
      <RoundedBox args={[W, H, shellD]} radius={0.05} smoothness={3} position={[0, 0, gap + shellD / 2]} castShadow receiveShadow>{paperMat(paper)}</RoundedBox>
      {/* slot throat (dark) */}
      <mesh position={[0, H / 2 - 0.24, 0]}><boxGeometry args={[W - 0.1, 0.48, gap * 2]} /><meshStandardMaterial color="#2a2720" roughness={1} /></mesh>
      {/* top lip band across the front */}
      <RoundedBox args={[W - 0.06, 0.2, 0.05]} radius={0.02} smoothness={2} position={[0, H / 2 - 0.13, fz + 0.012]} castShadow receiveShadow>{paperMat(paper)}</RoundedBox>
      <mesh position={[0, H / 2 - 0.245, fz + 0.002]}><boxGeometry args={[W - 0.08, 0.012, 0.01]} /><meshStandardMaterial color="#b9ad90" roughness={1} /></mesh>
      {/* panel seams beside the LCD */}
      {[-0.86, 0.86].map((x) => (
        <mesh key={x} position={[x, -0.15, fz + 0.002]}><boxGeometry args={[0.01, 0.5, 0.01]} /><meshStandardMaterial color="#c4b899" roughness={1} /></mesh>
      ))}
      {/* vents on the top surface, left + right */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.16, H / 2 + 0.002, gap + shellD * 0.55]}>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh key={i} position={[(i - 5.5) * 0.055, 0, 0]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[0.022, 0.13]} />
              <meshStandardMaterial color="#5b5341" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
      {/* LCD bezel + screen */}
      <RoundedBox args={[1.5, 0.46, 0.04]} radius={0.03} smoothness={2} position={[0, -0.17, fz + 0.005]}>
        <meshStandardMaterial color="#232322" roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, -0.17, fz + 0.027]}>
        <planeGeometry args={[1.32, 0.33]} />
        <meshBasicMaterial map={lcd.t} toneMapped={false} color={new THREE.Color(1.5, 1.5, 1.5)} />
      </mesh>
      {/* status LED */}
      <group position={[1.38, -0.17, fz]}>
        <mesh><torusGeometry args={[0.062, 0.016, 12, 32]} /><meshStandardMaterial color="#3a3833" roughness={0.5} /></mesh>
        <mesh position-z={0.005}><sphereGeometry args={[0.048, 24, 16]} />
          <meshPhysicalMaterial ref={led} color={LED.idle} emissive={LED.idle} emissiveIntensity={0.2} clearcoat={1} roughness={0.25} toneMapped={false} />
        </mesh>
        <mesh position-z={0.06}><planeGeometry args={[0.7, 0.7]} />
          <meshBasicMaterial ref={haloMat} map={halo} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <pointLight ref={light} position-z={0.2} distance={1.4} intensity={0} />
      </group>
      {/* slot contact shadow */}
      <mesh ref={spotMesh} position={[0, H / 2 + 0.004, 0]} rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={[3.2, 1]} />
        <meshBasicMaterial map={spot} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight position={[4, 6, 6]} intensity={1.55} />
      <rectAreaLight position={[0, 4.2, 3]} width={7} height={4} intensity={1.7} color="#fffdf7" onUpdate={(l) => l.lookAt(0, -0.4, 0)} />
      <Environment resolution={128}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer intensity={1.4} position={[0, 3, 6]} scale={[8, 3, 1]} />
          <Lightformer intensity={1} position={[-6, 0, 4]} rotation-y={Math.PI / 6} scale={[6, 3, 1]} />
          <Lightformer intensity={1} position={[6, 2, 4]} rotation-y={-Math.PI / 6} scale={[6, 3, 1]} />
        </group>
      </Environment>
    </>
  );
}

function World(p: SceneProps & { textures: { front: THREE.Texture; back: THREE.Texture } }) {
  const statusRef = useRef(p.status);
  statusRef.current = p.status;
  const cardY = useRef({ x: 0, y: OM.hoverY, visible: 0 });
  const readyFired = useRef(0);
  useFrame(() => {
    if (readyFired.current < 6) { readyFired.current++; if (readyFired.current === 6) p.onReady(); }
  });
  return (
    <>
      <color attach="background" args={[p.bg]} />
      <CameraRig />
      <StudioLights />
      <Physics gravity={[0, -18, 0]} timeStep="vary">
        <Reader status={p.status} cardY={cardY} />
        <PassCard textures={p.textures} statusRef={statusRef} setStatus={p.setStatus} onSwiped={p.onSwiped} cardY={cardY} />
      </Physics>
    </>
  );
}

export default function Scene(p: SceneProps) {
  const texRef = useRef<{ front: THREE.Texture; back: THREE.Texture } | null>(null);
  const [, force] = useReducerTick();
  useEffect(() => {
    let alive = true;
    passFonts().then((f) => {
      if (!alive) return;
      const mk = (c: HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
      };
      texRef.current = {
        front: mk(drawPassFront(document.createElement("canvas"), f)),
        back: mk(drawPassBack(document.createElement("canvas"), f)),
      };
      force();
    });
    return () => { alive = false; };
  }, [force]);
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 13], fov: 25, near: 0.1, far: 100 }}
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      aria-hidden
    >
      {texRef.current && <World {...p} textures={texRef.current} />}
    </Canvas>
  );
}

function useReducerTick() {
  return useReducer((x: number) => x + 1, 0);
}
