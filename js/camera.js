import * as THREE from "three";

const MODES = ["CHASE", "COCKPIT", "WING", "FLYBY"];
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _look = new THREE.Vector3();
const _qCam = new THREE.Quaternion();
const _flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

export class FlightCamera {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    this.mode = 0;
    this.pos = new THREE.Vector3(0, 18, -30);
    this.flybyT = 0;
    this.snap = true;
    camera.position.copy(this.pos);
  }

  cycle() {
    this.mode = (this.mode + 1) % MODES.length;
    if (this.mode === 3) this.flybyT = 0;
  }

  setMode(i) {
    this.mode = i;
    if (i === 3) this.flybyT = 0;
  }

  label() {
    return MODES[this.mode];
  }

  update(dt, velocity) {
    const q = this.target.quaternion;
    const p = this.target.position;
    _fwd.set(0, 0, 1).applyQuaternion(q);
    _up.set(0, 1, 0).applyQuaternion(q);
    _right.set(1, 0, 0).applyQuaternion(q);
    const speed = velocity.length();

    if (this.mode === 0) {
      _desired
        .copy(p)
        .addScaledVector(_fwd, -30 - saturate(speed / 90) * 12)
        .addScaledVector(_up, 8.8);
      _desired.y += 3.5;
      if (this.snap) this.pos.copy(_desired);
      else this.pos.lerp(_desired, 1 - Math.exp(-5.5 * dt));
      this.snap = false;
      this.camera.position.copy(this.pos);
      _look.copy(p).addScaledVector(_fwd, 20).addScaledVector(_up, 1.4);
      this.camera.lookAt(_look);
    } else if (this.mode === 1) {
      _desired.copy(p).addScaledVector(_up, 0.88).addScaledVector(_fwd, 2.42);
      this.camera.position.copy(_desired);
      _qCam.copy(q).multiply(_flip);
      this.camera.quaternion.copy(_qCam);
    } else if (this.mode === 2) {
      _desired.copy(p).addScaledVector(_right, 7.4).addScaledVector(_up, 0.6).addScaledVector(_fwd, -1.5);
      this.pos.lerp(_desired, 1 - Math.exp(-8 * dt));
      this.camera.position.copy(this.pos);
      _look.copy(p).addScaledVector(_fwd, 8);
      this.camera.lookAt(_look);
    } else {
      this.flybyT += dt;
      const side = Math.sin(this.flybyT * 0.22) >= 0 ? 1 : -1;
      _desired
        .copy(p)
        .addScaledVector(_right, side * 28)
        .addScaledVector(_fwd, -8 + Math.sin(this.flybyT) * 6)
        .addScaledVector(_up, 4);
      this.pos.lerp(_desired, 1 - Math.exp(-3.2 * dt));
      this.camera.position.copy(this.pos);
      this.camera.lookAt(p);
    }
  }
}

function saturate(v) {
  return Math.max(0, Math.min(1, v));
}
