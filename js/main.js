import * as THREE from "three";
import { CONFIG } from "./config.js";
import { Input } from "./input.js";
import { createAircraft, updateAircraftVisuals } from "./aircraft.js";
import { FlightModel, ringHit } from "./flight.js";
import { createWorld, terrainHeight } from "./world.js";
import { FlightCamera } from "./camera.js";
import { Hud } from "./hud.js";
import { EngineAudio } from "./audio.js";

const canvas = document.getElementById("c");
const overlay = document.getElementById("overlay");
const loadMsg = document.getElementById("load-msg");
const startBtn = document.getElementById("start-btn");
const helpEl = document.getElementById("help");
const crashEl = document.getElementById("crash");
const hudRoot = document.getElementById("hud");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.2, 42000);

loadMsg.textContent = "BUILDING TERRAIN…";

let world;
try {
  world = createWorld(scene, renderer);
} catch (err) {
  console.error(err);
  loadMsg.textContent = "ERROR: " + err.message;
  throw err;
}
const aircraft = createAircraft();
scene.add(aircraft.group);
const model = new FlightModel(aircraft.group, terrainHeight);
const cam = new FlightCamera(camera, aircraft.group);
cam.pos.set(14, CONFIG.runwayY + 12, -36);
camera.position.copy(cam.pos);
camera.lookAt(aircraft.group.position);
const input = new Input();
const hud = new Hud();
const audio = new EngineAudio();

let running = false;
let paused = false;
const clock = new THREE.Clock();
let t = 0;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener("resize", resize);

function resetMission() {
  cam.snap = true;
  model.reset();
  world.rings.forEach((r) => {
    r.taken = false;
    r.torus.material = r.liveMat;
    r.disc.material.opacity = 0.12;
  });
  crashEl.classList.remove("on");
  paused = false;
}

loadMsg.textContent = "READY";
startBtn.disabled = false;
startBtn.textContent = "START ENGINES";

function begin() {
  if (running) return;
  audio.start();
  overlay.classList.add("gone");
  hudRoot.classList.remove("hidden");
  helpEl.classList.add("on");
  running = true;
  cam.snap = true;
  clock.getDelta();
  setTimeout(() => helpEl.classList.remove("on"), 9000);
}

startBtn.addEventListener("click", begin);
if (new URLSearchParams(location.search).has("autostart")) {
  overlay.style.transition = "none";
  overlay.style.display = "none";
  begin();
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;

  if (running) {
    input.update();
    if (input.consume("help")) helpEl.classList.toggle("on");
    if (input.consume("pause")) paused = !paused;
    if (input.consume("camera")) cam.cycle();
    if (input.consume("cam0")) cam.setMode(0);
    if (input.consume("cam1")) cam.setMode(1);
    if (input.consume("cam2")) cam.setMode(2);
    if (input.consume("cam3")) cam.setMode(3);
    if (input.consume("reset")) resetMission();

    if (!paused) {
      if (model.crashed) {
        crashEl.classList.add("on");
      } else {
        crashEl.classList.remove("on");
        model.update(dt, input);
        if (ringHit(model, world.rings)) {
          model.status =
            model.ringIndex >= CONFIG.rings.length
              ? "RINGS COMPLETE — LAND RUNWAY 36"
              : `GATE ${model.ringIndex} CLEARED`;
        }
      }
      updateAircraftVisuals(aircraft, model, dt, t);
      aircraft.canopy.visible = cam.mode !== 1;
      world.update(dt, t, aircraft.group.position, camera);
      cam.update(dt, model.velocity);
      audio.update(model);
    }
    hud.update(model, cam.label());
  } else {
    cam.update(dt, model.velocity);
  }

  renderer.render(scene, camera);
}

tick();
