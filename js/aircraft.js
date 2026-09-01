import * as THREE from "three";

function mat(opts) {
  return new THREE.MeshPhysicalMaterial(opts);
}

function add(parent, geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function createAircraft() {
  const group = new THREE.Group();
  group.name = "VX-9 Horizon";

  const body = mat({
    color: 0x2c394c,
    metalness: 0.62,
    roughness: 0.38,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.15,
  });
  const bodyHi = mat({
    color: 0x2a3544,
    metalness: 0.8,
    roughness: 0.28,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
  });
  const gold = mat({
    color: 0xc9a24a,
    metalness: 1,
    roughness: 0.22,
    clearcoat: 0.3,
  });
  const dark = mat({
    color: 0x0b0e12,
    metalness: 0.7,
    roughness: 0.38,
  });
  const exhaust = mat({
    color: 0x2a221c,
    metalness: 0.9,
    roughness: 0.25,
    emissive: 0x331800,
    emissiveIntensity: 0.2,
  });
  const glass = mat({
    color: 0x8fd7ff,
    metalness: 0.12,
    roughness: 0.04,
    transmission: 0.72,
    thickness: 0.45,
    transparent: true,
    opacity: 0.42,
    envMapIntensity: 1.6,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.1 });
  const hub = new THREE.MeshStandardMaterial({ color: 0x889199, metalness: 0.8, roughness: 0.28 });

  const profile = [
    [0.0, 7.35],
    [0.1, 7.28],
    [0.26, 7.05],
    [0.46, 6.55],
    [0.66, 5.85],
    [0.82, 4.9],
    [0.94, 3.7],
    [1.02, 2.2],
    [1.08, 0.6],
    [1.1, -0.8],
    [1.06, -2.5],
    [0.98, -4.0],
    [0.82, -5.2],
    [0.58, -6.15],
    [0.32, -6.75],
    [0.14, -7.05],
    [0.0, -7.2],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const fuseGeo = new THREE.LatheGeometry(profile, 28);
  fuseGeo.rotateX(Math.PI / 2);
  add(group, fuseGeo, body);

  add(group, new THREE.SphereGeometry(0.55, 16, 12), gold, 0, 0.05, 7.05, 0, 0, 0, 0.7, 0.55, 1.1);

  const canopy = add(group, new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), glass, 0, 0.72, 2.55, 0.18, 0, 0, 0.72, 0.55, 1.55);
  add(group, new THREE.SphereGeometry(0.92, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), dark, 0, 0.42, 2.55, 0.2, 0, 0, 0.62, 0.28, 1.35);

  const seat = add(group, new THREE.BoxGeometry(0.55, 0.55, 0.55), dark, 0, 0.55, 2.35);
  seat.visible = true;

  function wingShape() {
    const s = new THREE.Shape();
    s.moveTo(0.4, 2.4);
    s.lineTo(5.25, -0.35);
    s.lineTo(5.05, -1.25);
    s.lineTo(0.55, -2.65);
    s.lineTo(0.4, 2.4);
    return s;
  }
  const wingGeo = new THREE.ExtrudeGeometry(wingShape(), {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.04,
    bevelSegments: 1,
  });
  wingGeo.rotateX(Math.PI / 2);
  const wingL = add(group, wingGeo, bodyHi, 0, -0.05, -0.2, 0.04, 0, 0.04);
  const wingR = add(group, wingGeo, bodyHi, 0, -0.05, -0.2, 0.04, 0, -0.04, -1, 1, 1);

  add(group, new THREE.BoxGeometry(4.6, 0.05, 0.16), gold, 2.6, 0.05, 0.55, 0, 0.42, 0.02);
  add(group, new THREE.BoxGeometry(4.6, 0.05, 0.16), gold, -2.6, 0.05, 0.55, 0, -0.42, -0.02);

  const aileronL = add(group, new THREE.BoxGeometry(1.6, 0.05, 0.42), body, 3.7, -0.02, -1.35);
  const aileronR = add(group, new THREE.BoxGeometry(1.6, 0.05, 0.42), body, -3.7, -0.02, -1.35);

  add(group, new THREE.BoxGeometry(1.3, 0.55, 2.6), dark, 0.95, -0.15, 1.5, 0.05, 0.12, 0);
  add(group, new THREE.BoxGeometry(1.3, 0.55, 2.6), dark, -0.95, -0.15, 1.5, 0.05, -0.12, 0);

  const engL = add(group, new THREE.CylinderGeometry(0.48, 0.52, 3.4, 16), body, 0.82, -0.28, -4.05, Math.PI / 2);
  const engR = add(group, new THREE.CylinderGeometry(0.48, 0.52, 3.4, 16), body, -0.82, -0.28, -4.05, Math.PI / 2);
  add(group, new THREE.CylinderGeometry(0.38, 0.46, 0.5, 16), exhaust, 0.82, -0.28, -5.85, Math.PI / 2);
  add(group, new THREE.CylinderGeometry(0.38, 0.46, 0.5, 16), exhaust, -0.82, -0.28, -5.85, Math.PI / 2);

  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x7fd7ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flameL = add(group, new THREE.ConeGeometry(0.32, 2.4, 10, 1, true), flameMat, 0.82, -0.28, -7.15, Math.PI / 2);
  const flameR = add(group, new THREE.ConeGeometry(0.32, 2.4, 10, 1, true), flameMat.clone(), -0.82, -0.28, -7.15, Math.PI / 2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfff4c2,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coreL = add(group, new THREE.ConeGeometry(0.16, 1.4, 8, 1, true), coreMat, 0.82, -0.28, -6.7, Math.PI / 2);
  const coreR = add(group, new THREE.ConeGeometry(0.16, 1.4, 8, 1, true), coreMat.clone(), -0.82, -0.28, -6.7, Math.PI / 2);

  function tailShape() {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.15, 2.15);
    s.lineTo(1.05, 2.0);
    s.lineTo(1.35, 0.05);
    s.lineTo(0, 0);
    return s;
  }
  const tailGeo = new THREE.ExtrudeGeometry(tailShape(), { depth: 0.08, bevelEnabled: false });
  const tailL = add(group, tailGeo, bodyHi, 0.55, 0.35, -5.15, 0, 0.55, 0.32);
  const tailR = add(group, tailGeo, bodyHi, -0.55, 0.35, -5.15, 0, -0.55, -0.32);
  add(group, new THREE.BoxGeometry(0.08, 1.7, 0.12), gold, 0.72, 1.3, -5.05, 0, 0.2, 0.32);
  add(group, new THREE.BoxGeometry(0.08, 1.7, 0.12), gold, -0.72, 1.3, -5.05, 0, -0.2, -0.32);

  const rudderL = add(tailL, new THREE.BoxGeometry(0.7, 0.08, 0.9), body, 0.85, 1.1, 0.05);
  const rudderR = add(tailR, new THREE.BoxGeometry(0.7, 0.08, 0.9), body, 0.85, 1.1, 0.05);

  const stabGeo = new THREE.BoxGeometry(3.4, 0.08, 1.15);
  add(group, stabGeo, bodyHi, 0, 0.22, -5.55, 0.12);
  const elevatorL = add(group, new THREE.BoxGeometry(1.4, 0.05, 0.38), body, 1.1, 0.24, -6.1);
  const elevatorR = add(group, new THREE.BoxGeometry(1.4, 0.05, 0.38), body, -1.1, 0.24, -6.1);

  add(group, new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8), dark, 2.2, 0.12, 4.8, Math.PI / 2, 0, 0.4);
  add(group, new THREE.BoxGeometry(0.9, 0.06, 0.18), gold, 0, 0.02, 3.9);

  const tipL = add(group, new THREE.CylinderGeometry(0.07, 0.07, 1.6, 8), dark, 5.15, -0.05, -0.85, Math.PI / 2);
  const tipR = add(group, new THREE.CylinderGeometry(0.07, 0.07, 1.6, 8), dark, -5.15, -0.05, -0.85, Math.PI / 2);
  add(tipL, new THREE.CylinderGeometry(0.09, 0.09, 0.55, 8), gold, 0, 0.85, 0);
  add(tipR, new THREE.CylinderGeometry(0.09, 0.09, 0.55, 8), gold, 0, 0.85, 0);

  const navL = new THREE.PointLight(0xff2a2a, 1.6, 18);
  navL.position.set(5.2, 0.05, -0.2);
  const navR = new THREE.PointLight(0x2aff6a, 1.6, 18);
  navR.position.set(-5.2, 0.05, -0.2);
  const strobe = new THREE.PointLight(0xffffff, 0, 30);
  strobe.position.set(0, 2.3, -5.1);
  group.add(navL, navR, strobe);

  function wheel() {
    const g = new THREE.Group();
    add(g, new THREE.CylinderGeometry(0.08, 0.08, 1.15, 8), hub, 0, -0.45, 0);
    const w = add(g, new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12), rubber, 0, -1.05, 0, 0, 0, Math.PI / 2);
    w.castShadow = true;
    return g;
  }
  const gear = new THREE.Group();
  group.add(gear);
  const noseGear = wheel();
  noseGear.position.set(0, -0.55, 3.9);
  const mainL = wheel();
  mainL.position.set(1.15, -0.55, -0.55);
  const mainR = wheel();
  mainR.position.set(-1.15, -0.55, -0.55);
  gear.add(noseGear, mainL, mainR);

  const flameLight = new THREE.PointLight(0x66ccff, 0, 24);
  flameLight.position.set(0, -0.2, -7.2);
  group.add(flameLight);

  return {
    group,
    canopy,
    gear,
    gearParts: { noseGear, mainL, mainR },
    surfaces: { aileronL, aileronR, elevatorL, elevatorR, rudderL, rudderR },
    flames: [flameL, flameR, coreL, coreR],
    flameLight,
    strobe,
    nav: [navL, navR],
  };
}

export function updateAircraftVisuals(ac, state, dt, t) {
  const { surfaces, gear, flames, flameLight, strobe } = ac;
  const p = state.pitchInput * 0.28;
  const r = state.rollInput * 0.32;
  const y = state.yawInput * 0.25;
  surfaces.elevatorL.rotation.x = p;
  surfaces.elevatorR.rotation.x = p;
  surfaces.aileronL.rotation.x = r;
  surfaces.aileronR.rotation.x = -r;
  surfaces.rudderL.rotation.z = y;
  surfaces.rudderR.rotation.z = y;

  const gearTarget = state.gearDown ? 0 : 1;
  state.gearAnim = THREE.MathUtils.damp(state.gearAnim ?? (state.gearDown ? 0 : 1), gearTarget, 4.2, dt);
  const ga = state.gearAnim;
  gear.visible = ga < 0.98;
  ac.gearParts.noseGear.rotation.x = ga * 1.45;
  ac.gearParts.mainL.rotation.z = -ga * 1.5;
  ac.gearParts.mainR.rotation.z = ga * 1.5;
  gear.scale.setScalar(1 - ga * 0.15);

  const ab = Math.max(0, (state.throttle - 0.82) / 0.18);
  const idle = state.throttle * 0.35;
  const flick = 0.85 + Math.sin(t * 38) * 0.15;
  flames[0].material.opacity = (idle * 0.25 + ab * 0.7) * flick;
  flames[1].material.opacity = (idle * 0.25 + ab * 0.7) * flick;
  flames[2].material.opacity = ab * 0.85 * flick;
  flames[3].material.opacity = ab * 0.85 * flick;
  flames[0].scale.set(1, 0.5 + state.throttle * 1.4, 1);
  flames[1].scale.set(1, 0.5 + state.throttle * 1.4, 1);
  flameLight.intensity = ab * 8 * flick;
  flameLight.color.set(ab > 0.1 ? 0x88e7ff : 0xff8844);

  strobe.intensity = Math.sin(t * 8) > 0.7 ? 4 : 0;
}
