export class Input {
  constructor() {
    this.keys = new Set();
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.throttleUp = false;
    this.throttleDown = false;
    this.brake = false;
    this._toggles = new Set();

    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      this._edge(e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
  }

  _edge(code) {
    if (code === "KeyG") this._toggles.add("gear");
    if (code === "KeyF") this._toggles.add("flaps");
    if (code === "KeyC" || code === "KeyV") this._toggles.add("camera");
    if (code === "KeyR") this._toggles.add("reset");
    if (code === "KeyH" || code === "Slash") this._toggles.add("help");
    if (code === "KeyP") this._toggles.add("pause");
    if (code === "Digit1") this._toggles.add("cam0");
    if (code === "Digit2") this._toggles.add("cam1");
    if (code === "Digit3") this._toggles.add("cam2");
    if (code === "Digit4") this._toggles.add("cam3");
  }

  consume(name) {
    const hit = this._toggles.has(name);
    this._toggles.delete(name);
    return hit;
  }

  update() {
    const k = this.keys;
    const up = k.has("KeyW") || k.has("ArrowUp");
    const dn = k.has("KeyS") || k.has("ArrowDown");
    const lf = k.has("KeyA") || k.has("ArrowLeft");
    const rt = k.has("KeyD") || k.has("ArrowRight");
    this.pitch = (up ? 1 : 0) - (dn ? 1 : 0);
    this.roll = (lf ? 1 : 0) - (rt ? 1 : 0);
    this.yaw = (k.has("KeyQ") ? 1 : 0) - (k.has("KeyE") ? 1 : 0);
    this.throttleUp = k.has("ShiftLeft") || k.has("ShiftRight") || k.has("Equal") || k.has("NumpadAdd");
    this.throttleDown = k.has("ControlLeft") || k.has("ControlRight") || k.has("Minus") || k.has("NumpadSubtract");
    this.brake = k.has("KeyB") || k.has("Space");
  }
}
