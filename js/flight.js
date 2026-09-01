import * as THREE from "three";
import { CONFIG } from "./config.js";
import { clamp, saturate, lerp, wrap360, deg } from "./math.js";

const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _velN = new THREE.Vector3();
const _velL = new THREE.Vector3();
const _force = new THREE.Vector3();
const _liftDir = new THREE.Vector3();
const _qInv = new THREE.Quaternion();
const _dq = new THREE.Quaternion();
const _omega = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _qFlat = new THREE.Quaternion();

export class FlightModel {
  constructor(group, getHeight) {
    this.group = group;
    this.getHeight = getHeight;
    this.velocity = new THREE.Vector3();
    this.angVel = new THREE.Vector3();
    this.reset();
  }

  reset() {
    const s = CONFIG.start;
    const gy = this.getHeight(s.x, s.z);
    this.group.position.set(s.x, gy + CONFIG.gearHeight, s.z);
    this.group.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
    this.velocity.set(0, 0, 0);
    this.angVel.set(0, 0, 0);
    this.throttle = 0;
    this.gearDown = true;
    this.gearAnim = 0;
    this.flaps = 1;
    this.onGround = true;
    this.crashed = false;
    this.stall = false;
    this.aoa = 0;
    this.gForce = 1;
    this.heading = 0;
    this.pitch = 0;
    this.roll = 0;
    this.airspeed = 0;
    this.altitudeAGL = CONFIG.gearHeight;
    this.altitudeMSL = this.group.position.y;
    this.vsi = 0;
    this.pitchInput = 0;
    this.rollInput = 0;
    this.yawInput = 0;
    this.brake = false;
    this.ringIndex = 0;
    this.flightTime = 0;
    this.score = 0;
    this.landedOk = false;
    this.status = "HOLDING SHORT — spool up with SHIFT";
  }

  update(dt, input) {
    if (this.crashed) return;

    this.pitchInput = lerp(this.pitchInput, input.pitch, 1 - Math.exp(-12 * dt));
    this.rollInput = lerp(this.rollInput, input.roll, 1 - Math.exp(-12 * dt));
    this.yawInput = lerp(this.yawInput, input.yaw, 1 - Math.exp(-10 * dt));
    this.brake = input.brake;

    if (input.throttleUp) this.throttle = Math.min(1, this.throttle + 0.28 * dt);
    if (input.throttleDown) this.throttle = Math.max(0, this.throttle - 0.32 * dt);
    if (input.consume("gear") && !this.onGround) this.gearDown = !this.gearDown;
    if (input.consume("flaps")) this.flaps = this.flaps > 0.5 ? 0 : 1;

    const q = this.group.quaternion;
    _fwd.set(0, 0, 1).applyQuaternion(q);
    _up.set(0, 1, 0).applyQuaternion(q);
    _right.set(1, 0, 0).applyQuaternion(q);

    const speed = this.velocity.length();
    this.airspeed = speed;
    _qInv.copy(q).invert();
    _velL.copy(this.velocity).applyQuaternion(_qInv);
    this.aoa = Math.atan2(-_velL.y, Math.max(4, _velL.z));
    const beta = Math.atan2(_velL.x, Math.max(4, _velL.z));

    const alt = this.group.position.y;
    const rho = CONFIG.rho0 * Math.exp(-Math.max(0, alt) / 8500);
    const qbar = 0.5 * rho * speed * speed;
    const auth = saturate(qbar / 2800);

    this.stall = Math.abs(this.aoa) > CONFIG.stallAoa && speed > 28 && !this.onGround;
    let cl = 0.32 + 4.8 * this.aoa + 0.62 * this.flaps;
    if (this.stall) cl *= 0.42;
    cl = clamp(cl, -1.15, 1.62);
    const cd =
      0.026 +
      0.05 * this.flaps +
      (this.gearDown ? 0.02 : 0) +
      0.11 * cl * cl +
      0.55 * beta * beta +
      (this.brake && !this.onGround ? 0.04 : 0);

    const lift = qbar * CONFIG.wingArea * cl;
    const drag = qbar * CONFIG.wingArea * cd;
    const thrust =
      this.throttle <= 0.85
        ? (this.throttle / 0.85) * CONFIG.milThrust
        : CONFIG.milThrust + ((this.throttle - 0.85) / 0.15) * (CONFIG.maxThrust - CONFIG.milThrust);

    _force.set(0, -CONFIG.mass * CONFIG.g, 0);
    _force.addScaledVector(_fwd, thrust);

    if (speed > 6) {
      _velN.copy(this.velocity).normalize();
      _liftDir.crossVectors(_velN, _right);
      if (_liftDir.lengthSq() < 1e-6) _liftDir.copy(_up);
      else _liftDir.normalize();
      if (_liftDir.dot(_up) < 0) _liftDir.negate();
      _force.addScaledVector(_liftDir, lift);
      _force.addScaledVector(_velN, -drag);
    }

    const accY = _force.y / CONFIG.mass;
    this.gForce = lerp(this.gForce, accY / CONFIG.g + 1, 1 - Math.exp(-8 * dt));

    this.velocity.addScaledVector(_force, dt / CONFIG.mass);

    const rateAuth = lerp(0.22, 1, auth);
    const damp = 3.4;
    this.angVel.x += (-this.pitchInput * 1.55 * rateAuth - this.angVel.x * damp - this.aoa * 2.6 * auth) * dt;
    this.angVel.z += (this.rollInput * 2.35 * rateAuth - this.angVel.z * (damp + 0.4)) * dt;
    this.angVel.y +=
      (this.yawInput * 1.05 * rateAuth - beta * 1.8 * auth - this.angVel.y * 2.9 + (CONFIG.assist ? this.rollInput * 0.42 * auth : 0)) *
      dt;

    if (this.stall) {
      this.angVel.x += (Math.sin(alt * 12 + speed) * 0.8 + 0.35) * dt;
      this.angVel.z += Math.sin(speed * 3.1) * 1.1 * dt;
    }

    _omega.set(this.angVel.x, this.angVel.y, this.angVel.z, 0);
    _dq.copy(q).multiply(_omega);
    q.x += 0.5 * dt * _dq.x;
    q.y += 0.5 * dt * _dq.y;
    q.z += 0.5 * dt * _dq.z;
    q.w += 0.5 * dt * _dq.w;
    q.normalize();

    this.group.position.addScaledVector(this.velocity, dt);

    _euler.setFromQuaternion(q, "YXZ");
    this.pitch = _euler.x;
    this.heading = wrap360(-deg(_euler.y));
    this.roll = _euler.z;

    const ground = this.getHeight(this.group.position.x, this.group.position.z);
    const gearH = this.gearDown ? CONFIG.gearHeight : CONFIG.bellyHeight;
    const agl = this.group.position.y - ground - gearH;
    this.altitudeMSL = this.group.position.y;
    this.altitudeAGL = this.group.position.y - ground;
    this.vsi = this.velocity.y * 196.85;

    const overWater = ground < 0.8;
    this.onGround = agl <= 0.08 && !overWater;

    if (agl < 0 && overWater) {
      this._crash("WATER IMPACT");
      return;
    }

    if (agl < 0) {
      this.group.position.y = ground + gearH;
      const impact = -this.velocity.y;
      const bank = Math.abs(this.roll);
      const inverted = Math.abs(this.roll) > 1.2 || _up.y < 0.15;
      if (inverted || impact > 24 || (!this.gearDown && impact > 8) || (this.gearDown && impact > 16 && bank > 0.5)) {
        this._crash(inverted ? "ATTITUDE IMPACT" : "HARD LANDING");
        return;
      }
      if (this.velocity.y < 0) this.velocity.y = 0;
      _fwd.set(0, 0, 1).applyQuaternion(this.group.quaternion);
      const along = this.velocity.dot(_fwd);
      this.velocity.copy(_fwd).multiplyScalar(along);
      this.velocity.y = 0;
      const damp = this.brake ? 2.6 : 0.42;
      this.velocity.multiplyScalar(Math.max(0, 1 - damp * dt));
      if (speed < 1.4 && this.throttle < 0.06) this.velocity.set(0, 0, 0);

      const steer = (this.yawInput + this.rollInput * 0.45) * Math.min(1, speed / 18) * dt * 0.9;
      this.group.rotateY(steer);

      const canRotate = speed > CONFIG.rotateSpeed && this.pitchInput > 0.15;
      _euler.setFromQuaternion(this.group.quaternion, "YXZ");
      _euler.z = lerp(_euler.z, 0, 1 - Math.exp(-8 * dt));
      if (!canRotate) _euler.x = lerp(_euler.x, -0.03, 1 - Math.exp(-6 * dt));
      else _euler.x = clamp(_euler.x - this.pitchInput * dt * 0.4, -0.28, 0.05);
      _qFlat.setFromEuler(_euler);
      this.group.quaternion.copy(_qFlat);
      this.angVel.x *= 0.4;
      this.angVel.z *= 0.2;
      this.gForce = 1;

      if (!this.gearDown && speed > 8) {
        this._crash("GEAR-UP LANDING");
        return;
      }

      const onRunway =
        Math.abs(this.group.position.x) < 28 &&
        this.group.position.z > CONFIG.runwayZ0 &&
        this.group.position.z < CONFIG.runwayZ1;
      if (this.ringIndex >= CONFIG.rings.length && onRunway && speed < 18 && this.throttle < 0.2) {
        this.landedOk = true;
        this.status = "MISSION COMPLETE — textbook landing";
      }
    }

    if (!this.onGround) this.flightTime += dt;

    if (this.onGround && speed < 2) this.status = "ON DECK";
    else if (this.onGround) this.status = this.brake ? "ROLLING / BRAKES" : "TAKEOFF ROLL";
    else if (this.stall) this.status = "STALL — relax the nose";
    else if (this.altitudeAGL < 40 && this.velocity.y < -4) this.status = "LOW / SINKING";
    else if (this.throttle > 0.86) this.status = "AFTERBURNER";
    else this.status = "AIRBORNE";
  }

  _crash(reason) {
    this.crashed = true;
    this.status = reason;
    this.velocity.multiplyScalar(0.2);
  }

  kts() {
    return this.airspeed * 1.94384;
  }

  headingWrapped() {
    return wrap360(this.heading);
  }
}

export function ringHit(model, rings) {
  if (model.crashed || model.ringIndex >= rings.length) return false;
  const r = rings[model.ringIndex];
  if (r.taken) return false;
  const d = model.group.position.distanceTo(r.group.position);
  if (d < 18) {
    r.taken = true;
    r.torus.material = r.doneMat;
    r.disc.material.opacity = 0.04;
    model.ringIndex++;
    model.score += 100 + Math.max(0, 40 - Math.abs(model.altitudeAGL - r.group.position.y - 16) * 0.2);
    return true;
  }
  return false;
}
