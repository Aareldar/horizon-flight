import { CONFIG } from "./config.js";
import { wrap360 } from "./math.js";

export class Hud {
  constructor() {
    this.horizon = document.getElementById("horizon");
    this.hctx = this.horizon.getContext("2d");
    this.horizon.width = 336;
    this.horizon.height = 336;
    this.hdg = document.getElementById("hdg-canvas");
    this.dctx = this.hdg.getContext("2d");
    this.hdg.width = 640;
    this.hdg.height = 72;

    this.el = {
      spd: document.getElementById("spd-val"),
      alt: document.getElementById("alt-val"),
      vsi: document.getElementById("vsi-val"),
      thr: document.getElementById("thr-val"),
      fill: document.getElementById("throttle-fill"),
      gear: document.getElementById("gear-val"),
      flaps: document.getElementById("flaps-val"),
      g: document.getElementById("g-val"),
      aoa: document.getElementById("aoa-val"),
      status: document.getElementById("status-val"),
      mission: document.getElementById("mission-val"),
      cam: document.getElementById("cam-val"),
      stall: document.getElementById("stall"),
      gearCell: document.getElementById("gear-cell"),
      flapCell: document.getElementById("flap-cell"),
      gCell: document.getElementById("g-cell"),
    };
  }

  update(model, camLabel) {
    this.el.spd.textContent = Math.round(model.kts()).toString().padStart(3, "0");
    this.el.alt.textContent = Math.max(0, Math.round(model.altitudeAGL * 3.28084)).toString();
    const vsi = Math.round(model.vsi / 10) * 10;
    this.el.vsi.textContent = (vsi >= 0 ? "+" : "") + vsi;
    this.el.thr.textContent = `${Math.round(model.throttle * 100)}%`;
    this.el.fill.style.height = `${model.throttle * 100}%`;
    this.el.gear.textContent = model.gearDown ? "DOWN" : "UP";
    this.el.flaps.textContent = model.flaps > 0.5 ? "FULL" : "CLEAN";
    this.el.g.textContent = model.gForce.toFixed(1);
    this.el.aoa.textContent = `${(model.aoa * 57.3).toFixed(1)}°`;
    this.el.status.textContent = model.status;
    this.el.cam.textContent = camLabel;
    const n = CONFIG.rings.length;
    if (model.landedOk) this.el.mission.textContent = "LANDING COMPLETE";
    else if (model.ringIndex >= n) this.el.mission.textContent = "RETURN TO RUNWAY 36";
    else this.el.mission.textContent = `RING ${model.ringIndex + 1} / ${n}`;

    this.el.stall.classList.toggle("on", model.stall);
    this.el.gearCell.className = "cell" + (model.gearDown ? " good" : model.altitudeAGL < 80 ? " warn" : "");
    this.el.flapCell.className = "cell" + (model.flaps > 0.5 ? " hot" : "");
    this.el.gCell.className = "cell" + (Math.abs(model.gForce) > 4 ? " warn" : "");

    this._horizon(model);
    this._heading(model.headingWrapped());
  }

  _horizon(model) {
    const ctx = this.hctx;
    const w = this.horizon.width;
    const h = this.horizon.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-model.roll);
    const pitchPx = model.pitch * 220;
    ctx.translate(0, pitchPx);
    ctx.fillStyle = "#2d6db8";
    ctx.fillRect(-w, -h * 3, w * 2, h * 3);
    ctx.fillStyle = "#8a5a2a";
    ctx.fillRect(-w, 0, w * 2, h * 3);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(w, 0);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.font = "20px Share Tech Mono, monospace";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.textAlign = "left";
    for (let d = -40; d <= 40; d += 10) {
      if (d === 0) continue;
      const y = -d * 3.9;
      const hw = Math.abs(d) % 20 === 0 ? 48 : 28;
      ctx.beginPath();
      ctx.moveTo(-hw, y);
      ctx.lineTo(hw, y);
      ctx.stroke();
      if (Math.abs(d) % 20 === 0) {
        ctx.fillText(`${d}`, hw + 8, y + 6);
        ctx.textAlign = "right";
        ctx.fillText(`${d}`, -hw - 8, y + 6);
        ctx.textAlign = "left";
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "#7ee7ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-58, 0);
    ctx.lineTo(-16, 0);
    ctx.moveTo(16, 0);
    ctx.lineTo(58, 0);
    ctx.moveTo(-16, 0);
    ctx.lineTo(-8, 12);
    ctx.lineTo(0, 0);
    ctx.lineTo(8, 12);
    ctx.lineTo(16, 0);
    ctx.stroke();
    ctx.fillStyle = "#7ee7ff";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _heading(hdg) {
    const ctx = this.dctx;
    const w = this.hdg.width;
    const h = this.hdg.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(6,16,24,0.2)";
    ctx.fillRect(0, 0, w, h);
    const pxPerDeg = 8;
    ctx.strokeStyle = "#7ee7ff";
    ctx.fillStyle = "#7ee7ff";
    ctx.font = "22px Share Tech Mono, monospace";
    ctx.textAlign = "center";
    for (let d = hdg - 50; d <= hdg + 50; d++) {
      const ang = wrap360(d);
      const x = w / 2 + (d - hdg) * pxPerDeg;
      if (x < -20 || x > w + 20) continue;
      const major = Math.round(ang) % 10 === 0;
      ctx.lineWidth = major ? 2 : 1;
      ctx.globalAlpha = major ? 1 : 0.45;
      ctx.beginPath();
      ctx.moveTo(x, major ? 18 : 28);
      ctx.lineTo(x, 52);
      ctx.stroke();
      if (Math.round(ang) % 30 === 0) {
        ctx.globalAlpha = 1;
        const label = ["N", "3", "6", "E", "12", "15", "S", "21", "24", "W", "30", "33"][Math.round(ang / 30) % 12];
        ctx.fillText(label, x, 22);
      }
    }
    ctx.globalAlpha = 1;
  }
}
