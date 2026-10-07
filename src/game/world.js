import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { regions, regionById } from './regions.js';
import { buildLandscape } from './landscape.js';
import { buildArchitecture } from './architecture.js';
import { createCharacter, updateCharacter, setCharacterDistance } from './characters.js';

const TAU = Math.PI * 2;
const riverCenter = x => -12 + Math.sin(x * .035) * 2.8;
const smooth = x => x * x * (3 - 2 * x);
const clamp = THREE.MathUtils.clamp;

export function createWorld(container, callbacks = {}, initialState = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b9dfe4');
  scene.fog = new THREE.FogExp2('#bddbd7', .0046);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(container.clientWidth || innerWidth, container.clientHeight || innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Third person view of the Lanterns of Learning world');
  renderer.domElement.tabIndex = 0;
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(58, (container.clientWidth || innerWidth) / (container.clientHeight || innerHeight), .1, 360);
  const hemi = new THREE.HemisphereLight('#fff0d6', '#809482', 1.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffead1', 2.2);
  sun.position.set(-38, 65, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -63, right: 63, top: 63, bottom: -63, near: .5, far: 170 });
  sun.shadow.bias = -.0002;
  sun.shadow.normalBias = .035;
  sun.shadow.radius = 2;
  scene.add(sun, sun.target);

  const materials = new Map();
  const mat = (color, options = {}) => {
    const key = color + JSON.stringify(options);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .85, ...options }));
    return materials.get(key);
  };
  const colliders = [], targets = [], windmills = [], drifting = [], labelSprites = [];
  const random = (() => { let seed = 7821; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; })();
  let completed = new Set(initialState.completed || initialState.completedIds || []);
  let paused = false, disposed = false, activeRegion = '', nearest = null;
  let yaw = 0, pitch = .23, distance = 10.7, groundVelocity = 0, jumping = false;
  let quality = 'high', reducedMotion = false, sensitivity = 1, shadows = true;
  const keys = new Set();
  const clock = new THREE.Clock();
  let fpsFrames = 0, fpsElapsed = 0, fps = 60, elapsed = 0, lastMoveSent = 0;

  function terrainHeight(x, z) {
    let h = .7 + Math.sin(x * .055) * Math.cos(z * .051) * 3.6 + Math.sin(x * .12 + z * .045) * .6;
    for (const r of regions) {
      const d = Math.hypot(x - r.x, z - r.z);
      if (d < 18) h = THREE.MathUtils.lerp(.65, h, smooth(clamp((d - 10) / 8, 0, 1)));
    }
    // A genuine harbor basin lets the lake meet a sloping shore.
    const coastD = Math.hypot(x - 57, z - 93);
    if (coastD < 34) h = THREE.MathUtils.lerp(-1.6, h, smooth(clamp((coastD - 25) / 9, 0, 1)));
    if (Math.hypot(x, z) < 20) h = THREE.MathUtils.lerp(.65, h, smooth(clamp((Math.hypot(x, z) - 13) / 7, 0, 1)));
    const riverD = Math.abs(z - riverCenter(x));
    if (riverD < 8 && x > -105 && x < 94) h = THREE.MathUtils.lerp(-1.0, h, smooth(clamp((riverD - 3.7) / 4.3, 0, 1)));
    return h;
  }
  function terrainSurface(x, z) {
    // Match the triangulated ground exactly so paths never cross its surface.
    const step = 245 / 144, ix = Math.floor((x + 122.5) / step), iz = Math.floor((z + 122.5) / step);
    const x0 = ix * step - 122.5, z0 = iz * step - 122.5, fx = (x - x0) / step, fz = (z - z0) / step;
    const h00 = terrainHeight(x0, z0), h10 = terrainHeight(x0 + step, z0), h01 = terrainHeight(x0, z0 + step), h11 = terrainHeight(x0 + step, z0 + step);
    return fx + fz <= 1 ? h00 + (h10 - h00) * fx + (h01 - h00) * fz : h11 + (h10 - h11) * (1 - fz) + (h01 - h11) * (1 - fx);
  }
  function mesh(geometry, material, x = 0, y = 0, z = 0, parent = scene, shadow = true) {
    const m = new THREE.Mesh(geometry, typeof material === 'string' ? mat(material) : material);
    m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(w, h, d, color, x, y, z, parent = scene, shadow = true) { return mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent, shadow); }
  function cylinder(r1, r2, h, color, x, y, z, parent = scene, segments = 12) { return mesh(new THREE.CylinderGeometry(r1, r2, h, segments), color, x, y, z, parent); }
  function sphere(r, color, x, y, z, parent = scene, detail = 1) { return mesh(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, parent); }
  function addCollider(x, z, w, d, h = 6) { colliders.push({ x, z, w: w / 2 + .34, d: d / 2 + .34, y: terrainSurface(x, z), h }); }
  function label(text, { color = '#ffde9a', scale = 1, marker = false } = {}) {
    const canvas = document.createElement('canvas'); canvas.width = marker ? 128 : 640; canvas.height = marker ? 128 : 192;
    const ctx = canvas.getContext('2d');
    if (marker) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(64, 64, 47, 0, TAU); ctx.fill();
      ctx.fillStyle = '#18362e'; ctx.font = 'bold 66px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 64, 67);
    } else {
      ctx.font = '600 29px system-ui, sans-serif';
      const lines = []; let line = '';
      for (const word of text.split(' ')) {
        const next = line ? line + ' ' + word : word;
        if (ctx.measureText(next).width > 590 && line) { lines.push(line); line = word; } else line = next;
      }
      lines.push(line);
      const height = lines.length * 39 + 26, top = (192 - height) / 2;
      ctx.fillStyle = 'rgba(24, 49, 43, .87)'; ctx.beginPath(); ctx.roundRect(10, top, 620, height, 20); ctx.fill();
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((value, i) => ctx.fillText(value, 320, top + 33 + i * 39));
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(marker ? .8 * scale : 6 * scale, marker ? .8 * scale : 1.8 * scale, 1);
    sprite.userData.authoredScale = sprite.scale.clone(); sprite.userData.screenWidth = marker ? 46 : 260;
    labelSprites.push(sprite); return sprite;
  }

  // One vertex-colored terrain surface gives the hills a painterly, faceted appearance.
  const terrainGeo = new THREE.PlaneGeometry(245, 245, 144, 144); terrainGeo.rotateX(-Math.PI / 2);
  const verts = terrainGeo.attributes.position, colors = [];
  const grassA = new THREE.Color('#619b69'), grassB = new THREE.Color('#87b276'), bank = new THREE.Color('#b4ac78');
  for (let i = 0; i < verts.count; i++) {
    const x = verts.getX(i), z = verts.getZ(i), h = terrainHeight(x, z); verts.setY(i, h);
    const c = grassA.clone().lerp(grassB, clamp(.5 + Math.sin(x * .05 + z * .06) * .25 + h * .045, 0, 1));
    if (Math.abs(z - riverCenter(x)) < 7.6) c.lerp(bank, .65);
    colors.push(c.r, c.g, c.b);
  }
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); terrainGeo.computeVertexNormals();
  const terrain = mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), 0, 0, 0, scene, false); terrain.receiveShadow = true;

  const landscape = buildLandscape({ scene, mesh, mat, terrainHeight, regions, riverCenter, random, addCollider });

  function path(points, width = 2.5) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], 0, p[1]))), vertices = [], indices = [];
    const segments = 260, across = 6;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments, v = curve.getPoint(t), tangent = curve.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      for (let j = 0; j <= across; j++) {
        const offset = (j / across - .5) * width, x = v.x + normal.x * offset, z = v.z + normal.z * offset;
        vertices.push(x, terrainSurface(x, z) + .035, z);
        if (i < segments && j < across) { const k = i * (across + 1) + j; indices.push(k, k + 1, k + across + 1, k + 1, k + across + 2, k + across + 1); }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals();
    const trail = mesh(g, mat('#d9caa2', { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), 0, 0, 0, scene, false);
    trail.userData.noBatch = true;
  }
  path([[0, 19], [0, 9], [0, 0]], 4);
  path([[0, 8], [13, 4], [22, -3]], 3.2);
  path([[22, -16], [29, -20], [38, -24]], 3);
  path([[-8, 3], [-23, 17], [-45, 24], [-61, 24]]);
  path([[7, 10], [30, 16], [60, 21]]);
  path([[2, 18], [15, 39], [31, 63]]);
  path([[-4, 18], [-15, 38], [-24, 57]]);
  path([[38, -27], [47, -41], [58, -55]]);
  path([[38, -29], [29, -47], [18, -62]]);
  path([[18, -62], [-5, -68], [-26, -64]]);
  path([[-26, -64], [-45, -50], [-58, -28]]);

  const architecture = buildArchitecture({ THREE, scene, mesh, box, cylinder, sphere, mat, terrainHeight, addCollider });
  // Village banners, fountain, study camp, and directional signposts.
  cylinder(1.75, 1.95, .55, '#bdc4ae', 5.5, .9, 6, scene, 16);
  cylinder(1.5, 1.5, .06, '#7ec0bc', 5.5, 1.19, 6, scene, 24);
  cylinder(.24, .35, 1.65, '#babfa9', 5.5, 1.5, 6);
  addCollider(5.5, 6, 3.3, 3.3, 2.4);
  const fountainOrb = sphere(.5, '#e9d39a', 5.5, 2.6, 6);
  const fountainSpout = cylinder(.055, .13, 1.1, mat('#9ee0d5', { emissive: '#75bbbd', emissiveIntensity: .5 }), 5.5, 1.77, 6);
  fountainSpout.visible = false;
  for (const [x, z, c] of [[-4, 17, '#cc775c'], [4, 2, '#e4bc65'], [12, -1, '#d88e63']]) {
    const y = terrainHeight(x, z); cylinder(.09, .09, 4, '#a28f6d', x, y + 2, z); const flag = box(1.2, .7, .04, c, x + .55, y + 3.55, z); drifting.push({ mesh: flag, base: flag.rotation.z, kind: 'flag' });
  }
  function signpost(x, z, title) {
    const y = terrainHeight(x, z); cylinder(.09, .12, 2, '#8c7452', x, y + 1, z); box(1.8, .5, .16, '#c5a87b', x, y + 1.6, z); const s = label(title, { scale: .42, color: '#fff3ce' }); s.position.set(x, y + 2.45, z); scene.add(s);
  }
  signpost(12, 3, 'Department of Engineering →'); signpost(-14, 18, '← Department of Medical & Health Sciences');

  // The Moulakis Archive: an open pavilion with warm reading-room colors.
  const archiveX = -8, archiveZ = -1, archiveY = terrainHeight(archiveX, archiveZ);
  cylinder(4.1, 4.5, .55, '#d7d2bc', archiveX, archiveY + .27, archiveZ, scene, 8);
  for (const a of [0, 1, 2, 3, 4, 5]) { const angle = a / 6 * TAU; cylinder(.2, .28, 4.3, '#eee2c7', archiveX + Math.cos(angle) * 3.1, archiveY + 2.45, archiveZ + Math.sin(angle) * 3.1); }
  cylinder(0, 4.5, 2.4, '#578582', archiveX, archiveY + 5.5, archiveZ, scene, 8);
  box(2.6, 1.5, .5, '#a58a60', archiveX, archiveY + 1.05, archiveZ - 2);
  for (let i = 0; i < 9; i++) box(.17, .65 + (i % 3) * .09, .35, ['#b56e55', '#74938c', '#d1ac6d'][i % 3], archiveX - 1 + i * .24, archiveY + 1.5, archiveZ - 1.9);
  addCollider(archiveX, archiveZ - 2, 3, .8);

  // Central knowledge beacon, rebuilt one illuminated shard at a time.
  const beacon = new THREE.Group(); beacon.position.set(0, terrainHeight(0, 0), -1); scene.add(beacon);
  cylinder(3.5, 4, .35, '#cfceb9', 0, .18, 0, beacon, 32);
  cylinder(2.45, 2.8, .45, '#bfc7b2', 0, .53, 0, beacon, 24);
  cylinder(.8, 1.1, 2.5, '#ece0ba', 0, 1.9, 0, beacon, 8);
  cylinder(1.45, 1.1, .35, '#d8bd7d', 0, 3.24, 0, beacon, 8);
  const beaconCore = sphere(.8, mat('#85c6ac', { emissive: '#4c9d87', emissiveIntensity: .6, roughness: .2 }), 0, 4.35, 0, beacon);
  beaconCore.scale.y = 1.7;
  const beaconShards = [];
  for (let i = 0; i < 9; i++) { const angle = i / 9 * TAU; const crystal = mesh(new THREE.OctahedronGeometry(.27), mat('#a3baa6', { emissive: '#000000', roughness: .35 }).clone(), Math.cos(angle) * 1.43, 3.7, Math.sin(angle) * 1.43, beacon); crystal.scale.y = 1.8; beaconShards.push(crystal); }
  const halo = mesh(new THREE.TorusGeometry(1.35, .06, 6, 32), '#d9bf78', 0, 4.45, 0, beacon); halo.rotation.x = Math.PI / 2; addCollider(0, -1, 2.2, 2.2);
  const beaconLight = new THREE.PointLight('#bff4c3', 1, 17); beaconLight.position.set(0, 4.2, -1); scene.add(beaconLight);

  // Bridge workshop is reachable before the route is repaired.
  const bridgeX = 22, bridgeZ = riverCenter(22);
  const bridgeBoards = [], brokenBoards = [];
  for (let i = 0; i < 17; i++) {
    const board = box(4.6, .18, .65, '#bc9865', bridgeX, 1.05, bridgeZ - 5.5 + i * .69); bridgeBoards.push(board);
    if (i > 5 && i < 12) board.visible = false;
  }
  for (const side of [-1, 1]) {
    box(.25, .4, 12.2, '#806b50', bridgeX + side * 2.1, .78, bridgeZ);
    for (let i = 0; i < 5; i++) { cylinder(.11, .15, 1.25, '#9b835f', bridgeX + side * 2.13, 1.7, bridgeZ - 5.4 + i * 2.7); }
    box(.12, .12, 11.4, '#aa946f', bridgeX + side * 2.15, 2.13, bridgeZ);
    box(.3, 3, .3, '#776b56', bridgeX + side * 1.75, -.35, bridgeZ - 3.8);
    box(.3, 3, .3, '#776b56', bridgeX + side * 1.75, -.35, bridgeZ + 3.8);
  }
  for (let i = 0; i < 3; i++) { const b = box(3.3, .18, .6, '#b79364', bridgeX + i * .4 - .4, .75, bridgeZ + i * .6); b.rotation.set(.18, .5, .25); brokenBoards.push(b); }
  for (let i = 0; i < 4; i++) box(2.8, .18, .45, '#b79765', 27.5, terrainHeight(27.5, -2) + .2 + i * .18, -2.5);
  // Highland machinery, wheel, crane and a continuously animated windmill.
  function windmill(x, z, scale = 1) {
    const y = terrainHeight(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); scene.add(g);
    cylinder(1.15, 2, 8.5, '#e5d8b7', 0, 4.25, 0, g); cylinder(0, 1.7, 2.4, '#ab785c', 0, 9.65, 0, g, 8);
    const rotor = new THREE.Group(); rotor.position.set(0, 7.4, 1.25); g.add(rotor);
    for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.z = i / 4 * TAU; rotor.add(arm); box(.22, 4.5, .15, '#a18662', 0, 2, 0, arm); box(.8, 2.2, .1, '#e2d6ad', .3, 3, .04, arm); }
    sphere(.37, '#9d805b', 0, 0, .1, rotor); windmills.push(rotor); addCollider(x, z, 3, 3, 11 * scale); return rotor;
  }
  windmill(44, -33, 1.05); windmill(34, -19, .65);
  const energyPanels = new THREE.Group(); energyPanels.position.set(47, terrainHeight(47, -25), -25); scene.add(energyPanels);
  for (let i = 0; i < 3; i++) { cylinder(.08, .08, 1.5, '#a5997a', i * 2, .75, 0, energyPanels); const panel = box(1.65, .12, 2.1, '#4a7d98', i * 2, 1.6, 0, energyPanels); panel.rotation.x = -.3; for (let line = 0; line < 4; line++) box(.03, .02, 1.98, '#a8c9c7', i * 2 - .6 + line * .4, 1.7, .03, energyPanels); }
  for (let i=0;i<3;i++) addCollider(47+i*2,-25,1.65,2.1,2.3);
  const forgeGlow = cylinder(.7, .9, 1.25, mat('#b29a62', { emissive: '#ba6b1c', emissiveIntensity: 0 }), 39, 1.55, -26); addCollider(39, -26, 1.5, 1.5);
  addCollider(40,-19,.5,.5,7);
  const crane = new THREE.Group(); crane.position.set(40, terrainHeight(40, -19), -19); scene.add(crane); box(.35, 7, .35, '#917855', 0, 3.5, 0, crane); box(6, .35, .35, '#b29463', -2, 6.8, 0, crane); cylinder(.035, .035, 4.5, '#585d50', -4.4, 4.4, 0, crane); box(.9, .7, .8, '#a69980', -4.4, 1.8, 0, crane);

  // Reactive landmarks stay separate from static architectural batches.
  const runeCrystal = sphere(.38, mat('#8ce0d5', { emissive: '#55b9ae', emissiveIntensity: .15, roughness:.25 }), 60, 5.45, 15);
  const councilFlags = [];
  for (const [x, c] of [[-66, '#bba1c9'], [-50, '#88adb0']]) {
    cylinder(.07, .09, 4.7, '#938569', x, terrainSurface(x,-25) + 2.35, -25);
    const flag = box(1.3, 1.5, .05, mat(c).clone(), x + .6, terrainSurface(x,-25) + 3.85, -25);
    flag.userData.originalColor = c; councilFlags.push(flag);
  }
  const beam = box(9, .07, .07, mat('#f5e6ad', { emissive: '#e9d88b', emissiveIntensity: .8 }), -24, 1.9, -59); beam.rotation.y = .15;
  const toothModel = new THREE.Group(); toothModel.position.set(18,terrainSurface(18,-58),-58); scene.add(toothModel);
  cylinder(1.9,2.15,.24,'#b6c5b2',0,.12,0,toothModel,32);
  const enamel = mat('#fff2d7',{roughness:.32});
  const crown = mesh(new THREE.SphereGeometry(1,28,18),enamel,0,2.35,0,toothModel); crown.scale.set(1.06,.7,.83);
  for (const dx of [-.48,.48]) for (const dz of [-.33,.33]) {
    const cusp = mesh(new THREE.SphereGeometry(.52,18,12),enamel,dx,2.64,dz,toothModel); cusp.scale.y=.8;
  }
  for (const dx of [-.5,.5]) {
    const profile=[new THREE.Vector2(.04,0),new THREE.Vector2(.15,.35),new THREE.Vector2(.24,.75),new THREE.Vector2(.36,1.25),new THREE.Vector2(.37,1.55)];
    const root=mesh(new THREE.LatheGeometry(profile,24),enamel,dx,.35,0,toothModel);root.rotation.z=dx*.16;
  }
  addCollider(18,-58,2.4,1.8,3.5);

  function coloredGeometry(source, matrix) {
    const g = source.geometry.index ? source.geometry.toNonIndexed() : source.geometry.clone();
    g.applyMatrix4(matrix);
    const count = g.attributes.position.count, colors = new Float32Array(count * 3), original = g.attributes.color, color = source.material.color;
    for (let i = 0; i < count; i++) { colors[i * 3] = color.r * (original ? original.getX(i) : 1); colors[i * 3 + 1] = color.g * (original ? original.getY(i) : 1); colors[i * 3 + 2] = color.b * (original ? original.getZ(i) : 1); }
    for (const key of Object.keys(g.attributes)) if (key !== 'position' && key !== 'normal') g.deleteAttribute(key);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return g;
  }
  function character(color = '#408d87', capeColor = '#bd7252', scale = 1, isPlayer = false, options = {}) {
    return createCharacter(THREE, mat, { color, capeColor, scale, isPlayer, ...options });
  }
  function addTarget(target, x, z, withCharacter = false, color) {
    const y = terrainSurface(x, z);
    const item = { ...target, position: new THREE.Vector3(x, y, z), basePosition: new THREE.Vector3(x, y, z) };
    if (withCharacter) { const npc = character(color || '#567e80', target.type === 'faculty' ? '#e2bc79' : '#b88967', .97, false, {seed:target.id, role:target.type, regionId:target.regionId}); npc.position.copy(item.position); npc.rotation.y = .4; scene.add(npc); item.character = npc; }
    const marker = label(target.type === 'activity' ? '◇' : target.type === 'archive' ? '▤' : target.type === 'beacon' ? '✦' : '!', { marker: true, color: target.type === 'activity' ? '#aee3cf' : '#f4d18c' });
    marker.position.set(x, y + (withCharacter ? 3.05 : 2.4), z); scene.add(marker); item.marker = marker;
    const name = label(target.name, { color: target.type === 'faculty' ? '#ffdfa0' : '#d6eee3', scale: .68 }); name.position.set(x, y + (withCharacter ? 3.8 : 3.1), z); scene.add(name); item.labelSprite = name;
    targets.push(item); return item;
  }
  addTarget({ id: 'sera', type: 'support', regionId: 'village', name: 'Sera · Study mentor', label: 'Talk to Sera' }, -2.5, 10.8, true, '#9c8767');
  addTarget({ id: 'mira', type: 'support', regionId: 'village', name: 'Mira · Student explorer', label: 'Talk to Mira' }, 2.4, 12, true, '#5b9d89');
  addTarget({ id: 'intro', type: 'activity', regionId: 'village', name: 'Study-skills trail', label: 'Read the trail clues' }, 3.6, 8.9);
  addTarget({ id: 'archive', type: 'archive', regionId: 'village', name: 'Moulakis Archive', label: 'Open the Moulakis Archive' }, -8, 2.5);
  addTarget({ id: 'beacon', type: 'beacon', regionId: 'village', name: 'Knowledge beacon', label: 'Inspect the knowledge beacon' }, 0, 2.3);
  addTarget({ id: 'engineer-switzner', type: 'faculty', regionId: 'engineering', name: 'Nathaniel Switzner', label: 'Talk to Nathaniel Switzner' }, 24.8, -2.8, true, '#718890');
  addTarget({ id: 'engineering-support', type: 'support', regionId: 'engineering', name: 'Tavi · Workshop assistant', label: 'Talk to Tavi' }, 18.4, -2.3, true, '#ba805f');
  addTarget({ id: 'bridge', type: 'activity', regionId: 'engineering', name: 'The broken crossing', label: 'Build the bridge' }, 22, -4.3);
  addTarget({ id: 'engineer-energy', type: 'faculty', regionId: 'engineering', name: 'Ali H. A. Al-Waeli', label: 'Talk to Ali H. A. Al-Waeli' }, 43, -24.8, true, '#6c9986');
  addTarget({ id: 'energy', type: 'activity', regionId: 'engineering', name: 'Highland energy works', label: 'Restore the energy system' }, 45.5, -22);
  const otherGuides = [
    ['computing', 'Hoger Mahmud', 'commands', 'Programming sequence', 'Pip · Mechanical helper'],
    ['business', 'Fahrettin Sümer', 'market', 'The market challenge', 'Nima · Harbor merchant'],
    ['english', 'Choman Hardi', 'story', 'The missing story', 'Lale · Village reporter'],
    ['medical', 'Mohanad Nada', 'samples', 'Observation laboratory', 'Rin · Field researcher'],
    ['social', 'Robert Perrins', 'council', 'The river agreement', 'Dara · Council messenger'],
    ['mathematics', 'Dastan Khalid', 'light', 'The prism mechanism', 'Oren · Observatory keeper'],
    ['dentistry', 'Tara Ali Rasheed', 'tooth', 'The teaching model', 'Elin · Clinic assistant'],
    ['pharmacy', 'Mohammed Nawzad Sabir', 'ingredients', 'Garden formulations', 'Yara · Botanical researcher'],
  ];
  const openPlazas = {
    computing: { support: [64, 23.5] },
    medical: { activity: [-61, 23] },
    social: { faculty: [-60.5, -25], support: [-54.5, -25], activity: [-58, -23.5] },
    mathematics: { faculty: [-29, -57], support: [-21, -57.5], activity: [-25, -58] },
    dentistry: { faculty: [15, -57], support: [21, -57], activity: [18, -55] },
    pharmacy: { faculty: [55, -59.5], support: [61.5, -59.5] },
  };
  for (const [id, guide, activity, activityName, support] of otherGuides) {
    const r = regionById[id];
    const facultyAt = openPlazas[id]?.faculty || [r.x - 2.5, r.z - 3];
    const supportAt = openPlazas[id]?.support || [r.x + 3.5, r.z - 1];
    const activityAt = openPlazas[id]?.activity || [r.x, r.z - 4.5];
    addTarget({ id: `${id}-guide`, type: 'faculty', regionId: id, name: guide, label: `Talk to ${guide}` }, ...facultyAt, true, r.color);
    addTarget({ id: `${id}-support`, type: 'support', regionId: id, name: support, label: `Talk to ${support.split(' · ')[0]}` }, ...supportAt, true, '#829778');
    addTarget({ id: activity, type: 'activity', regionId: id, name: activityName, label: `Explore ${activityName.toLowerCase()}` }, ...activityAt);

  }

  for (const r of regions) {
    const placeLabel = label(r.name, { color: r.color, scale: 1.2 });
    placeLabel.position.set(r.x, terrainSurface(r.x, r.z) + 8, r.z); scene.add(placeLabel);
    placeLabel.userData.regionLabel = true; placeLabel.userData.screenWidth = 340;
  }

  // Each discovery leaves a permanent, visible light in its home region.
  const regionalLanterns = regions.filter(r => r.id !== 'village').map(r => {
    const x = r.id === 'social' ? r.x + 6 : r.x + 5, z = r.id === 'social' ? r.z + 2 : r.z - 6, y = terrainHeight(x, z);
    cylinder(.62, .85, .4, '#c2c6ac', x, y + .2, z); cylinder(.18, .27, 1.45, '#b5a578', x, y + 1.04, z);
    const crystal = mesh(new THREE.OctahedronGeometry(.48), mat(r.color, { emissive: '#000000', roughness: .3 }).clone(), x, y + 2, z);
    crystal.scale.y = 1.35; return { regionId: r.id, crystal };
  });

  // Ancient stone rings and luminous drifting motes suggest an older world.
  for (const [x, z] of [[-38, 1], [75, -21], [-5, -40], [10, 45]]) {
    const y = terrainHeight(x, z); for (const side of [-1, 1]) box(.8, 3.9, 1, '#a8b399', x + side * 1.75, y + 1.95, z); const lintel = box(4.7, .75, 1.3, '#b8c1a4', x, y + 4, z); lintel.rotation.z = .07; addCollider(x - 1.75, z, 1, 1); addCollider(x + 1.75, z, 1, 1);
  }
  const motes = new THREE.BufferGeometry(), moteP = [];
  for (let i = 0; i < 70; i++) { const x = random() * 70 - 35, z = random() * 60 - 10; moteP.push(x, terrainHeight(x, z) + 1 + random() * 3, z); }
  motes.setAttribute('position', new THREE.Float32BufferAttribute(moteP, 3)); const moteMesh = new THREE.Points(motes, new THREE.PointsMaterial({ color: '#fff1b1', size: .09, transparent: true, opacity: .75 })); scene.add(moteMesh);

  const player = character('#388c89', '#c77953', 1, true); scene.add(player);
  player.position.set(0, terrainSurface(0, 17), 17); player.rotation.y = Math.PI;
  const playerShadow = mesh(new THREE.CircleGeometry(.5, 20), mat('#293e32', { transparent: true, opacity: .2, depthWrite: false }), 0, .01, 17, scene, false); playerShadow.rotation.x = -Math.PI / 2;
  if (initialState.position && Number.isFinite(initialState.position.x)) restorePosition(initialState.position);

  // Bake static scenery into spatial color batches; animated actors remain articulated.
  function batchScenery() {
    scene.updateMatrixWorld(true);
    const dynamic = new Set([player, playerShadow, fountainOrb, fountainSpout, runeCrystal, beaconCore, halo, forgeGlow, ...bridgeBoards, ...brokenBoards, ...windmills, ...beaconShards, ...councilFlags, ...drifting.map(v => v.mesh), ...regionalLanterns.map(v => v.crystal), ...targets.filter(t => t.character).map(t => t.character)]);
    const buckets = new Map(), sources = [];
    scene.traverse(object => {
      if (!object.isMesh || object.isInstancedMesh || object === terrain || object.userData.noBatch || Array.isArray(object.material)) return;
      for (let parent = object; parent; parent = parent.parent) if (dynamic.has(parent)) return;
      const material = object.material;
      if (material.transparent || material.emissive?.getHex() || material.metalness > 0 || !material.color) return;
      const position = new THREE.Vector3(); object.getWorldPosition(position);
      const key = `${Math.floor(position.x / 28)},${Math.floor(position.z / 28)},${material.side},${object.castShadow},${material.roughness}`;
      if (!buckets.has(key)) buckets.set(key, { geometries: [], side: material.side, castShadow: object.castShadow, roughness: material.roughness });
      buckets.get(key).geometries.push(coloredGeometry(object, object.matrixWorld)); sources.push(object);
    });
    for (const bucket of buckets.values()) {
      const geometry = mergeGeometries(bucket.geometries); bucket.geometries.forEach(g => g.dispose());
      if (!geometry) continue;
      const scenery = new THREE.Mesh(geometry, mat('#ffffff', { vertexColors: true, side: bucket.side, roughness: bucket.roughness })); scenery.castShadow = bucket.castShadow; scenery.receiveShadow = true; geometry.computeBoundingSphere();
      if (geometry.boundingSphere.radius < 35) scenery.userData.sceneryDetail = true;
      scene.add(scenery);
    }
    sources.forEach(source => { source.parent?.remove(source); source.geometry.dispose(); });
  }
  batchScenery();

  function architectureFloor(x, z) { return architecture.floors.find(f => f.radius ? Math.hypot(x-f.x,z-f.z)<f.radius : Math.abs(x-f.x)<f.w/2&&Math.abs(z-f.z)<f.d/2); }
  function groundHeight(x, z) {
    const floor = architectureFloor(x,z);
    if (floor) return Math.max(terrainSurface(x,z),floor.y);
    if (Math.abs(x - 41) < 1.9 && z > 64 && z < 88) return Math.max(terrainSurface(x, z), .82);
    const d = Math.abs(z - bridgeZ);
    if (completed.has('bridge') && Math.abs(x - bridgeX) < 2.4 && d < 6.1) return Math.max(terrainHeight(x, z), 1.16);
    return terrainSurface(x, z);
  }
  function canStand(x, z) {
    if (Math.abs(x) > 111 || Math.abs(z) > 111) return false;
    const inWater = x > -109 && x < 97 && Math.abs(z - riverCenter(x)) < 4.8;
    const onPier = Math.abs(x - 41) < 1.9 && z > 64 && z < 88;
    const inLake = Math.hypot(x - 57, z - 93) < 29.5;
    if (inLake && !onPier && !architectureFloor(x,z)) return false;
    if (inWater && !(completed.has('bridge') && Math.abs(x - bridgeX) < 2.15)) return false;
    for (const c of colliders) if (Math.abs(x - c.x) < c.w && Math.abs(z - c.z) < c.d) return false;
    // Plaza props have small, solid collision footprints.
    return true;
  }
  function restorePosition(pos) {
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return;
    let x = clamp(pos.x, -110, 110), z = clamp(pos.z, -110, 110);
    if (!canStand(x, z)) {
      let found = false;
      for (let radius = 1; radius < 14 && !found; radius++) for (let direction = 0; direction < 12; direction++) {
        const nx = x + Math.cos(direction / 12 * TAU) * radius, nz = z + Math.sin(direction / 12 * TAU) * radius;
        if (canStand(nx, nz)) { x = nx; z = nz; found = true; break; }
      }
      if (!found) { x = 0; z = 17; }
    }
    player.position.set(x, groundHeight(x, z), z);
    groundVelocity = 0; jumping = false;
    callbacks.onMove?.({ x, z });
  }
  function teleport(regionId) {
    const r = regionById[regionId]; if (!r) return;
    // Arrive at the open approach to each plaza, never inside its landmark.
    let x = r.x, z = r.z - 7;
    if (regionId === 'engineering') { x = completed.has('bridge') ? 39 : 22; z = completed.has('bridge') ? -20 : 1; }
    if (regionId === 'village') { x = 0; z = 17; }
    if (regionId === 'medical') { x = -61; z = 24; }
    if (regionId === 'social') { x = -58; z = -20; }
    if (regionId === 'mathematics') { x = -26; z = -54; }
    if (regionId === 'dentistry') { x = 18; z = -51; }
    if (regionId === 'pharmacy') { x = 58; z = -59; }
    restorePosition({ x, z }); yaw = 0; pitch = .23; camera.position.copy(player.position).add(new THREE.Vector3(0, 4.2, 10.7)); updateRegion(true); updateNearest();
  }
  function setProgress(ids) {
    completed = new Set(ids || []);
    const lanterns = [['bridge', 'energy'], ['commands'], ['market'], ['story'], ['samples'], ['council'], ['light'], ['tooth'], ['ingredients']].filter(tasks => tasks.every(task => completed.has(task))).length;
    bridgeBoards.forEach(board => { board.visible = completed.has('bridge') || bridgeBoards.indexOf(board) < 6 || bridgeBoards.indexOf(board) > 11; });
    brokenBoards.forEach(board => { board.visible = !completed.has('bridge'); });
    forgeGlow.material.emissiveIntensity = completed.has('energy') ? 1.1 : 0;
    beaconShards.forEach((s, i) => { const lit = i < lanterns; s.material.color.set(lit ? '#d6f5b4' : '#99ada1'); s.material.emissive.set(lit ? '#9cdf86' : '#000000'); s.material.emissiveIntensity = lit ? .8 : 0; });
    beaconCore.material.emissiveIntensity = .25 + lanterns * .13;
    beaconLight.intensity = .5 + lanterns * .3;
    fountainSpout.visible = completed.has('intro');
    runeCrystal.material.emissiveIntensity = completed.has('commands') ? 1.3 : .15;
    const regionalTasks = { engineering: ['bridge', 'energy'], computing: ['commands'], business: ['market'], english: ['story'], medical: ['samples'], social: ['council'], mathematics: ['light'], dentistry: ['tooth'], pharmacy: ['ingredients'] };
    regionalLanterns.forEach(lantern => {
      const lit = regionalTasks[lantern.regionId].every(task => completed.has(task));
      lantern.crystal.material.emissive.set(lit ? '#96ce78' : '#000000'); lantern.crystal.material.emissiveIntensity = lit ? .9 : 0;
      lantern.crystal.userData.lit = lit;
    });
    councilFlags.forEach(flag => flag.material.color.set(completed.has('council') ? '#afc57e' : flag.userData.originalColor));
    const councilSupport = targets.find(t => t.id === 'social-support');
    if (councilSupport) {
      councilSupport.position.copy(councilSupport.basePosition);
      if (completed.has('council')) councilSupport.position.set(-57.8, terrainHeight(-57.8, -25), -25);
      councilSupport.character.position.copy(councilSupport.position);
      councilSupport.marker.position.x = councilSupport.labelSprite.position.x = councilSupport.position.x;
      councilSupport.marker.position.z = councilSupport.labelSprite.position.z = councilSupport.position.z;
    }
    targets.forEach(t => { if (t.type === 'activity') { t.marker.material.opacity = completed.has(t.id) ? .55 : 1; } });
  }
  setProgress([...completed]);
  function updateRegion(force = false) {
    let closest = regionById.village, closestD = Infinity;
    for (const r of regions) { const d = Math.hypot(player.position.x - r.x, player.position.z - r.z); if (d < closestD) { closest = r; closestD = d; } }
    // The bridge approach belongs to Engineering, even on the village bank.
    if (player.position.x > 16 && player.position.x < 31 && player.position.z < 4 && player.position.z > -16) closest = regionById.engineering;
    if (force || closest.id !== activeRegion) { activeRegion = closest.id; callbacks.onRegion?.(activeRegion); }
  }
  function publicTarget(t) { return t ? { id: t.id, type: t.type, regionId: t.regionId, name: t.name, label: t.label, completed: completed.has(t.id) } : null; }
  function clearApproach(from, to) {
    for (const c of colliders) {
      let near = 0, far = 1;
      for (const [a, b, low, high] of [[from.x, to.x, c.x - c.w, c.x + c.w], [from.z, to.z, c.z - c.d, c.z + c.d]]) {
        const delta = b - a;
        if (Math.abs(delta) < .00001) { if (a < low || a > high) { near = 2; break; } }
        else { const first = (low - a) / delta, last = (high - a) / delta; near = Math.max(near, Math.min(first, last)); far = Math.min(far, Math.max(first, last)); }
      }
      if (near <= far && near < .96 && far > .02) return false;
    }
    return true;
  }
  function updateNearest() {
    let best = null, bestD = 4.8;
    for (const t of targets) {
      const d = Math.hypot(player.position.x - t.position.x, player.position.z - t.position.z);
      if (d < bestD && clearApproach(player.position, t.position)) { bestD = d; best = t; }
      t.labelSprite.visible = d < 10;
      t.marker.visible = d < 52;
    }
    if (nearest?.id !== best?.id) { nearest = best; callbacks.onPrompt?.(publicTarget(best)); }
  }
  function jump() { if (!jumping && !paused) { groundVelocity = 7.1; jumping = true; } }
  const keyDown = event => {
    if (paused || event.defaultPrevented || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    const key = event.key.toLowerCase();
    if (event.target instanceof Element && event.target.closest('button,a,[role=button]') && [' ', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) return;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', ' ', 'q', 'r'].includes(key) && !paused) event.preventDefault();
    keys.add(key);
    if (key === ' ' && !event.repeat) jump();
    if (key === 'e' && !event.repeat && !paused && nearest) callbacks.onInteract?.(publicTarget(nearest));
  };
  const keyUp = e => keys.delete(e.key.toLowerCase());
  const blur = () => { keys.clear(); dragging = false; };
  window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', blur);
  let dragging = false, pointerX = 0, pointerY = 0;
  const pointerDown = e => { if (paused || (e.button !== 0 && e.button !== 2)) return; dragging = true; pointerX = e.clientX; pointerY = e.clientY; renderer.domElement.setPointerCapture?.(e.pointerId); };
  const pointerMove = e => { if (!dragging || paused) return; yaw -= (e.clientX - pointerX) * .006 * sensitivity; pitch = clamp(pitch + (e.clientY - pointerY) * .004 * sensitivity, .1, 1.05); pointerX = e.clientX; pointerY = e.clientY; };
  const pointerUp = () => { dragging = false; };
  const wheel = e => { if (paused) return; e.preventDefault(); distance = clamp(distance + e.deltaY * .008, 4.6, 15); };
  const contextMenu = e => e.preventDefault();
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointermove', pointerMove); renderer.domElement.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('pointercancel', pointerUp); renderer.domElement.addEventListener('lostpointercapture', pointerUp); renderer.domElement.addEventListener('wheel', wheel, { passive: false }); renderer.domElement.addEventListener('contextmenu', contextMenu);
  const resize = () => { const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  window.addEventListener('resize', resize);
  const cameraDirection = new THREE.Vector3(), labelOffset = new THREE.Vector3();
  const cameraGoal = new THREE.Vector3(), alternateCamera = new THREE.Vector3(), lookGoal = new THREE.Vector3(), move = new THREE.Vector3();
  function avoidCameraWalls(start, goal) {
    let earliest = 1;
    for (const c of colliders) {
      let near = 0, far = 1;
      const bounds = [[c.x - c.w, c.x + c.w], [c.y, c.y + c.h], [c.z - c.d, c.z + c.d]];
      for (let axis = 0; axis < 3; axis++) {
        const origin = start.getComponent(axis), delta = goal.getComponent(axis) - origin;
        if (Math.abs(delta) < .00001) { if (origin < bounds[axis][0] || origin > bounds[axis][1]) { near = 2; break; } }
        else {
          let a = (bounds[axis][0] - origin) / delta, b = (bounds[axis][1] - origin) / delta;
          if (a > b) [a, b] = [b, a];
          near = Math.max(near, a); far = Math.min(far, b);
          if (near > far) break;
        }
      }
      if (near <= far && far > 0 && near < earliest) earliest = Math.max(.02, near - .06);
    }
    if (earliest < 1) goal.lerpVectors(start, goal, earliest);
  }
  function avoidCameraTerrain(goal, raise = false) {
    // Clear the lower body as well as the head: an uphill foreground ridge can
    // otherwise hide half of an explorer while the camera itself stays above it.
    const start = player.position.clone().add(new THREE.Vector3(0,.10,0));
    if (raise) {
      let rise=0;
      for (let i=1;i<=32;i++) { const t=i/32,point=start.clone().lerp(goal,t); rise=Math.max(rise,(terrainSurface(point.x,point.z)+.075-point.y)/t); }
      goal.y+=Math.min(9,Math.max(0,rise));
    }
    for (let i=1;i<=32;i++) {
      const t=i/32, point=start.clone().lerp(goal,t);
      if (point.y < terrainSurface(point.x,point.z)+.055) {
        goal.lerpVectors(start,goal,Math.max(.08,t-.055));break;
      }
    }
  }
  camera.position.set(0, 6.5, 25); camera.lookAt(0, 2, 13);
  function getMetrics() { return { fps: Math.round(fps), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pixelRatio: renderer.getPixelRatio(), width: renderer.domElement.width, height: renderer.domElement.height, quality }; }
  function frame() {
    if (disposed) return;
    const rawDelta = clock.getDelta(), dt = Math.min(rawDelta, .045); elapsed += dt;
    fpsFrames++; fpsElapsed += rawDelta;
    if (fpsElapsed > 1) { fps = fpsFrames / fpsElapsed; fpsFrames = 0; fpsElapsed = 0; callbacks.onFrame?.(getMetrics()); }
    let moving = false, speed = 0;
    if (!paused) {
      const previousX = player.position.x, previousZ = player.position.z;
      const x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      const z = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
      moving = !!(x || z); speed = keys.has('shift') ? 9.2 : 5.5;
      if (moving) {
        move.set(x, 0, z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const nx = player.position.x + move.x * speed * dt, nz = player.position.z + move.z * speed * dt;
        if (canStand(nx, nz)) { player.position.x = nx; player.position.z = nz; }
        else { if (canStand(nx, player.position.z)) player.position.x = nx; if (canStand(player.position.x, nz)) player.position.z = nz; }
        moving = Math.hypot(player.position.x - previousX, player.position.z - previousZ) > .0001;
        const targetAngle = Math.atan2(move.x, move.z); const difference = Math.atan2(Math.sin(targetAngle - player.rotation.y), Math.cos(targetAngle - player.rotation.y)); player.rotation.y += difference * Math.min(1, dt * 12);
      }
      if (keys.has('q')) yaw += dt * 1.35;
      if (keys.has('r')) yaw -= dt * 1.35;
      groundVelocity -= 19 * dt; player.position.y += groundVelocity * dt;
      const floor = groundHeight(player.position.x, player.position.z);
      if (player.position.y <= floor) { player.position.y = floor; groundVelocity = 0; jumping = false; }
      if (elapsed - lastMoveSent > .5 && (moving || jumping)) { callbacks.onMove?.({ x: player.position.x, z: player.position.z }); lastMoveSent = elapsed; }
      updateRegion(); updateNearest();
    }
    updateCharacter(player, { elapsed, dt, moving, speed, jumping, reducedMotion });
    for (const target of targets) if (target.character) {
      const d = target.position.distanceTo(player.position);
      setCharacterDistance(target.character, d, {detailDistance:24, maxDistance:46, shadowDistance:26});
      if (d < 24) updateCharacter(target.character, {elapsed, dt, reducedMotion, lookAt:d < 4 ? player.position : null});
    }
    playerShadow.position.set(player.position.x, groundHeight(player.position.x, player.position.z) + .025, player.position.z);
    playerShadow.scale.setScalar(1 - clamp(player.position.y - groundHeight(player.position.x, player.position.z), 0, 3) * .1);
    if (!reducedMotion) {
      windmills.forEach((rotor, i) => { rotor.rotation.z -= dt * (completed.has('energy') ? .65 : .07) * (i ? 1.2 : 1); });
      drifting.forEach(item => { if (item.kind === 'book') { item.mesh.position.y = item.base + Math.sin(elapsed * 1.1 + item.offset) * .22; item.mesh.rotation.y += dt * .14; } else item.mesh.rotation.z = item.base + Math.sin(elapsed * 2) * .045; });
      beaconCore.rotation.y += dt * .3; halo.rotation.z += dt * .2;
      if (completed.has('intro')) fountainOrb.rotation.y += dt * .8;
      regionalLanterns.forEach(lantern => { if (lantern.crystal.userData.lit) lantern.crystal.rotation.y += dt * .45; });
      motes.attributes.position.array.forEach((v, i, a) => { if (i % 3 === 1) a[i] = moteP[i] + Math.sin(elapsed * .7 + i) * .3; }); motes.attributes.position.needsUpdate = true;
      targets.forEach(t => { t.marker.position.y = t.position.y + (t.character ? 3.05 : 2.4) + Math.sin(elapsed * 2 + t.position.x) * .08;  });
    }
    cameraGoal.set(player.position.x + Math.sin(yaw) * Math.cos(pitch) * distance, player.position.y + 1.6 + Math.sin(pitch) * distance, player.position.z + Math.cos(yaw) * Math.cos(pitch) * distance);
    cameraGoal.y = Math.max(cameraGoal.y, terrainHeight(cameraGoal.x, cameraGoal.z) + 1.2);
    lookGoal.copy(player.position).add(new THREE.Vector3(0, 1.5, 0));
    avoidCameraWalls(lookGoal, cameraGoal);
    avoidCameraTerrain(cameraGoal,true);
    // Nearby equipment should move the camera to a clear side, rather than
    // shortening the boom into the explorer's own head or torso.
    if (cameraGoal.distanceTo(lookGoal) < 2.8) {
      let best = cameraGoal.distanceTo(lookGoal);
      for (const offset of [-.35,.35,-.7,.7,-1.1,1.1,-1.6,1.6,Math.PI]) {
        const angle=yaw+offset;
        alternateCamera.set(player.position.x+Math.sin(angle)*Math.cos(pitch)*distance,player.position.y+1.6+Math.sin(pitch)*distance,player.position.z+Math.cos(angle)*Math.cos(pitch)*distance);
        alternateCamera.y=Math.max(alternateCamera.y,terrainSurface(alternateCamera.x,alternateCamera.z)+1.2);
        avoidCameraWalls(lookGoal,alternateCamera);avoidCameraTerrain(alternateCamera,true);
        const clearance=alternateCamera.distanceTo(lookGoal);
        if(clearance>best){best=clearance;cameraGoal.copy(alternateCamera);}
        if(best>4)break;
      }
    }
    camera.position.lerp(cameraGoal, 1 - Math.exp(-dt * 8));
    avoidCameraWalls(lookGoal, camera.position);
    avoidCameraTerrain(camera.position);
    camera.position.y = Math.max(camera.position.y, terrainSurface(camera.position.x, camera.position.z) + .45);
    camera.lookAt(lookGoal);
    sun.target.position.set(player.position.x, 0, player.position.z);
    sun.position.set(player.position.x - 38, 65, player.position.z + 25);
    scene.children.forEach(object => { if (object.userData.sceneryDetail) object.visible = object.geometry.boundingSphere.center.distanceTo(player.position) < 108; });
    camera.getWorldDirection(cameraDirection);
    const projectionHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    labelSprites.forEach(sprite => {
      const depth = labelOffset.copy(sprite.position).sub(camera.position).dot(cameraDirection), authored = sprite.userData.authoredScale;
      const cap = Math.max(.01, depth) * projectionHeight * sprite.userData.screenWidth / (container.clientHeight || innerHeight);
      const size = Math.min(authored.x,cap); sprite.scale.set(size,authored.y*size/authored.x,1);
      if (sprite.userData.regionLabel) { const d=Math.hypot(sprite.position.x-player.position.x,sprite.position.z-player.position.z); sprite.visible=d>12&&d<48; } });
    landscape.update(elapsed, reducedMotion, player.position);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  updateRegion(true); updateNearest(); requestAnimationFrame(frame);
  return {
    scene, renderer, camera, player, regions,
    debug: {
      get targets() { return targets.map(t => ({ ...publicTarget(t), x: t.position.x, y: t.position.y, z: t.position.z })); },
      get colliders() { return colliders.map(c => ({ ...c })); },
      get floors() { return architecture.floors.map(f => ({...f})); },
      canStand(x, z) { return canStand(x, z); },
      terrainHeight, terrainSurface, groundHeight, riverCenter, clearApproach,
      setCamera(options = {}) { if (Number.isFinite(options.yaw)) yaw = options.yaw; if (Number.isFinite(options.pitch)) pitch = clamp(options.pitch, .1, 1.05); if (Number.isFinite(options.distance)) distance = clamp(options.distance, 4.6, 15); },
    },
    setPaused(value) { paused = !!value; keys.clear(); dragging = false; },
    setSettings(settings = {}) {
      if (['high','balanced','medium','low'].includes(settings.quality)) quality = settings.quality;
      if (typeof settings.reducedMotion === 'boolean') reducedMotion = settings.reducedMotion;
      if (typeof settings.shadows === 'boolean') shadows = settings.shadows;
      renderer.setPixelRatio(quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, quality === 'medium' || quality === 'balanced' ? 1.15 : 1.8));
      renderer.shadowMap.enabled = shadows && quality !== 'low'; resize();
      if (settings.cameraDistance) distance = clamp(Number(settings.cameraDistance), 4.6, 15);
      const requestedSensitivity = settings.sensitivity ?? settings.cameraSensitivity;
      if (Number.isFinite(Number(requestedSensitivity))) sensitivity = clamp(Number(requestedSensitivity), .4, 2);
    },
    teleport, restorePosition, setProgress, jump, getMetrics,
    getPosition() { return { x: player.position.x, z: player.position.z }; },
    testMove({ x, z }) { const allowed = canStand(x, z); if (allowed) restorePosition({ x, z }); updateRegion(); updateNearest(); return allowed; },
    dispose() {
      disposed = true; keys.clear(); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur); window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointercancel', pointerUp); renderer.domElement.removeEventListener('lostpointercapture', pointerUp); renderer.domElement.removeEventListener('wheel', wheel); renderer.domElement.removeEventListener('contextmenu', contextMenu);
      scene.traverse(object => { object.geometry?.dispose(); if (object.material) for (const m of Array.isArray(object.material) ? object.material : [object.material]) { m.map?.dispose(); m.dispose(); } }); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
