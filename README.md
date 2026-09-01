# Horizon

A cinematic in-browser 3D flight simulator. Fly the **VX-9 Horizon** off a coastal airbase, through a ring course over an island archipelago, and back onto runway 36.

No install, no build step. Open it in a local static server or GitHub Pages.

## Play

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080). ES modules will not load from `file://`.

Hold **Shift** to spool the engines, keep the jet on the centerline, and rotate around 95–110 knots. Retract gear (`G`) and flaps (`F`) once you are climbing.

## Controls

| Input | Action |
|---|---|
| `W` / `S` or arrows | Pitch |
| `A` / `D` | Roll |
| `Q` / `E` | Rudder / nosewheel |
| `Shift` / `Ctrl` | Throttle |
| `B` or `Space` | Brakes / speed brake |
| `G` | Landing gear |
| `F` | Flaps |
| `C` or `1–4` | Camera (chase, cockpit, wing, flyby) |
| `R` | Reset |
| `H` | Help overlay |

## Mission

1. Take off on runway 36 (heading north, +Z).
2. Fly the eight luminous gates in order.
3. Return and land on the same strip. A smooth, gear-down landing with the rings complete finishes the mission.

Free flight is always available — ignore the rings and explore the islands.

## Stack

- [Three.js](https://github.com/mrdoob/three.js) r170 (CDN, pinned) plus a local Preetham sky addon
- Preetham analytical sky
- Custom water, terrain, and the VX-9 airframe (procedural meshes)
- Simplified lift / drag / stall flight model with stability assist

## Source

Repository: [github.com/Aareldar/horizon-flight](https://github.com/Aareldar/horizon-flight)

## License

MIT
