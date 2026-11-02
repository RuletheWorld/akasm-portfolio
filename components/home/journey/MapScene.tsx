"use client";
/**
 * The CV route as a minimal 3D nav map (Waze / Apple Maps / Mapbox feel), built the way
 * the gate scanner is: R3F, procedural geometry only, soft light, nothing stiff.
 * Scroll sets `drive.target` (an arc length on the route); the truck chases it on a spring,
 * the camera follows on dampers, and the active stop is reported back to the DOM overlay.
 */
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { B, EXT, LAKE_Z, ROUTE_W, STOP_POINTS, generateCity, sampleAt, type CityMap, type Rect } from "@/lib/journeyMap";
import { clamp, damp, smoothstep, spring, type Spring } from "@/lib/motion";

export type Drive = {
  /** scroll progress through the section, 0–1 (written by the DOM) */
  p: number;
  /** arc length the scroll wants (derived from p with a hold at every stop) */
  target: number;
  /** arc length the truck is at (written by the scene) */
  s: number;
  /** truck world position (written by the scene; buildings x-ray around it) */
  x: number;
  z: number;
  soft: boolean;
};
export type StopLabel = { id: string; label: string };

type Pal = {
  bg: string; ground: string; grid: string; water: string; road: string; runway: string; mark: string;
  park: string; tree: string; bldA: string; bldB: string; route: string; visited: string; truck: string;
  cab: string; glass: string; hemiSky: string; hemiGround: string; sun: number; hemi: number;
};
const LIGHT: Pal = {
  bg: "#faf5f5", ground: "#ebe7e4", grid: "#e2ddd9", water: "#c8dbee", road: "#ffffff", runway: "#dedad6", mark: "#ffffff",
  park: "#d9e7cf", tree: "#a8cc95", bldA: "#fbfaf9", bldB: "#efecea", route: "#3a53ed", visited: "#b8bfe9", truck: "#3a53ed",
  cab: "#f6f4f2", glass: "#2a3140", hemiSky: "#ffffff", hemiGround: "#d9d2cc", sun: 1.15, hemi: 1.05,
};
const DARK: Pal = {
  bg: "#191817", ground: "#1d1e21", grid: "#24262a", water: "#101b28", road: "#3a3d44", runway: "#2b2d31", mark: "#5a5d64",
  park: "#1f2a22", tree: "#2e4c35", bldA: "#2b2d32", bldB: "#24262b", route: "#2c6fff", visited: "#2f3d63", truck: "#2c6fff",
  cab: "#d9dde4", glass: "#0d1119", hemiSky: "#8d97ad", hemiGround: "#1a1918", sun: 0.85, hemi: 0.9,
};
const usePalette = () => {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => setDark(document.documentElement.dataset.theme === "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
};

const CX = ((EXT.x0 + EXT.x1) / 2) * B, CZ = ((EXT.z0 + EXT.z1) / 2) * B;

/* ───────────── ground: land, lake with a soft shoreline, a faint survey grid ───────────── */
function Ground({ pal }: { pal: Pal }) {
  const mat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: pal.ground });
    const u = { uWater: { value: new THREE.Color(pal.water) }, uGrid: { value: new THREE.Color(pal.grid) }, uLake: { value: LAKE_Z * B } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vW;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvW = (modelMatrix * vec4(position, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vW; uniform vec3 uWater, uGrid; uniform float uLake;")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          vec2 g = abs(fract(vW.xz / 3.0 + 0.5) - 0.5) / fwidth(vW.xz / 3.0);
          float line = 1.0 - min(min(g.x, g.y), 1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, uGrid, line * 0.55);
          float shore = uLake + sin(vW.x * 0.045) * 2.2 + sin(vW.x * 0.11 + 1.3) * 0.9;
          float w = smoothstep(shore - 0.35, shore + 0.35, vW.z);
          diffuseColor.rgb = mix(diffuseColor.rgb, uWater, w);`,
        );
      (m.userData as { u: typeof u }).u = u;
    };
    return m;
  }, [pal]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[CX, 0, CZ + 60]} receiveShadow material={mat}>
      <planeGeometry args={[900, 900]} />
    </mesh>
  );
}

const slab = (r: Rect[], h: number, y: number) =>
  r.length ? mergeGeometries(r.map((q) => new THREE.BoxGeometry(q.w, h, q.d).translate(q.x, y + h / 2, q.z))) : new THREE.BufferGeometry();

/* ───────────── streets, airport, parks ───────────── */
function Streets({ city, pal }: { city: CityMap; pal: Pal }) {
  const g = useMemo(() => ({
    roads: slab(city.roads, 0.06, 0),
    runways: slab(city.runways, 0.06, 0.005),
    marks: slab(city.marks, 0.02, 0.07),
    parks: slab(city.parks, 0.05, 0),
  }), [city]);
  return (
    <group>
      <mesh geometry={g.roads} receiveShadow><meshLambertMaterial color={pal.road} /></mesh>
      <mesh geometry={g.runways} receiveShadow><meshLambertMaterial color={pal.runway} /></mesh>
      <mesh geometry={g.marks}><meshBasicMaterial color={pal.mark} toneMapped={false} /></mesh>
      <mesh geometry={g.parks} receiveShadow><meshLambertMaterial color={pal.park} /></mesh>
    </group>
  );
}

/* ───────────── soft low-poly blocks, with a world-height ambient-occlusion ramp ─────────────
 * Line of sight: blocks standing between the camera and the truck sink smoothly into the
 * ground (Apple Maps style) instead of being stippled; the shadow pass sinks them too. */
const SINK = /* glsl */ `
  uniform vec3 uCam, uCar; varying float vHide;
  float sinkAmount(mat4 im) {
    vec2 c = (modelMatrix * im * vec4(0.0, 0.0, 0.0, 1.0)).xz;
    float r = 0.5 * max(length(im[0].xyz), length(im[2].xyz));
    vec2 a = uCam.xz, ab = uCar.xz - a;
    float tr = dot(c - a, ab) / max(dot(ab, ab), 1e-4);
    float d = length(c - (a + ab * clamp(tr, 0.0, 1.0))) - r * 0.8;
    return (1.0 - smoothstep(2.5, 7.0, d)) * smoothstep(0.2, 0.5, tr) * (1.0 - smoothstep(0.97, 1.08, tr));
  }`;
const patchSink = (sh: { vertexShader: string }) => {
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\n" + SINK)
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vHide = sinkAmount(instanceMatrix);
      float hgt = max(length(instanceMatrix[1].xyz), 1e-3);
      transformed.y *= mix(1.0, min(1.0, 0.28 / hgt), vHide);`,
    );
};
function Buildings({ city, pal, drive }: { city: CityMap; pal: Pal; drive: Drive }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const xr = useMemo(() => ({ uCam: { value: new THREE.Vector3() }, uCar: { value: new THREE.Vector3() }, uBg: { value: new THREE.Color() } }), []);
  const geo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.035).translate(0, 0.5, 0), []);
  const mat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: "#ffffff" });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, xr);
      patchSink(sh);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying float vHide; uniform vec3 uBg;")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          diffuseColor.rgb *= mix(0.74, 1.0, smoothstep(0.0, 3.2, vWP.y));
          diffuseColor.rgb = mix(diffuseColor.rgb, uBg, vHide * 0.35);`,
        );
    };
    return m;
  }, [xr]);
  const depth = useMemo(() => {
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, xr); patchSink(sh); };
    return m;
  }, [xr]);
  useEffect(() => { xr.uBg.value.set(pal.bg); }, [xr, pal]);
  useFrame(({ camera }) => {
    xr.uCam.value.copy(camera.position);
    xr.uCar.value.set(drive.x, 1.2, drive.z);
  });
  useLayoutEffect(() => {
    const im = ref.current!;
    const o = new THREE.Object3D(), a = new THREE.Color(pal.bldA), b = new THREE.Color(pal.bldB), c = new THREE.Color();
    city.buildings.forEach((q, i) => {
      o.position.set(q.x, 0, q.z);
      o.scale.set(q.w, q.h, q.d);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, c.copy(a).lerp(b, q.tone));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
  }, [city, pal]);
  return <instancedMesh ref={ref} args={[geo, mat, city.buildings.length]} customDepthMaterial={depth} castShadow receiveShadow />;
}

function Trees({ city, pal }: { city: CityMap; pal: Pal }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const im = ref.current!, o = new THREE.Object3D();
    city.trees.forEach((t, i) => {
      o.position.set(t.x, t.r * 1.05, t.z);
      o.scale.setScalar(t.r);
      o.rotation.set(t.x, t.z, 0);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }, [city]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, city.trees.length]} castShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshLambertMaterial color={pal.tree} flatShading />
    </instancedMesh>
  );
}

/* ───────────── the route ribbon: blue ahead, muted behind, chevrons flowing forward ───────────── */
function Route({ city, pal, drive }: { city: CityMap; pal: Pal; drive: Drive }) {
  const { geo, mat } = useMemo(() => {
    const p = city.path, hw = ROUTE_W * 0.7;
    const pos = new Float32Array(p.n * 2 * 3), aS = new Float32Array(p.n * 2), side = new Float32Array(p.n * 2), idx: number[] = [];
    for (let i = 0; i < p.n; i++) {
      const x = p.pts[i * 2], z = p.pts[i * 2 + 1], nx = -p.tan[i * 2 + 1], nz = p.tan[i * 2];
      for (let k = 0; k < 2; k++) {
        const sd = k ? 1 : -1, j = i * 2 + k;
        pos.set([x + nx * hw * sd, 0.11, z + nz * hw * sd], j * 3);
        aS[j] = p.s[i]; side[j] = sd;
      }
      if (i < p.n - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
    geo.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uS: { value: 0 }, uT: { value: 0 },
        uAhead: { value: new THREE.Color() }, uBehind: { value: new THREE.Color() },
      },
      vertexShader: `
        attribute float aS; attribute float aSide; varying float vS; varying float vSide;
        #include <fog_pars_vertex>
        void main(){ vS = aS; vSide = aSide; vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uS, uT; uniform vec3 uAhead, uBehind; varying float vS; varying float vSide;
        #include <fog_pars_fragment>
        void main(){
          float a = abs(vSide);
          float alpha = 1.0 - smoothstep(0.82, 1.0, a);
          float behind = smoothstep(uS + 0.4, uS - 0.4, vS);
          vec3 c = mix(uAhead, uBehind, behind);
          c = mix(c, c * 0.78, smoothstep(0.62, 0.86, a));
          float ch = fract((vS - uT * 3.2) / 3.4 + a * 0.18);
          float chev = (1.0 - behind) * smoothstep(0.0, 0.06, ch) * (1.0 - smoothstep(0.22, 0.3, ch)) * (1.0 - smoothstep(0.4, 0.62, a));
          c = mix(c, vec3(1.0), chev * 0.32);
          gl_FragColor = vec4(c, alpha);
          #include <fog_fragment>
        }`,
    });
    return { geo, mat };
  }, [city]);
  useEffect(() => {
    (mat.uniforms.uAhead.value as THREE.Color).set(pal.route);
    (mat.uniforms.uBehind.value as THREE.Color).set(pal.visited);
  }, [mat, pal]);
  useFrame((_, dt) => {
    mat.uniforms.uS.value = drive.s;
    if (!drive.soft) mat.uniforms.uT.value += dt;
  });
  return <mesh geometry={geo} material={mat} renderOrder={2} />;
}

/* ───────────── airport: terminal and the plane that just landed ───────────── */
function Plane({ pal, drive }: { pal: Pal; drive: Drive }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(drive.soft ? 1 : 0);
  const geo = useMemo(() => {
    const body = new THREE.CapsuleGeometry(0.75, 7, 4, 10).rotateX(Math.PI / 2);
    const wing = new RoundedBoxGeometry(9.5, 0.18, 1.6, 1, 0.08).translate(0, -0.1, 0.2);
    const tail = new RoundedBoxGeometry(3.4, 0.14, 0.9, 1, 0.06).translate(0, 0.1, -3.7);
    const fin = new RoundedBoxGeometry(0.14, 1.7, 1.1, 1, 0.06).translate(0, 0.9, -3.75);
    return mergeGeometries([body, wing, tail, fin].map((g) => (g.index ? g.toNonIndexed() : g)));
  }, []);
  // runway 2 (z = -0.2 blocks): in over the truck's shoulder from the west, rolling out east
  const x0 = -12.5 * B, x1 = -3.4 * B, rz = -0.2 * B;
  useFrame((_, dt) => {
    const g = ref.current!;
    if (drive.p > 0.03) t.current = 1; // the visitor is already driving; the plane is parked
    t.current = Math.min(1, t.current + dt / 4.2);
    const k = t.current, roll = 1 - Math.pow(1 - k, 2.4);
    const x = x0 + (x1 - x0) * roll;
    const y = 15 * Math.pow(1 - smoothstep(0, 0.42, k), 1.6);
    g.position.set(x, 0.85 + y, rz);
    g.rotation.set(0, Math.PI / 2, 0);
    g.rotateX(-0.12 * (1 - smoothstep(0.3, 0.45, k)) + 0.03 * smoothstep(0.4, 0.5, k) * (1 - smoothstep(0.5, 0.65, k)));
  });
  return (
    <group ref={ref}>
      <mesh geometry={geo} castShadow><meshLambertMaterial color={pal === DARK ? "#c9ccd3" : "#ffffff"} /></mesh>
    </group>
  );
}

function Terminal({ city, pal }: { city: CityMap; pal: Pal }) {
  const t = city.terminal;
  const geo = useMemo(() => new RoundedBoxGeometry(t.w, 3.2, t.d, 2, 0.4), [t]);
  return (
    <mesh geometry={geo} position={[t.x, 1.6, t.z]} castShadow receiveShadow>
      <meshLambertMaterial color={pal === DARK ? "#33363c" : "#f4f2f0"} />
    </mesh>
  );
}

/* ───────────── the truck puck: glow, heading beam, soft springs on body roll and pitch ───────────── */
const radialTex = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    tex = new THREE.CanvasTexture(c);
    return tex;
  };
})();
const beamTex = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas");
    c.width = 128; c.height = 256;
    const x = c.getContext("2d")!, g = x.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.beginPath(); x.moveTo(64, 256); x.lineTo(0, 0); x.lineTo(128, 0); x.closePath(); x.fill();
    tex = new THREE.CanvasTexture(c);
    return tex;
  };
})();

function Truck({ city, pal, drive, onStop }: { city: CityMap; pal: Pal; drive: Drive; onStop: (i: number) => void }) {
  const root = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null), glow = useRef<THREE.Mesh>(null);
  const wheels = useRef<THREE.Mesh[]>([]);
  const camera = useThree((s) => s.camera);
  const st = useRef({
    s: { x: 0, v: 0 } as Spring, yaw: Math.PI / 2, roll: { x: 0, v: 0 } as Spring, pitch: { x: 0, v: 0 } as Spring,
    lastV: 0, fwd: new THREE.Vector2(1, 0), tmp: new THREE.Vector2(), look: new THREE.Vector3(-70, 0, -4), active: -1, intro: drive.soft ? 1 : 0, spin: 0, time: 0,
  });
  const sample = useMemo(() => ({ x: 0, z: 0, tx: 0, tz: 1 }), []);
  const g = useMemo(() => ({
    bed: new RoundedBoxGeometry(1.9, 0.62, 3.7, 3, 0.26).translate(0, 0.62, -0.15),
    cab: new RoundedBoxGeometry(1.72, 0.7, 1.55, 3, 0.3).translate(0, 1.22, 0.55),
    glass: new RoundedBoxGeometry(1.76, 0.36, 1.2, 2, 0.16).translate(0, 1.3, 0.62),
    wheel: new THREE.CylinderGeometry(0.36, 0.36, 0.3, 14).rotateZ(Math.PI / 2),
    lamp: new RoundedBoxGeometry(0.42, 0.14, 0.08, 1, 0.04),
  }), []);
  const wpos: [number, number, number][] = [[-0.92, 0.36, 1.1], [0.92, 0.36, 1.1], [-0.92, 0.36, -1.25], [0.92, 0.36, -1.25]];

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20), s = st.current, soft = drive.soft;
    s.time += dt;
    // drive: a near-critically damped spring on arc length (softer, quicker settle when reduced motion)
    const L = city.path.length, S = city.stopS, N = S.length;
    {
      const r = Math.min(N - 1, drive.p * (N - 1 + 0.35));
      const i = Math.min(N - 2, Math.floor(r)), t = r - i;
      drive.target = r >= N - 1 ? S[N - 1] : S[i] + (S[i + 1] - S[i]) * smoothstep(0.28, 1, t);
    }
    spring(s.s, clamp(drive.target, 0, L), soft ? 70 : 24, soft ? 16.7 : 9.4, dt);
    s.s.x = clamp(s.s.x, 0, L);
    drive.s = s.s.x;
    sampleAt(city.path, s.s.x, sample);
    drive.x = sample.x; drive.z = sample.z;
    // heading: damp toward tangent through the shortest arc
    const want = Math.atan2(sample.tx, sample.tz);
    let dy = want - s.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const yawRate = dy * 9;
    s.yaw += dy * (1 - Math.exp(-9 * dt));
    const v = s.s.v, acc = (v - s.lastV) / Math.max(dt, 1e-3);
    s.lastV = v;
    spring(s.roll, soft ? 0 : clamp(-yawRate * v * 0.0016, -0.09, 0.09), 90, 9, dt);
    spring(s.pitch, soft ? 0 : clamp(-acc * 0.0011, -0.05, 0.05), 110, 10, dt);
    const r = root.current!, b = body.current!;
    r.position.set(sample.x, 0, sample.z);
    r.rotation.y = s.yaw;
    b.rotation.set(s.pitch.x, 0, s.roll.x);
    s.spin += (v * dt) / 0.36;
    for (const w of wheels.current) if (w) w.rotation.x = s.spin;
    const gm = glow.current!;
    const pulse = soft ? 1 : 1 + Math.sin(s.time * 2.2) * 0.06;
    gm.scale.setScalar(pulse);

    // nearest stop → overlay card + how close we are (for the dwell camera)
    let ni = 0, nd = Infinity;
    city.stopS.forEach((ss, i) => { const d = Math.abs(ss - s.s.x); if (d < nd) { nd = d; ni = i; } });
    if (ni !== s.active) { s.active = ni; onStop(ni); }
    const dwell = 1 - smoothstep(3, 16, nd);

    // camera: nav tilt while moving, lifts and settles closer over a stop
    s.fwd.lerp(s.tmp.set(sample.tx, sample.tz), 1 - Math.exp(-(soft ? 4 : 2.2) * dt)).normalize();
    const mobile = state.size.width < 760;
    const back = THREE.MathUtils.lerp(mobile ? 36 : 34, mobile ? 27 : 25, dwell);
    const up = THREE.MathUtils.lerp(mobile ? 34 : 28, mobile ? 44 : 38, dwell);
    const ahead = THREE.MathUtils.lerp(9, 2, dwell) + (mobile ? -3 : 0);
    const fx = s.fwd.x, fz = s.fwd.y;
    let px = sample.x - fx * back, py = up, pz = sample.z - fz * back;
    let lx = sample.x + fx * ahead, lz = sample.z + fz * ahead;
    // intro: an overview of the runway while the plane lands, then ease down behind the truck
    s.intro = drive.p > 0.03 ? Math.min(1, s.intro + dt * 0.9) : Math.min(1, s.intro + dt / 4.6);
    const k = smoothstep(0.45, 1, s.intro);
    if (k < 1) {
      px = THREE.MathUtils.lerp(-40, px, k); py = THREE.MathUtils.lerp(62, py, k); pz = THREE.MathUtils.lerp(78, pz, k);
      lx = THREE.MathUtils.lerp(-66, lx, k); lz = THREE.MathUtils.lerp(2, lz, k);
    }
    const lam = soft ? 6 : 3.1;
    camera.position.set(damp(camera.position.x, px, lam, dt), damp(camera.position.y, py, lam, dt), damp(camera.position.z, pz, lam, dt));
    s.look.set(damp(s.look.x, lx, lam * 1.5, dt), 0, damp(s.look.z, lz, lam * 1.5, dt));
    camera.lookAt(s.look);

    // keep the sun's shadow box around the truck
    const sun = state.scene.getObjectByName("sun") as THREE.DirectionalLight | undefined;
    if (sun) {
      sun.position.set(s.look.x - 40, 90, s.look.z + 34);
      sun.target.position.copy(s.look);
      sun.target.updateMatrixWorld();
    }
  });

  return (
    <group ref={root}>
      <mesh ref={glow} rotation-x={-Math.PI / 2} position-y={0.13} renderOrder={3}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial map={radialTex()} color={pal.truck} transparent opacity={0.26} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.14, 7.2]} renderOrder={3}>
        <planeGeometry args={[7, 11]} />
        <meshBasicMaterial map={beamTex()} color={pal.truck} transparent opacity={0.2} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={body} scale={1.25}>
        <mesh geometry={g.bed} castShadow><meshStandardMaterial color={pal.truck} roughness={0.42} metalness={0.05} /></mesh>
        <mesh geometry={g.cab} castShadow><meshStandardMaterial color={pal.cab} roughness={0.5} /></mesh>
        <mesh geometry={g.glass}><meshStandardMaterial color={pal.glass} roughness={0.18} metalness={0.2} /></mesh>
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} geometry={g.lamp} position={[x, 0.66, 1.73]}><meshBasicMaterial color="#fff8e6" toneMapped={false} /></mesh>
        ))}
        {wpos.map((p, i) => (
          <mesh key={i} ref={(m) => { if (m) wheels.current[i] = m; }} geometry={g.wheel} position={p} castShadow>
            <meshStandardMaterial color="#1c1d21" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ───────────── stop pins: future, active, visited ───────────── */
function Pins({ labels, active, drive, city }: { labels: StopLabel[]; active: number; drive: Drive; city: CityMap }) {
  return (
    <>
      {STOP_POINTS.map(([x, z], i) => {
        const state = i === active ? "is-active" : city.stopS[i] < drive.s + 1 ? "is-visited" : "is-future";
        return (
          <Html key={labels[i]?.id ?? i} position={[x * B, 2.2, z * B]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <div className={`jm-pin ${state}`}><span className="jm-pin-dot" />{labels[i]?.label}</div>
          </Html>
        );
      })}
    </>
  );
}

function Lights({ pal, lite }: { pal: Pal; lite: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    const l = sun.current!, c = l.shadow.camera;
    c.left = -80; c.right = 80; c.top = 80; c.bottom = -80; c.near = 1; c.far = 220;
    l.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
    l.shadow.radius = 5;
    l.shadow.bias = -0.0006;
    l.shadow.normalBias = 0.04;
    c.updateProjectionMatrix();
  }, [lite]);
  return (
    <>
      <hemisphereLight args={[pal.hemiSky, pal.hemiGround, pal.hemi]} />
      <ambientLight intensity={0.18} />
      <directionalLight ref={sun} name="sun" intensity={pal.sun} castShadow />
    </>
  );
}

function Frame({ mobile }: { mobile: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // push the truck off-centre so the card never sits on top of it
    if (mobile) cam.setViewOffset(size.width, size.height, 0, size.height * 0.2, size.width, size.height);
    else cam.setViewOffset(size.width, size.height, size.width * 0.16, size.height * 0.04, size.width, size.height);
    cam.updateProjectionMatrix();
  }, [camera, size, mobile]);
  return null;
}

function Atmosphere({ pal }: { pal: Pal }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.background = new THREE.Color(pal.bg);
    scene.fog = new THREE.Fog(pal.bg, 110, 300);
  }, [scene, pal]);
  return null;
}

export default function MapScene({ drive, labels, onStop, active, visible }: {
  drive: Drive; labels: StopLabel[]; onStop: (i: number) => void; active: number; visible: boolean;
}) {
  const pal = usePalette();
  const [mobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 760);
  const city = useMemo(() => generateCity(1102, mobile), [mobile]);
  return (
    <Canvas
      className="jm-canvas"
      frameloop={visible ? "always" : "never"}
      dpr={mobile ? [1, 1.25] : [1, 1.5]}
      shadows="percentage"
      flat
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 38, near: 1, far: 600, position: [-34, 70, 80] }}
      aria-hidden
    >
      <Atmosphere pal={pal} />
      <Frame mobile={mobile} />
      <Lights pal={pal} lite={mobile} />
      <Ground pal={pal} />
      <Streets city={city} pal={pal} />
      <Buildings city={city} pal={pal} drive={drive} />
      <Trees city={city} pal={pal} />
      <Terminal city={city} pal={pal} />
      <Plane pal={pal} drive={drive} />
      <Route city={city} pal={pal} drive={drive} />
      <Truck city={city} pal={pal} drive={drive} onStop={onStop} />
      <Pins labels={labels} active={active} drive={drive} city={city} />
    </Canvas>
  );
}
