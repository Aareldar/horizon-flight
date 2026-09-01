import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { CONFIG } from "./config.js";
import { fbm, lerp, saturate, smoothstep } from "./math.js";

export function terrainHeight(x, z) {
  const island = Math.pow(Math.max(0, 1 - Math.hypot(x / 2700, z / 3100)), 1.12);
  let h = (fbm(x * 0.00042, z * 0.00042, 5) - 0.32) * 310 * island;
  h += fbm(x * 0.0018, z * 0.0018, 4) * 26 * island;

  const d2 = Math.hypot((x - 2180) / 920, (z - 1760) / 740);
  const island2 = Math.pow(Math.max(0, 1 - d2), 1.18);
  h += island2 * (48 + fbm(x * 0.0011, z * 0.0011, 4) * 110);

  const d3 = Math.hypot((x + 1600) / 700, (z - 2400) / 620);
  const island3 = Math.pow(Math.max(0, 1 - d3), 1.2);
  h += island3 * (30 + fbm(x * 0.0014 + 9, z * 0.0014, 3) * 70);

  h = Math.max(h, -18);

  const dx = Math.max(0, Math.abs(x) - CONFIG.runwayHalfWidth);
  const dz =
    z < CONFIG.runwayZ0 ? CONFIG.runwayZ0 - z : z > CONFIG.runwayZ1 ? z - CONFIG.runwayZ1 : 0;
  const rd = Math.hypot(dx, dz);
  const rw = 1 - smoothstep(0, 90, rd);
  h = lerp(h, CONFIG.runwayY, rw * rw);
  return h;
}

function slopeAt(x, z) {
  const d = 3;
  const dx = terrainHeight(x + d, z) - terrainHeight(x - d, z);
  const dz = terrainHeight(x, z + d) - terrainHeight(x, z - d);
  return Math.hypot(dx, dz) / (2 * d);
}

function colorFor(x, z, y, sl) {
  const sand = new THREE.Color(0xc2b07a);
  const grass = new THREE.Color(0x3f6d3a);
  const grass2 = new THREE.Color(0x2f5630);
  const rock = new THREE.Color(0x6b655c);
  const snow = new THREE.Color(0xe8eef5);
  const wet = new THREE.Color(0x1c3a36);
  const c = new THREE.Color();
  if (y < 0.6) return wet;
  if (y < 7.5) {
    c.copy(sand).lerp(wet, saturate((7.5 - y) / 8));
    return c;
  }
  if (sl > 0.55) return rock;
  const g = grass.clone().lerp(grass2, fbm(x * 0.02, z * 0.02, 2));
  if (y > 145) return g.lerp(snow, saturate((y - 145) / 40));
  if (y > 95) return g.lerp(rock, saturate((y - 95) / 50) * 0.6);
  return g;
}

function makeCloudTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(size, size);
  const cx = size / 2;
  const cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x * 0.018, y * 0.018, 5);
      const dx = (x - cx) / (size * 0.42);
      const dy = (y - cy) / (size * 0.3);
      const gate = Math.max(0, 1 - Math.hypot(dx, dy));
      const a = Math.pow(gate, 1.35) * Math.pow(n, 0.85);
      const i = (y * size + x) * 4;
      const shade = 230 + n * 25;
      img.data[i] = shade;
      img.data[i + 1] = shade;
      img.data[i + 2] = shade + 4;
      img.data[i + 3] = Math.floor(saturate(a) * 210);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function createWorld(scene, renderer) {
  const sun = new THREE.Vector3();
  const elevation = 16;
  const azimuth = 22;

  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value = 4.8;
  su.rayleigh.value = 1.35;
  su.mieCoefficient.value = 0.005;
  su.mieDirectionalG.value = 0.78;
  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);
  sun.setFromSphericalCoords(1, phi, theta);
  su.sunPosition.value.copy(sun);
  sky.material.toneMapped = false;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  sky.scale.setScalar(10);
  envScene.add(sky);
  const envMap = pmrem.fromScene(envScene, 0.0, 0.1, 20).texture;
  sky.scale.setScalar(450000);
  scene.add(sky);
  scene.environment = envMap;
  scene.environmentIntensity = 0.55;

  const hemi = new THREE.HemisphereLight(0x9ecfff, 0x3a2a18, 0.42);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffe6c2, 1.85);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.near = 10;
  dir.shadow.camera.far = 900;
  dir.shadow.camera.left = -220;
  dir.shadow.camera.right = 220;
  dir.shadow.camera.top = 220;
  dir.shadow.camera.bottom = -220;
  dir.shadow.bias = -0.00025;
  dir.shadow.normalBias = 0.04;
  scene.add(dir);
  scene.add(dir.target);

  scene.fog = new THREE.FogExp2(0x8eb7d2, 0.00016);

  const terrainSize = 8200;
  const seg = 192;
  const tgeo = new THREE.PlaneGeometry(terrainSize, terrainSize, seg, seg);
  tgeo.rotateX(-Math.PI / 2);
  const pos = tgeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainHeight(x, z);
    pos.setY(i, y);
    const sl = slopeAt(x, z);
    color.copy(colorFor(x, z, y, sl));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  tgeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  tgeo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    tgeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: false,
    }),
  );
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);

  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      sunDir: { value: sun.clone().normalize() },
    },
    toneMapped: false,
    transparent: true,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float time;
      varying vec3 vWorld;
      varying vec3 vN;
      void main() {
        vec3 p = position;
        float w1 = sin(p.x * 0.018 + time * 0.9) * 0.45;
        float w2 = sin(p.z * 0.014 + time * 0.7) * 0.38;
        float w3 = sin((p.x + p.z) * 0.027 + time * 1.15) * 0.18;
        p.y += w1 + w2 + w3;
        vec3 n = normalize(vec3(
          -cos(p.x * 0.018 + time * 0.9) * 0.018,
          1.0,
          -cos(p.z * 0.014 + time * 0.7) * 0.014
        ));
        vN = n;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 sunDir;
      varying vec3 vWorld;
      varying vec3 vN;
      void main() {
        vec3 n = normalize(vN);
        vec3 view = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(view, n), 0.0), 3.0);
        vec3 deep = vec3(0.015, 0.09, 0.14);
        vec3 shoal = vec3(0.04, 0.32, 0.38);
        vec3 col = mix(deep, shoal, fres);
        vec3 h = normalize(view + sunDir);
        float spec = pow(max(dot(n, h), 0.0), 90.0);
        col += vec3(1.0, 0.95, 0.82) * spec * 1.5;
        col += vec3(0.35, 0.55, 0.7) * fres * 0.25;
        gl_FragColor = vec4(col, 0.94);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000, 80, 80), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  water.renderOrder = 1;
  scene.add(water);

  const airport = new THREE.Group();
  scene.add(airport);
  const asphalt = new THREE.MeshStandardMaterial({
    color: 0x2a2c30,
    roughness: 0.86,
    metalness: 0.08,
  });
  const paint = new THREE.MeshStandardMaterial({
    color: 0xf4f0e4,
    roughness: 0.45,
    metalness: 0.05,
    emissive: 0x222018,
  });
  const yellow = new THREE.MeshStandardMaterial({
    color: 0xd6b33a,
    roughness: 0.5,
    metalness: 0.1,
  });

  const rwLen = CONFIG.runwayZ1 - CONFIG.runwayZ0;
  const rw = addMesh(
    airport,
    new THREE.BoxGeometry(46, 0.18, rwLen),
    asphalt,
    0,
    CONFIG.runwayY + 0.1,
    (CONFIG.runwayZ0 + CONFIG.runwayZ1) / 2,
  );
  rw.receiveShadow = true;

  const taxi = addMesh(
    airport,
    new THREE.BoxGeometry(18, 0.14, 420),
    asphalt,
    48,
    CONFIG.runwayY + 0.08,
    80,
  );
  addMesh(airport, new THREE.BoxGeometry(160, 0.14, 70), asphalt, 110, CONFIG.runwayY + 0.08, -40);

  for (let z = CONFIG.runwayZ0 + 40; z < CONFIG.runwayZ1 - 40; z += 36) {
    addMesh(airport, new THREE.BoxGeometry(1.1, 0.05, 18), paint, 0, CONFIG.runwayY + 0.22, z);
  }
  for (let i = -8; i <= 8; i++) {
    addMesh(
      airport,
      new THREE.BoxGeometry(1.6, 0.05, 18),
      paint,
      i * 2.4,
      CONFIG.runwayY + 0.22,
      CONFIG.runwayZ1 - 70,
    );
    addMesh(
      airport,
      new THREE.BoxGeometry(1.6, 0.05, 18),
      paint,
      i * 2.4,
      CONFIG.runwayY + 0.22,
      CONFIG.runwayZ0 + 70,
    );
  }
  addMesh(airport, new THREE.BoxGeometry(0.5, 0.04, rwLen - 80), yellow, 22, CONFIG.runwayY + 0.21, (CONFIG.runwayZ0 + CONFIG.runwayZ1) / 2);
  addMesh(airport, new THREE.BoxGeometry(0.5, 0.04, rwLen - 80), yellow, -22, CONFIG.runwayY + 0.21, (CONFIG.runwayZ0 + CONFIG.runwayZ1) / 2);

  const concrete = new THREE.MeshStandardMaterial({
    color: 0x8a8680,
    roughness: 0.78,
    metalness: 0.05,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x4a5560,
    metalness: 0.7,
    roughness: 0.32,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1c2228,
    roughness: 0.6,
    metalness: 0.2,
  });

  for (let i = 0; i < 3; i++) {
    const hangar = addMesh(
      airport,
      new THREE.BoxGeometry(48, 16, 36),
      concrete,
      118,
      CONFIG.runwayY + 8,
      -120 + i * 52,
    );
    addMesh(airport, new THREE.BoxGeometry(44, 10, 0.4), dark, 118, CONFIG.runwayY + 6, -120 + i * 52 - 18.1);
    hangar.castShadow = true;
  }

  const tower = new THREE.Group();
  tower.position.set(-86, CONFIG.runwayY, 210);
  airport.add(tower);
  addMesh(tower, new THREE.BoxGeometry(10, 22, 10), concrete, 0, 11, 0);
  addMesh(tower, new THREE.BoxGeometry(14, 5, 14), metal, 0, 24, 0);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x8fd4ff,
    metalness: 0.15,
    roughness: 0.08,
    transmission: 0.55,
    transparent: true,
    opacity: 0.7,
    thickness: 0.4,
  });
  addMesh(tower, new THREE.BoxGeometry(12, 4.2, 12), glass, 0, 24, 0);
  const beacon = new THREE.PointLight(0xff3030, 0, 80, 2);
  beacon.position.set(0, 28, 0);
  tower.add(beacon);

  for (let s = -1; s <= 1; s += 2) {
    for (let z = CONFIG.runwayZ0; z <= CONFIG.runwayZ1; z += 80) {
      const pole = addMesh(airport, new THREE.CylinderGeometry(0.12, 0.12, 1.1, 6), metal, s * 25, CONFIG.runwayY + 0.7, z);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xfff2c4,
          emissive: 0xffe7a0,
          emissiveIntensity: 1.4,
        }),
      );
      lamp.position.set(s * 25, CONFIG.runwayY + 1.25, z);
      airport.add(lamp);
      pole.castShadow = false;
    }
  }

  const cloudTex = makeCloudTexture();
  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0.88,
    fog: true,
  });
  const clouds = new THREE.Group();
  scene.add(clouds);
  for (let i = 0; i < 46; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(380 + Math.random() * 420, 160 + Math.random() * 140), cloudMat);
    p.position.set(
      (Math.random() - 0.5) * 7000,
      220 + Math.random() * 280,
      (Math.random() - 0.5) * 7000,
    );
    p.rotation.y = Math.random() * Math.PI;
    p.rotation.x = -0.08;
    clouds.add(p);
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f4a24, roughness: 0.7 });
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 3.2, 5);
  const leafGeo = new THREE.ConeGeometry(2.1, 6.4, 7);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, 900);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, 900);
  trunks.castShadow = leaves.castShadow = true;
  trunks.receiveShadow = leaves.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < 900 && guard < 14000) {
    guard++;
    const x = (Math.random() - 0.5) * 5200;
    const z = (Math.random() - 0.5) * 5600;
    if (Math.abs(x) < 90 && z > CONFIG.runwayZ0 - 80 && z < CONFIG.runwayZ1 + 80) continue;
    const y = terrainHeight(x, z);
    if (y < 8 || y > 95) continue;
    if (slopeAt(x, z) > 0.38) continue;
    const s = 0.7 + Math.random() * 1.4;
    dummy.position.set(x, y + 1.6 * s, z);
    dummy.rotation.set(0, Math.random() * 6.28, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = y + 5.2 * s;
    dummy.updateMatrix();
    leaves.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  trunks.count = leaves.count = placed;
  scene.add(trunks);
  scene.add(leaves);

  const rings = [];
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x66f0ff,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const ringDone = new THREE.MeshBasicMaterial({
    color: 0x7dffb3,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x9cffff,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  CONFIG.rings.forEach((r, i) => {
    const g = new THREE.Group();
    g.position.set(r.x, r.y, r.z);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(16, 0.55, 10, 48), ringMat.clone());
    torus.rotation.y = Math.PI / 2;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(15.2, 32), glowMat.clone());
    disc.rotation.y = Math.PI / 2;
    g.add(torus, disc);
    scene.add(g);
    rings.push({
      group: g,
      torus,
      disc,
      taken: false,
      index: i,
      liveMat: torus.material,
      doneMat: ringDone,
    });
  });

  return {
    sun,
    dir,
    waterMat,
    clouds,
    beacon,
    rings,
    update(dt, t, aircraftPos, camera) {
      waterMat.uniforms.time.value = t;
      clouds.children.forEach((c, i) => {
        c.position.x += Math.sin(t * 0.02 + i) * 1.6 * dt;
        if (camera) c.quaternion.copy(camera.quaternion);
      });
      beacon.intensity = 2.2 + Math.sin(t * 6) * 2.2;
      beacon.color.set(Math.sin(t * 6) > 0 ? 0xff3030 : 0xfff2c0);
      dir.position.copy(aircraftPos).addScaledVector(sun, 380);
      dir.target.position.copy(aircraftPos);
      dir.target.updateMatrixWorld();
      rings.forEach((r) => {
        r.group.rotation.x += dt * 0.35;
        if (!r.taken) r.torus.material.opacity = 0.7 + Math.sin(t * 3 + r.index) * 0.2;
      });
    },
  };
}
