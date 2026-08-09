// SPDX-License-Identifier: AGPL-3.0-only
// The 3D onion: nested spherical shells, one per tier, claims as small crisp
// tiles on their shell's surface. Pure presentation over the same data and
// dial state as the 2D view — this file has no write access of any kind.
//
// Interaction model (2.9b — supersedes the 2.9 select behavior):
// - Open space between tiles is transparent: inner shells show through the
//   gaps (the dyson-sphere reading), and a click in a gap passes through to
//   the first tile behind it. Clicking targets what the eye actually sees.
// - Single-click: tile select + evidence panel ONLY. No lineage draw, no
//   clearing, no reframing.
// - Double-click on a claim with a kernel lineage: the CHAIN VIEW — every
//   tile not in the chain clears fully, the sphere rotates globe-style about
//   its vertical axis until the chain lies legible across the visible face,
//   and narration rides over the cleared state. Without a lineage: no
//   clearing, narration only.
// - Empty click: the full sphere restores at the CURRENT dial depth (the
//   dial never resets — pinned in interaction.js). Escape keeps its go-home
//   meaning.
// Rest state (2.9b): small discrete tiles, open space expected, idle
// globe-style rotation. Tile size comes from placement.tileAngularRadius —
// ring diameter and crowding only, NEVER evidence weight.
// Whole-vs-broken: every chain line still comes from lineageRender.js specs,
// where style derives from kind. This file never styles a kernel link.

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geoVoronoi } from 'd3-geo-voronoi';
import { geoEquirectangular } from 'd3-geo';
import { api } from './api.js';
import { lineageSpecs, lineageMembers, tileMaterial } from './lineageRender.js';
import { siteFor, maxMagnitudeIn, tileAngularRadius } from './placement.js';
import { TIER_COLORS_DARK } from './tokens.js';

const TIERS = ['core', 'inner', 'middle', 'outer', 'outermost'];
const TIER_RADII = { core: 1.0, inner: 1.55, middle: 2.1, outer: 2.65, outermost: 3.2 };
// 2.9c: hue encodes TIER and nothing else — tokens.js is the single source.
// Kind (factual/moral/framing) is carried by chips in the panel, never by
// tile hue, so kind can never be misread as tier.
const SEAM = '#0d0d0d';
const KERNEL_LINE = 0xd07a4a;
const CONTESTED_LINE = 0xe0b23f;
const SUPPORT_LINE = 0xc3c2b7;
// Home sits inside the ±15° tilt clamp (see controls below).
const HOME_POS = new THREE.Vector3(2.5, 1.5, 7.8);
const IDLE_SPIN = 0.00004; // rad per ms — globe-style, unhurried
const MAX_TILT_DEG = 15; // vertical orbit clamp; horizontal stays endless

// ---- shared geometry helpers -------------------------------------------

function lonLatToVec3(lon, lat, r) {
  const phi = THREE.MathUtils.degToRad(lon + 180);
  const latR = THREE.MathUtils.degToRad(lat);
  return new THREE.Vector3(
    -r * Math.cos(latR) * Math.cos(phi),
    r * Math.sin(latR),
    r * Math.cos(latR) * Math.sin(phi)
  );
}

function vec3ToLonLat(p) {
  const r = p.length();
  const lat = THREE.MathUtils.radToDeg(Math.asin(p.y / r));
  let phi = Math.atan2(p.z, -p.x);
  if (phi < 0) phi += Math.PI * 2;
  return [THREE.MathUtils.radToDeg(phi) - 180, lat];
}

// Great-circle angular distance in degrees — used to decide whether a click
// landed ON a tile or in the open space between tiles.
function angularDistance([lon1, lat1], [lon2, lat2]) {
  const a = THREE.MathUtils.degToRad(lat1);
  const b = THREE.MathUtils.degToRad(lat2);
  const dl = THREE.MathUtils.degToRad(lon2 - lon1);
  const c = Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(dl);
  return THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.max(-1, c))));
}

function disposeGroup(group) {
  for (const child of [...group.children]) {
    child.geometry?.dispose();
    if (child.material) {
      child.material.map?.dispose();
      child.material.dispose();
    }
  }
  group.clear();
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex, sat, light) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.max(0, Math.min(1, hsl.s * sat)), Math.max(0, Math.min(1, hsl.l * light)));
  return `#${c.getHexString()}`;
}

function makeLabelSprite(text, { bg = 'rgba(13,13,13,0.72)', ink = '#c3c2b7', scale = 1 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = ink;
  ctx.font = '26px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const t = text.length > 38 ? text.slice(0, 37) + '…' : text;
  ctx.fillText(t, 12, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  );
  sprite.scale.set(1.9 * scale, 0.24 * scale, 1);
  return sprite;
}

function makeGlowSprite(color, opacity) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthTest: false,
      blending: THREE.AdditiveBlending
    })
  );
}

// Paint a shell: small, crisp, discrete tiles at each claim's site — open
// space between them is correct and expected. Tile size comes from
// placement.tileAngularRadius (ring diameter + crowding ONLY); the material
// channels (mass/finish, weathering) come from lineageRender.tileMaterial.
function shellTexture(cells, selectedId, tileDeg, tierColor) {
  const w = 1024;
  const h = 512;
  const pxPerDeg = w / 360;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  // The background is TRANSPARENT — open space on a shell is open space in
  // the world (the dyson-sphere reading): inner shells show through, and the
  // sphere never reads as a dark ball where nothing is claimed.
  ctx.clearRect(0, 0, w, h);

  const projection = geoEquirectangular()
    .scale(w / (2 * Math.PI))
    .translate([w / 2, h / 2]);

  for (const cell of cells) {
    const m = tileMaterial(cell.claim);
    const [pcx, cy] = projection(cell.site);
    const latRad = THREE.MathUtils.degToRad(cell.site[1]);
    const ry = tileDeg * pxPerDeg;
    // Stretch horizontally toward the poles so the tile reads circular on
    // the sphere's surface.
    const rx = Math.min(ry / Math.max(0.25, Math.cos(latRad)), ry * 4);
    const seed = cell.claim.id * 2654435761;

    const drawTile = (cx) => {
      if (cx + rx < 0 || cx - rx > w) return; // this copy is off-canvas
      const rnd = mulberry32(seed);
      // Crisp disc: fill (mass/finish sets saturation and depth). Weathering
      // lives in the RIM, not the face: a battle-tested claim wears a
      // thicker, darker, notched edge — tempered and standing — while a
      // never-challenged claim keeps a thin pristine rim. No marks cross the
      // face of a standing claim.
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = shade(tierColor, 0.55 + 0.45 * m.mass, 0.9 + 0.15 * m.mass);
      ctx.fill();
      ctx.lineWidth = 1.1 + m.weathering * 0.35;
      ctx.strokeStyle = m.weathering ? 'rgba(13,13,13,0.78)' : 'rgba(13,13,13,0.5)';
      ctx.stroke();
      for (let s = 0; s < m.weathering; s++) {
        const ang = rnd() * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, ang, ang + 0.22);
        ctx.lineWidth = 2.2 + ry * 0.08;
        ctx.strokeStyle = 'rgba(13,13,13,0.55)';
        ctx.stroke();
      }

      ctx.save();
      ctx.clip();
      // Thin sourcing reads matte and papery: faint stipple.
      if (m.mass < 0.67) {
        ctx.fillStyle = 'rgba(240,238,228,0.12)';
        const dots = Math.round(40 * (1 - m.mass));
        for (let d = 0; d < dots; d++) {
          ctx.fillRect(cx + (rnd() - 0.5) * rx * 2, cy + (rnd() - 0.5) * ry * 2, 1.5, 1.5);
        }
      }
      // (No painted highlight inside the tile — the "inner light" read as a
      // glow and carried no information. Mass lives in saturation/depth of
      // the fill alone.)
      // Refuted only: a single diagonal strike inside the disc — the 3D
      // analog of the 2D view's ✕ on debunked claims. Standing claims carry
      // no marks across the face.
      if (cell.claim.status === 'refuted') {
        ctx.strokeStyle = 'rgba(13,13,13,0.8)';
        ctx.lineWidth = Math.max(2, ry * 0.16);
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.65, cy + ry * 0.65);
        ctx.lineTo(cx + rx * 0.65, cy - ry * 0.65);
        ctx.stroke();
      }
      ctx.restore();

      if (cell.claim.id === selectedId) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + 3, ry + 3, 0, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    };

    // Tiles near the ±180° seam wrap around it instead of being cut in half:
    // draw the tile again shifted a full canvas width to either side.
    drawTile(pcx - w);
    drawTile(pcx);
    drawTile(pcx + w);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function segmentPoints(P, Q, elevated, t0, t1, steps = 12) {
  const pts = [];
  const M = P.clone().add(Q).multiplyScalar(0.5);
  if (elevated) M.setLength(Math.max(P.length(), Q.length()) + 0.4);
  for (let s = 0; s <= steps; s++) {
    const t = t0 + ((t1 - t0) * s) / steps;
    if (elevated) {
      const a = P.clone().multiplyScalar((1 - t) * (1 - t));
      const b = M.clone().multiplyScalar(2 * (1 - t) * t);
      const c = Q.clone().multiplyScalar(t * t);
      pts.push(a.add(b).add(c));
    } else {
      pts.push(P.clone().lerp(Q, t));
    }
  }
  return pts;
}

// Azimuth about the vertical axis, for the globe-style chain rotation.
function azimuth(v) {
  return Math.atan2(v.x, v.z);
}

// The broken kernel line travels an S-shaped sweep out into space — swinging
// wide of the straight path and hooking back — so the leap has visible
// length and the break sits on a journey, not a stub. The swing runs mostly
// vertically, which reads fully extended in the side-on chain framing.
function kernelCurve(P, Q) {
  const dir = Q.clone().sub(P);
  const dirN = dir.clone().normalize();
  // Lateral swing: vertical, made perpendicular to the chain direction.
  let side = new THREE.Vector3(0, 1, 0).addScaledVector(dirN, -dirN.y);
  if (side.lengthSq() < 1e-4) side = new THREE.Vector3(1, 0, 0).addScaledVector(dirN, -dirN.x);
  side.normalize();
  // A touch of outward drift so the curve floats free of the sphere.
  const out = P.clone().add(Q).multiplyScalar(0.5);
  if (out.lengthSq() < 1e-4) out.set(0, 0, 1);
  out.normalize();
  // "Go halfway and hook back": the swing is on the order of half the
  // sphere itself, not the (short) straight distance — the curve leaves the
  // neighborhood entirely and returns.
  const swing = Math.max(2.6, dir.length() * 1.6);
  const c1 = P.clone()
    .addScaledVector(dir, 0.3)
    .addScaledVector(side, swing)
    .addScaledVector(out, swing * 0.5);
  const c2 = P.clone()
    .addScaledVector(dir, 0.7)
    .addScaledVector(side, -swing)
    .addScaledVector(out, swing * 0.5);
  return new THREE.CubicBezierCurve3(P, c1, c2, Q);
}

// ---- component -----------------------------------------------------------

export default function Onion3D({
  claims,
  depth,
  selectedId,
  chainId,
  onSelect,
  onEmptyClick,
  onEscape,
  onNarrate
}) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);
  const cb = useRef({});
  cb.current = { onSelect, onEmptyClick, onEscape, onNarrate };

  // Routed lineages for the CHAIN claim — fetched on double-click, computed
  // server-side where the routing rule lives.
  const [lineageData, setLineageData] = useState(null);
  const [activeLineage, setActiveLineage] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1); // -1 = whole chain framed
  useEffect(() => {
    setLineageData(null);
    setActiveLineage(0);
    setStepIndex(-1);
    if (chainId == null) return;
    let live = true;
    api
      .lineage(chainId)
      .then((d) => live && setLineageData(d))
      .catch(() => live && setLineageData(null));
    return () => {
      live = false;
    };
  }, [chainId]);

  // One-time scene setup.
  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.copy(HOME_POS);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 4;
    controls.maxDistance = 20;
    // Globe handling: side-to-side rotation is endless (azimuth unclamped);
    // the vertical tilt is held to ±15° around the equator view, so the
    // outcome latitudes stay readable and the poles never flip overhead.
    controls.minPolarAngle = Math.PI / 2 - THREE.MathUtils.degToRad(MAX_TILT_DEG);
    controls.maxPolarAngle = Math.PI / 2 + THREE.MathUtils.degToRad(MAX_TILT_DEG);

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 8, 6);
    scene.add(dir);

    // Everything on the sphere lives under `globe`, which idles rotating at
    // rest. The chain view has its own rotatable group so the unhurried
    // alignment rotation is independent of the resting spin.
    const globe = new THREE.Group();
    const pulseGroup = new THREE.Group();
    const hoverGroup = new THREE.Group();
    globe.add(pulseGroup);
    globe.add(hoverGroup);
    const chainGroup = new THREE.Group();
    scene.add(globe);
    scene.add(chainGroup);

    const st = {
      scene,
      camera,
      renderer,
      controls,
      globe,
      chainGroup,
      pulseGroup,
      hoverGroup,
      shells: new Map(), // tier -> { mesh, voronoi, cells, tileDeg }
      chainActive: false,
      idle: true,
      hoverId: null,
      tweens: [],
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      down: null,
      lastFrame: 0,
      disposed: false
    };
    stateRef.current = st;

    const setSize = () => {
      const w = mount.clientWidth || 600;
      const h = mount.clientHeight || 600;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(mount);

    // Picking. Rest: a click counts only when it lands ON a tile — the open
    // space between tiles is empty space, honestly. Chain: only the chain
    // markers exist.
    const pickClaim = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      st.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      st.raycaster.setFromCamera(st.pointer, st.camera);
      if (st.chainActive) {
        const markers = st.chainGroup.children.filter((o) => o.userData?.claim);
        const hit = st.raycaster.intersectObjects(markers, false)[0];
        return hit?.object.userData.claim ?? null;
      }
      // Open space is see-through, so the ray walks the shells near-to-far:
      // the first TILE it lands on wins; open space on a shell passes the
      // click through to the shells behind it, exactly as the eye reads it.
      const byMesh = new Map([...st.shells.values()].map((s) => [s.mesh, s]));
      const hits = st.raycaster.intersectObjects([...byMesh.keys()], false);
      for (const hit of hits) {
        const shell = byMesh.get(hit.object);
        if (!shell) continue;
        // The globe idles rotating, so convert the hit into globe-local
        // space before reading lon/lat off it.
        const local = st.globe.worldToLocal(hit.point.clone());
        const [lon, lat] = vec3ToLonLat(local);
        const cell =
          shell.cells.length === 1
            ? shell.cells[0]
            : shell.cells[shell.voronoi.find(lon, lat)] ?? null;
        if (cell && angularDistance([lon, lat], cell.site) <= shell.tileDeg * 1.15) {
          return cell.claim;
        }
      }
      return null;
    };

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip3d';
    mount.appendChild(tooltip);

    const goHome = () => {
      const fromPos = st.camera.position.clone();
      const fromTarget = st.controls.target.clone();
      st.tweens.push({
        start: performance.now(),
        dur: 650,
        apply: (k) => {
          const e = k * (2 - k);
          st.camera.position.lerpVectors(fromPos, HOME_POS, e);
          st.controls.target.lerpVectors(fromTarget, new THREE.Vector3(0, 0, 0), e);
        }
      });
    };
    st.goHome = goHome;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        goHome(); // Escape retains its go-home meaning (2.9b).
        cb.current.onEscape?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const onPointerDown = (e) => {
      st.down = [e.clientX, e.clientY];
    };
    const onPointerUp = (e) => {
      if (!st.down) return;
      const moved = Math.hypot(e.clientX - st.down[0], e.clientY - st.down[1]);
      st.down = null;
      if (moved > 5) return; // orbit drag, not a click
      const claim = pickClaim(e);
      // Single-click: select + panel ONLY (2.9b supersession). Empty space:
      // the full sphere restores at the current dial depth — state only, no
      // camera move (that is Escape's job).
      if (claim) cb.current.onSelect?.(claim.id);
      else cb.current.onEmptyClick?.();
    };
    const onPointerMove = (e) => {
      const claim = pickClaim(e);
      if (claim) {
        tooltip.textContent = claim.text.length > 80 ? claim.text.slice(0, 79) + '…' : claim.text;
        tooltip.style.opacity = '1';
        const rect = mount.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - rect.left + 14}px`;
        tooltip.style.top = `${e.clientY - rect.top + 10}px`;
        renderer.domElement.style.cursor = 'pointer';
      } else {
        tooltip.style.opacity = '0';
        renderer.domElement.style.cursor = 'grab';
      }
      const hoverId = !st.chainActive && claim ? claim.id : null;
      if (hoverId !== st.hoverId) {
        st.hoverId = hoverId;
        disposeGroup(st.hoverGroup);
        if (hoverId != null && st.illuminate) st.illuminate(hoverId);
      }
    };
    const onDblClick = (e) => {
      const claim = pickClaim(e);
      if (claim && cb.current.onNarrate) cb.current.onNarrate(claim.id);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('dblclick', onDblClick);

    const animate = () => {
      if (st.disposed) return;
      requestAnimationFrame(animate);
      const now = performance.now();
      const dt = st.lastFrame ? now - st.lastFrame : 16;
      st.lastFrame = now;
      const active = [];
      const finished = [];
      for (const t of st.tweens) {
        const k = Math.min(1, (now - t.start) / t.dur);
        t.apply(k);
        (k >= 1 ? finished : active).push(t);
      }
      st.tweens = active;
      for (const t of finished) t.onDone && t.onDone();
      // Rest state idles globe-style; selection and chain hold still.
      if (st.idle && !st.chainActive) st.globe.rotation.y += IDLE_SPIN * dt;
      const breath = 0.55 + 0.45 * Math.sin(now / 700);
      for (const p of st.pulseGroup.children) {
        p.material.opacity = 0.12 + 0.3 * breath;
        const s = 0.5 + 0.12 * breath;
        p.scale.set(s, s, 1);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      st.disposed = true;
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('dblclick', onDblClick);
      controls.dispose();
      for (const { mesh } of st.shells.values()) {
        mesh.geometry.dispose();
        mesh.material.map?.dispose();
        mesh.material.dispose();
      }
      disposeGroup(st.chainGroup);
      disposeGroup(st.hoverGroup);
      disposeGroup(st.pulseGroup);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      mount.removeChild(tooltip);
    };
  }, []);

  // Sync shells, chain view, pulse, hover with data and interaction state.
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;

    const byTier = new Map();
    for (const c of claims) {
      if (!c.radial_tier) continue;
      if (!byTier.has(c.radial_tier)) byTier.set(c.radial_tier, []);
      byTier.get(c.radial_tier).push(c);
    }
    const desired = TIERS.filter((t) => byTier.has(t));
    const depthChanged = st.lastDepth !== undefined && st.lastDepth !== depth;
    st.lastDepth = depth;
    const maxMag = maxMagnitudeIn(claims);

    const tween = (mat, from, to, dur, delay = 0, onDone) => {
      mat.transparent = true;
      mat.opacity = from;
      st.tweens.push({
        start: performance.now() + delay,
        dur,
        apply: (k) => {
          mat.opacity = from + (to - from) * Math.max(0, k);
          mat.needsUpdate = true;
        },
        onDone: () => {
          if (to >= 1) {
            mat.transparent = false;
            mat.opacity = 1;
            mat.needsUpdate = true;
          }
          onDone && onDone();
        }
      });
    };

    for (const [tier, shell] of [...st.shells.entries()]) {
      if (!desired.includes(tier)) {
        st.shells.delete(tier);
        tween(shell.mesh.material, 1, 0, 550, 0, () => {
          st.globe.remove(shell.mesh);
          shell.mesh.geometry.dispose();
          shell.mesh.material.map?.dispose();
          shell.mesh.material.dispose();
        });
      }
    }

    for (const tier of desired) {
      const list = byTier.get(tier);
      const tileDeg = tileAngularRadius(TIER_RADII[tier], list.length);
      const tierIndex = TIERS.indexOf(tier);
      const cells = list.map((claim, i) => ({
        claim,
        site: siteFor(claim, i, { maxMagnitude: maxMag, tierIndex })
      }));
      const voronoi = cells.length > 1 ? geoVoronoi(cells.map((c) => c.site)) : null;
      const texture = shellTexture(cells, selectedId, tileDeg, TIER_COLORS_DARK[tier]);
      const existing = st.shells.get(tier);
      if (existing) {
        existing.mesh.material.map?.dispose();
        existing.mesh.material.map = texture;
        existing.mesh.material.needsUpdate = true;
        existing.cells = cells;
        existing.voronoi = voronoi;
        existing.tileDeg = tileDeg;
        if (depthChanged) {
          tween(existing.mesh.material, 1, 0.3, 350, 0, () =>
            tween(existing.mesh.material, 0.3, 1, 450, 250)
          );
        }
      } else {
        const geo = new THREE.SphereGeometry(TIER_RADII[tier], 64, 48);
        // alphaTest discards the transparent open space between tiles, so
        // the depth buffer stays honest and inner shells render through the
        // gaps without transparency-sorting artifacts. DoubleSide: a tile
        // reads (and clicks) the same from inside the sphere as from
        // outside — the far hemisphere is part of the world, not a void.
        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.85,
          metalness: 0,
          alphaTest: 0.05,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        st.globe.add(mesh);
        st.shells.set(tier, { mesh, cells, voronoi, tileDeg });
        if (depthChanged) {
          tween(mat, 0, 0.35, 400, 100, () => tween(mat, 0.35, 1, 450, 200));
        } else {
          mat.transparent = false;
          mat.opacity = 1;
        }
      }
    }

    const sitesById = new Map();
    for (const [tier, shell] of st.shells.entries()) {
      for (const cell of shell.cells) {
        sitesById.set(cell.claim.id, { site: cell.site, r: TIER_RADII[tier] });
      }
    }
    const posFor = (id) => {
      const s = sitesById.get(id);
      return s ? lonLatToVec3(s.site[0], s.site[1], s.r) : null;
    };
    const byId = new Map(claims.map((c) => [c.id, c]));

    // Rest-state contention pulse — breathes under the render loop.
    disposeGroup(st.pulseGroup);
    for (const c of claims) {
      if (!c.radial_tier) continue;
      if (!tileMaterial(c).pulse) continue;
      const p = posFor(c.id);
      if (!p) continue;
      const glow = makeGlowSprite('rgba(224,178,63,0.85)', 0.3);
      glow.position.copy(p.clone().multiplyScalar(1.01));
      st.pulseGroup.add(glow);
    }

    // Hover whisper — members softly illuminate, no lines.
    st.illuminate = (hoverId) => {
      const claim = byId.get(hoverId);
      if (!claim) return;
      for (const id of lineageMembers(claim, byId)) {
        const p = posFor(id);
        if (!p) continue;
        const glow = makeGlowSprite('rgba(195,194,183,0.9)', 0.35);
        glow.scale.set(0.42, 0.42, 1);
        glow.position.copy(p);
        st.hoverGroup.add(glow);
      }
    };

    // ---- Chain view (2.9b): double-click only ------------------------
    // A claim earns the chain view with EITHER kernel lineages or plain
    // support links — a middle claim's evidentiary descent is a chain too,
    // all solid, no break (the questionable-research-practices case).
    disposeGroup(st.chainGroup);
    const chainClaim = chainId != null ? byId.get(chainId) : null;
    const lineages =
      (chainClaim && lineageData?.claim_id === chainId && lineageData?.lineages) || [];
    // The support chain is the whole CONNECTED COMPONENT through support
    // links, walked in both directions — if 26 rests on 24 and 24 props up
    // 30, double-clicking 26 shows all three. Every edge keeps its recorded
    // direction; only membership is bidirectional.
    const descentLinks = [];
    if (chainClaim) {
      const seen = new Set([chainClaim.id]);
      const queue = [chainClaim.id];
      const edgeKeys = new Set();
      const addEdge = (supporter, supported) => {
        const k = `${supporter}>${supported}`;
        if (edgeKeys.has(k)) return;
        edgeKeys.add(k);
        descentLinks.push({ supporter_id: supporter, supported_id: supported });
      };
      while (queue.length) {
        const c = byId.get(queue.shift());
        if (!c) continue;
        for (const sup of c.supported_by || []) {
          if (byId.has(sup) && sitesById.has(sup)) {
            addEdge(sup, c.id);
            if (!seen.has(sup)) {
              seen.add(sup);
              queue.push(sup);
            }
          }
        }
        for (const sid of c.supports_claims || []) {
          if (byId.has(sid) && sitesById.has(sid)) {
            addEdge(c.id, sid);
            if (!seen.has(sid)) {
              seen.add(sid);
              queue.push(sid);
            }
          }
        }
      }
    }
    const chainOn = !!(
      chainClaim &&
      sitesById.has(chainId) &&
      (lineages.length > 0 || descentLinks.length > 0)
    );
    st.chainActive = chainOn;
    st.globe.visible = !chainOn; // every tile not in the chain clears FULLY
    st.idle = selectedId == null && !chainOn;

    if (!chainOn) {
      if (st.chainRotKey != null) {
        st.chainRotKey = null;
        // Restoring the sphere: re-center the orbit, and if the chain zoom
        // left the camera inside the shells, glide out to just beyond the
        // outermost — stay-put otherwise (the camera keeps its vantage).
        const fromT = st.controls.target.clone();
        const fromP = st.camera.position.clone();
        const minR = TIER_RADII.outermost + 1.0;
        const outP = fromP.length() < minR ? fromP.clone().setLength(minR) : fromP;
        st.tweens.push({
          start: performance.now(),
          dur: 500,
          apply: (k) => {
            const e = k * (2 - k);
            st.controls.target.lerpVectors(fromT, new THREE.Vector3(0, 0, 0), e);
            st.camera.position.lerpVectors(fromP, outP, e);
          }
        });
      }
      return;
    }

    const act = lineages.length ? Math.min(activeLineage, lineages.length - 1) : 0;

    // Every line from the boundary module — style derives from kind there.
    const specs = lineageSpecs({ claim: chainClaim, descentLinks, lineages });

    const chainIds = new Set([chainClaim.id]);
    for (const lin of lineages[act] ? [lineages[act]] : []) {
      for (const pc of lin.path) chainIds.add(pc.id);
    }
    for (const l of descentLinks) {
      chainIds.add(l.supporter_id);
      chainIds.add(l.supported_id);
    }

    // Points the camera framing must keep in view beyond the tiles
    // themselves — the kernel curves sweep far outside the node positions.
    const frameExtras = [];

    for (const spec of specs) {
      // Descent links carry no lineageIndex and are always part of the chain.
      const isActive = spec.lineageIndex == null || spec.lineageIndex === act;
      if (!isActive && spec.kind === 'support') continue; // others cleared
      const P = posFor(spec.from);
      const Q = posFor(spec.to);
      if (!P || !Q) continue;
      if (spec.kind === 'support') {
        if (spec.contested) {
          const geo = new THREE.BufferGeometry().setFromPoints(segmentPoints(P, Q, false, 0, 1));
          const dashMat = new THREE.LineDashedMaterial({
            color: CONTESTED_LINE,
            dashSize: 0.09,
            gapSize: 0.06,
            transparent: true,
            opacity: 0.95
          });
          const line = new THREE.Line(geo, dashMat);
          line.computeLineDistances();
          st.chainGroup.add(line);
        } else {
          const geo = new THREE.BufferGeometry().setFromPoints([P, Q]);
          st.chainGroup.add(
            new THREE.Line(
              geo,
              new THREE.LineBasicMaterial({ color: SUPPORT_LINE, transparent: true, opacity: 0.9 })
            )
          );
        }
      } else {
        // Broken kernel line — the break and its gap statement must be
        // readable in this view without further camera work.
        if (!isActive) {
          // Minimal indication for unstepped lineages: the kernel's ember dot.
          const dot = makeGlowSprite('rgba(208,122,74,0.9)', 0.35);
          dot.scale.set(0.3, 0.3, 1);
          dot.position.copy(P);
          st.chainGroup.add(dot);
          continue;
        }
        const color = spec.contested ? CONTESTED_LINE : KERNEL_LINE;
        const solidEnd = Math.max(0.05, 1 - spec.breakFraction - 0.03);
        // The S-curve replaces the straight (and formerly "elevated") hop:
        // it floats free of the sphere for every kernel link.
        const curve = kernelCurve(P, Q);
        const mkCurve = (t0, t1) => {
          const pts = [];
          for (let s = 0; s <= 24; s++) pts.push(curve.getPoint(t0 + ((t1 - t0) * s) / 24));
          const geo = new THREE.BufferGeometry().setFromPoints(pts);
          st.chainGroup.add(
            new THREE.Line(
              geo,
              new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
            )
          );
        };
        mkCurve(0, solidEnd);
        mkCurve(0.97, 1); // the dangling stub at the unearned claim
        for (const t of [0.2, 0.5, 0.8]) frameExtras.push(curve.getPoint(t));
        const gapMid = curve.getPoint((solidEnd + 0.97) / 2);
        const label = makeLabelSprite(
          `${spec.contested ? '⚠ questioned · ' : ''}${spec.gap.establishes} ⟂ ${spec.gap.asserts_beyond}`,
          { bg: 'rgba(38,20,10,0.85)', ink: spec.contested ? '#e0b23f' : '#d8a06f', scale: 1.25 }
        );
        // Below the curve, in its own band — node labels ladder upward.
        label.position.copy(gapMid).add(new THREE.Vector3(0, -0.3, 0));
        st.chainGroup.add(label);
      }
    }

    const positions = new Map();
    for (const id of chainIds) {
      const p = posFor(id);
      if (p) positions.set(id, p);
    }
    // Node labels LADDER: members are ordered along the chain (inward tier
    // first) and each takes a UNIQUE band — alternating above/below the
    // node, magnitude growing every pair — so no two labels can ever share
    // a height, no matter how close their tiles sit.
    const ordered = [...chainIds]
      .filter((id) => byId.get(id) && positions.has(id))
      .sort(
        (a, b) =>
          TIERS.indexOf(byId.get(a).radial_tier) - TIERS.indexOf(byId.get(b).radial_tier) ||
          a - b
      );
    ordered.forEach((id, idx) => {
      const c = byId.get(id);
      const isRoot = id === chainClaim.id;
      const stepped =
        stepIndex >= 0 &&
        lineages[act] &&
        [...lineages[act].path.map((p) => p.id), chainClaim.id][stepIndex] === id;
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(isRoot ? 0.22 : 0.15, 24, 18),
        new THREE.MeshStandardMaterial({
          color: TIER_COLORS_DARK[c.radial_tier] || '#8d8a80',
          emissive: isRoot || stepped ? 0xffffff : 0x000000,
          emissiveIntensity: isRoot ? 0.25 : stepped ? 0.4 : 0,
          roughness: 0.7
        })
      );
      marker.position.copy(positions.get(id));
      marker.userData.claim = c;
      st.chainGroup.add(marker);
      const label = makeLabelSprite(`${c.radial_tier} · ${c.text}`, { scale: 0.85 });
      const bandSide = idx % 2 === 0 ? 1 : -1;
      const bandMag = 0.34 + Math.floor(idx / 2) * 0.3;
      label.position.copy(positions.get(id)).add(new THREE.Vector3(0, bandSide * bandMag, 0));
      st.chainGroup.add(label);
    });

    // Globe-style alignment: rotate the chain about the vertical axis —
    // animated, unhurried — until it lies ACROSS the visible face. The chain
    // runs mostly radially (kernel deep, claim shallow), so facing it at the
    // camera shows it end-on: foreshortened to almost nothing, the break
    // collapsed shut. Legible is SIDE-ON — the chain's direction 90° off the
    // camera azimuth, fully extended, the break visibly open. Runs once per
    // chain/lineage, not on every data refresh.
    const rotKey = `${chainId}:${act}:${lineages.length}`;
    if (st.chainRotKey !== rotKey) {
      st.chainRotKey = rotKey;
      st.chainGroup.rotation.y = st.globe.rotation.y; // continuity with rest
      const centroid = new THREE.Vector3();
      for (const p of positions.values()) centroid.add(p);
      centroid.divideScalar(Math.max(1, positions.size));
      const faceOn =
        azimuth(st.camera.position) -
        azimuth(centroid.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), st.chainGroup.rotation.y));
      const norm = (a) => {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
      };
      // Side-on: ±90° from face-on, whichever is the shorter rotation.
      const left = norm(faceOn + Math.PI / 2);
      const right = norm(faceOn - Math.PI / 2);
      const delta = Math.abs(left) <= Math.abs(right) ? left : right;
      const from = st.chainGroup.rotation.y;
      st.tweens.push({
        start: performance.now(),
        dur: 1400,
        apply: (k) => {
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          st.chainGroup.rotation.y = from + delta * e;
        }
      });
      // Frame the CHAIN, not the sphere: shell radii only span a couple of
      // world units, so against full-sphere framing a chain is a stub. The
      // camera glides in until the chain fills the view, target on the
      // chain's own center (post-rotation positions).
      const finalRot = from + delta;
      const yAxis = new THREE.Vector3(0, 1, 0);
      const box = new THREE.Box3();
      for (const p of positions.values()) {
        box.expandByPoint(p.clone().applyAxisAngle(yAxis, finalRot));
      }
      for (const p of frameExtras) {
        box.expandByPoint(p.clone().applyAxisAngle(yAxis, finalRot));
      }
      const bounds = box.getBoundingSphere(new THREE.Sphere());
      const dist = Math.max(st.controls.minDistance + 0.2, bounds.radius * 2.6 + 1.2);
      const dir = st.camera.position.clone().sub(bounds.center);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0.3, 1);
      const camTo = bounds.center.clone().add(dir.setLength(dist));
      const fromPos = st.camera.position.clone();
      const fromTarget = st.controls.target.clone();
      st.tweens.push({
        start: performance.now(),
        dur: 1400,
        apply: (k) => {
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          st.camera.position.lerpVectors(fromPos, camTo, e);
          st.controls.target.lerpVectors(fromTarget, bounds.center, e);
        }
      });
    }

    // Chip stepping: the camera walks the path node by node.
    if (stepIndex >= 0) {
      const ids = [...lineages[act].path.map((p) => p.id), chainClaim.id];
      const id = ids[Math.min(stepIndex, ids.length - 1)];
      const p = positions.get(id);
      if (p) {
        const world = p.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), st.chainGroup.rotation.y);
        const fromTarget = st.controls.target.clone();
        st.tweens.push({
          start: performance.now(),
          dur: 550,
          apply: (k) => {
            st.controls.target.lerpVectors(fromTarget, world, k * (2 - k));
          }
        });
      }
    }
  }, [claims, depth, selectedId, chainId, lineageData, activeLineage, stepIndex]);

  const fanChips = chainId != null && lineageData?.claim_id === chainId ? lineageData.lineages : [];

  return (
    <div className="onion3d" ref={mountRef}>
      {fanChips.length > 0 && (
        <div className="fan-chips">
          {fanChips.map((lin, i) => (
            <button
              key={lin.kernel_link_id}
              className={`fan-chip${activeLineage === i ? ' active' : ''}${lin.contested ? ' contested' : ''}`}
              title={
                activeLineage === i
                  ? 'Step the camera along this lineage'
                  : `${lin.kernel.text} — ${lin.break.gap.establishes}`
              }
              onClick={() => {
                if (activeLineage === i) {
                  // Step along the path: kernel → hops → the claim, cycling.
                  const len = lin.path.length + 1;
                  setStepIndex((s) => (s + 1) % len);
                } else {
                  setActiveLineage(i);
                  setStepIndex(-1);
                }
              }}
            >
              {activeLineage === i ? '● ' : '○ '}
              {lin.kernel.text.length > 26 ? lin.kernel.text.slice(0, 25) + '…' : lin.kernel.text}
              {activeLineage === i && stepIndex >= 0 ? ` · ${stepIndex + 1}/${lin.path.length + 1}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
