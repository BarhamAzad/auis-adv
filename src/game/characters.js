import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Original storybook models, authored from curves and shaped surfaces. Faculty
// avatars are invented characters, never reconstructions of named people.
const TAU = Math.PI * 2;
const SKINS = ['#e5b493', '#bd8965', '#8f6046', '#d6a378', '#a77658', '#edc6a8'];
const HAIRS = ['#352e2d', '#4b3630', '#76634e', '#a5a099', '#534741', '#283632'];
function seedNumber(value) {
  let seed = 2166136261;
  for (const char of String(value || 'explorer')) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return seed >>> 0;
}

/** Feet sit at local y=0; the head reaches approximately 2.23 units.
 * All little details are merged into eleven independently articulated batches.
 * The caller owns the shared material cache and the returned geometries.
 */
export function createCharacter(THREE, mat, options = {}) {
  const { color = '#408d87', capeColor = '#bd7252', scale = 1, isPlayer = false, seed = 'explorer', role = 'support', regionId = 'village' } = options;
  const hash = seedNumber(seed), variant = isPlayer ? 0 : hash % 6;
  const skin = isPlayer ? '#d8a582' : SKINS[(hash >>> 3) % SKINS.length];
  const hair = isPlayer ? '#45352f' : HAIRS[(hash >>> 7) % HAIRS.length];
  const cloth = new THREE.Color(color), trim = '#ead49c', leather = '#775841', darkLeather = '#4b3c34';
  const shirt = cloth.clone().lerp(new THREE.Color('#f6e5c4'), .25).getStyle();
  const trousers = cloth.clone().lerp(new THREE.Color('#2f403c'), .68).getStyle();
  const shadowSkin = new THREE.Color(skin).lerp(new THREE.Color('#915e47'), .28).getStyle();
  const costume = isPlayer ? 'explorer' : role === 'faculty' ? (['medical', 'dentistry', 'pharmacy'].includes(regionId) ? 'lab' : 'scholar') : variant % 3 === 0 ? 'apron' : 'vest';
  const idle = isPlayer ? 'explorer' : ['english', 'social', 'business'].includes(regionId) || variant === 1 ? 'reading' : ['medical', 'pharmacy', 'dentistry'].includes(regionId) ? 'inspecting' : regionId === 'computing' || regionId === 'engineering' ? 'working' : 'guiding';
  const actor = new THREE.Group(); actor.name = `original-character-${seed}`; actor.scale.setScalar(scale);
  const root = new THREE.Group(); actor.add(root);
  const torso = new THREE.Group(); root.add(torso);
  const head = new THREE.Group(); head.position.set(0, 1.78, 0); root.add(head);
  const cape = new THREE.Group(); cape.position.set(0, 1.55, -.10); root.add(cape);
  const segments = [torso, head, cape], arms = [], legs = [], elbows = [], knees = [];
  const shaded = mat('#ffffff', { vertexColors: true, roughness: .86 });

  function add(geometry, shade, position = [0, 0, 0], size = [1, 1, 1], parent = torso, rotation = [0, 0, 0]) {
    const m = new THREE.Mesh(geometry, mat(shade)); m.position.set(...position); m.scale.set(...size); m.rotation.set(...rotation); parent.add(m); return m;
  }
  function ellipsoid(shade, at, size, parent = torso) { const tiny = Math.max(...size) < .085; return add(new THREE.SphereGeometry(1, tiny ? 10 : 14, tiny ? 6 : 10), shade, at, size, parent); }
  function rounded(shade, at, size, radius = .025, parent = torso, rotation = [0, 0, 0]) {
    return add(new RoundedBoxGeometry(size[0], size[1], size[2], radius < .025 ? 1 : 2, radius), shade, at, [1, 1, 1], parent, rotation);
  }
  function cylinder(shade, at, radiusTop, radiusBottom, height, parent = torso, rotation = [0, 0, 0], sides = 16) {
    return add(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides), shade, at, [1, 1, 1], parent, rotation);
  }
  function line(shade, points, radius = .012, parent = torso, tubularSegments = 10) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return add(new THREE.TubeGeometry(curve, tubularSegments, radius, 6, false), shade, [0, 0, 0], [1, 1, 1], parent);
  }
  function bodySurface() {
    const profile = [[.86, .235, .155], [.91, .265, .17], [1.02, .255, .175], [1.12, .275, .19], [1.30, .315, .205], [1.46, .335, .19], [1.55, .29, .16], [1.60, .17, .13]];
    const p = [], indices = [], n = 24;
    for (const [y, rx, rz] of profile) for (let i = 0; i <= n; i++) { const a = i / n * TAU; p.push(Math.cos(a) * rx, y, Math.sin(a) * rz); }
    for (let j = 0; j < profile.length - 1; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + n + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(indices); g.computeVertexNormals();
    return g;
  }
  add(bodySurface(), costume === 'lab' ? '#e8e5d5' : shirt);
  // A tapered pelvis, layered coat panels, collar, belt and stitched edges give
  // the torso a clothed silhouette rather than an elongated primitive.
  ellipsoid(trousers, [0, .88, 0], [.265, .16, .16]);
  cylinder(skin, [0, 1.65, 0], .105, .12, .19);
  for (const side of [-1, 1]) {
    const panel = new THREE.Shape();
    panel.moveTo(side * .055, 1.55); panel.lineTo(side * .22, 1.57);
    panel.quadraticCurveTo(side * .36, 1.45, side * .30, 1.18);
    panel.lineTo(side * .28, .88); panel.quadraticCurveTo(side * .15, .84, side * .035, .94); panel.lineTo(side * .055, 1.55);
    const panelShade = costume === 'lab' ? '#f7f1df' : costume === 'scholar' ? color : costume === 'apron' ? leather : color;
    add(new THREE.ExtrudeGeometry(panel, { depth: .045, bevelEnabled: true, bevelSize: .018, bevelThickness: .012, bevelSegments: 2, steps: 1 }), panelShade, [0, 0, .155]);
    line(trim, [[side * .07, 1.55, .23], [side * .055, 1.25, .25], [side * .055, 1.02, .215]], .009);
    rounded(costume === 'lab' ? '#d4d8c6' : leather, [side * .205, 1.06, .228], [.13, .115, .025], .016);
    // Folded triangular lapels follow the neck instead of sitting as boxes.
    const collar = new THREE.Shape(); collar.moveTo(0, 0); collar.lineTo(side * .13, -.12); collar.lineTo(side * .14, .025); collar.closePath();
    add(new THREE.ExtrudeGeometry(collar, { depth: .018, bevelEnabled: true, bevelThickness: .009, bevelSize: .008, bevelSegments: 1 }), costume === 'lab' ? '#f7f4e4' : trim, [side * .04, 1.57, .16]);
  }
  for (let i = 0; i < 4; i++) ellipsoid(trim, [.004, 1.42 - i * .105, .241], [.018, .018, .014]);
  cylinder(darkLeather, [0, .966, 0], .277, .276, .063).scale.z = .69;
  rounded('#d6b775', [0, .966, .212], [.105, .078, .024], .013);
  rounded(darkLeather, [0, .966, .23], [.047, .04, .009], .007);
  if (costume === 'lab') {
    rounded('#89b6ab', [.16, 1.40, .231], [.075, .09, .01], .008);
    line('#699487', [[-.10, 1.57, .21], [-.07, 1.39, .246], [0, 1.33, .246], [.07, 1.39, .246], [.10, 1.57, .21]], .013);
    ellipsoid('#bfc8c3', [0, 1.31, .252], [.033, .034, .01]);
  } else if (costume === 'scholar') {
    line(capeColor, [[-.13, 1.60, .1], [0, 1.54, .25], [.14, 1.60, .1]], .044);
    rounded(capeColor, [.10, 1.38, .24], [.09, .28, .024], .017, torso, [0, 0, -.10]);
  } else if (costume === 'apron') {
    rounded('#b79669', [0, 1.16, .23], [.33, .42, .025], .042);
    rounded('#8c694b', [0, 1.05, .25], [.20, .09, .025], .015);
    line('#dfc68e', [[-.12, 1.52, .195], [-.11, 1.36, .24], [.11, 1.36, .24], [.12, 1.52, .195]], .015);
  }

  // Rounded travel pack, padded lid, rolled blanket, buckles and shoulder
  // straps. These are baked into the torso, so they add no individual draws.
  if (isPlayer || costume === 'vest') {
    rounded(leather, [0, 1.28, -.335], [.43, .46, .22], .065);
    rounded('#9c7950', [0, 1.40, -.457], [.45, .22, .036], .038);
    rounded('#b59665', [0, 1.18, -.458], [.28, .13, .04], .023);
    for (const side of [-1, 1]) {
      line('#c2a16a', [[side * .17, 1.02, .19], [side * .21, 1.42, .20], [side * .22, 1.59, .03], [side * .20, 1.51, -.27], [side * .17, 1.18, -.46]], .024);
      rounded('#d0b478', [side * .17, 1.31, -.487], [.065, .055, .025], .009);
      rounded('#5e493a', [side * .17, 1.31, -.504], [.027, .022, .004], .004);
    }
    cylinder('#82978a', [0, 1.585, -.36], .072, .072, .49, torso, [0, 0, Math.PI / 2]);
    for (const side of [-1, 1]) {
      cylinder('#526e64', [side * .249, 1.585, -.36], .059, .059, .012, torso, [0, 0, Math.PI / 2]);
      cylinder('#b49a6a', [side * .17, 1.585, -.36], .077, .077, .04, torso, [0, 0, Math.PI / 2]);
    }
    ellipsoid('#648d92', [.29, 1.21, -.28], [.075, .12, .068]);
    cylinder('#bba276', [.29, 1.345, -.28], .033, .042, .07);
    rounded('#af754f', [-.30, 1.00, -.055], [.105, .17, .10], .02, torso, [0, 0, -.1]);
  }

  // The face has a continuous cheek/jaw shape, inset eyelids, a projecting nose,
  // ears, brows, lips and individually shaped hairstyles.
  add(new THREE.SphereGeometry(1, 24, 16), skin, [0, .135, .005], [.265, .285, .245], head);
  ellipsoid(skin, [0, -.015, .067], [.205, .155, .194], head);
  for (const side of [-1, 1]) {
    ellipsoid(skin, [side * .265, .135, -.005], [.069, .093, .057], head);
    ellipsoid(shadowSkin, [side * .293, .133, .025], [.025, .050, .019], head);
    ellipsoid(skin, [side * .12, .09, .208], [.077, .048, .020], head);
    ellipsoid(shadowSkin, [side * .092, .186, .227], [.068, .037, .018], head);
    ellipsoid('#f4ead5', [side * .092, .185, .238], [.054, .025, .013], head);
    ellipsoid('#39382f', [side * .092, .185, .250], [.018, .024, .008], head);
    ellipsoid('#fff9dc', [side * .095 - .004, .192, .256], [.006, .006, .0025], head);
    line(hair, [[side * .044, .242, .224], [side * .094, .252, .23], [side * .144, .239, .209]], .014, head, 8);
  }
  ellipsoid(skin, [0, .125, .247], [.043, .065, .059], head);
  ellipsoid(shadowSkin, [-.024, .092, .283], [.016, .010, .007], head);
  ellipsoid(shadowSkin, [.024, .092, .283], [.016, .010, .007], head);
  line('#99604d', [[-.048, .025, .239], [0, .017, .249], [.048, .027, .239]], .008, head, 9);
  ellipsoid('#e9bd9c', [0, -.036, .207], [.052, .024, .018], head);
  const cap = new THREE.SphereGeometry(.279, 24, 16, 0, TAU, 0, Math.PI * .60);
  add(cap, hair, [0, .188, -.022], [1.04, 1.0, .95], head);
  const hairHighlight = new THREE.Color(hair).lerp(new THREE.Color('#c0a17b'), .16).getStyle();
  if (variant === 0 || variant === 3) {
    for (let i = 0; i < 4; i++) {
      line(i % 2 ? hairHighlight : hair, [[-.21 + i * .054, .31, .17], [-.08 + i * .048, .411, .10], [.12 + i * .028, .36, .01]], .039 - i * .002, head, 10);
    }
    for (const side of [-1, 1]) ellipsoid(hair, [side * .237, .166, -.021], [.039, .116, .086], head);
  } else if (variant === 1 || variant === 4) {
    for (const side of [-1, 1]) {
      ellipsoid(hair, [side * .239, .098, -.056], [.080, .205, .102], head);
      line(hairHighlight, [[side * .21, .28, .10], [side * .269, .13, -.02], [side * .232, -.052, -.09]], .017, head);
    }
    ellipsoid(hair, [0, .255, -.262], [.125, .125, .12], head);
    cylinder(trim, [0, .254, -.286], .127, .127, .025, head, [Math.PI / 2, 0, 0]);
  } else {
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU;
      ellipsoid(i % 3 ? hair : hairHighlight, [Math.cos(a) * .20, .33 + (i % 2) * .018, Math.sin(a) * .16 - .02], [.095, .079, .091], head);
    }
    ellipsoid(hair, [0, .415, -.04], [.17, .06, .17], head);
  }
  if (isPlayer) {
    const band = new THREE.TorusGeometry(.279, .021, 7, 32); band.rotateX(Math.PI / 2);
    add(band, trim, [0, .29, -.011], [1.04, 1, .98], head);
    ellipsoid('#82c6b1', [-.277, .289, .05], [.051, .047, .041], head);
  } else if (role === 'faculty' || variant === 2) {
    for (const side of [-1, 1]) {
      const lens = new THREE.TorusGeometry(.068, .009, 6, 20);
      add(lens, '#66594c', [side * .091, .19, .258], [1, .78, 1], head);
      line('#66594c', [[side * .15, .19, .259], [side * .22, .205, .19], [side * .265, .20, .01]], .009, head);
    }
    line('#66594c', [[-.025, .195, .258], [0, .206, .272], [.025, .195, .258]], .007, head, 6);
  }
  if (!isPlayer && variant === 3) {
    // A short invented beard follows the jaw, with the mouth kept visible.
    line(hair, [[-.17, .005, .17], [-.105, -.073, .199], [0, -.091, .211], [.105, -.073, .199], [.17, .005, .17]], .039, head, 14);
  }

  // A folded, scalloped cloth surface replaces the conical cape. A second
  // reversed face makes the single batched cloth visible from either side.
  function clothGeometry() {
    const positions = [], indices = [], rows = 9, cols = 12;
    for (let j = 0; j <= rows; j++) {
      const v = j / rows, w = .265 + v * .195;
      for (let i = 0; i <= cols; i++) {
        const u = i / cols, edge = Math.abs(u - .5) * 2;
        positions.push((u * 2 - 1) * w, -v * (costume === 'scholar' ? .82 : .73) + (j === rows ? .035 * Math.cos(u * Math.PI * 6) : 0), -.105 - v * .18 - Math.sin(u * Math.PI * 6) * .026 * v + edge * .015);
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + cols + 1; indices.push(a, a + 1, b, b, a + 1, b + 1, a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); const doubled = g.toNonIndexed(); g.dispose(); doubled.computeVertexNormals();
    return doubled;
  }
  if (costume === 'lab' || costume === 'apron') {
    // Short rear coat-tail, still using the same articulated cloth segment.
    add(clothGeometry(), costume === 'lab' ? '#e8e5d5' : '#8c694b', [0, -.28, .06], [.7, .5, .6], cape);
  } else {
    add(clothGeometry(), capeColor, [0, 0, 0], [1, 1, 1], cape);
    line(trim, [[-.27, -.015, -.102], [0, .045, -.10], [.27, -.015, -.102]], .018, cape, 14);
    for (const side of [-1, 1]) ellipsoid(trim, [side * .20, 1.51, .19], [.033, .027, .017]);
  }

  for (const [index, side] of [-1, 1].entries()) {
    const arm = new THREE.Group(); arm.position.set(side * .343, 1.48, 0); root.add(arm); arms.push(arm); segments.push(arm);
    ellipsoid(costume === 'lab' ? '#eee9dc' : color, [side * .017, -.048, 0], [.144, .169, .143], arm);
    const sleeveShade = costume === 'lab' ? '#eee9dc' : shirt;
    cylinder(sleeveShade, [side * .025, -.20, 0], .103, .088, .31, arm);
    ellipsoid(sleeveShade, [side * .025, -.33, 0], [.086, .086, .085], arm);
    const elbow = new THREE.Group(); elbow.position.set(side * .025, -.345, 0); arm.add(elbow); elbows.push(elbow); segments.push(elbow);
    cylinder(sleeveShade, [0, -.12, 0], .079, .062, .25, elbow);
    cylinder(costume === 'lab' ? '#c6d5c4' : trim, [0, -.246, 0], .070, .069, .047, elbow);
    ellipsoid(skin, [0, -.303, .009], [.061, .073, .045], elbow);
    // Four separated fingers and an opposed thumb, curved at the knuckles.
    for (let finger = 0; finger < 4; finger++) {
      const fx = (finger - 1.5) * .028, length = finger === 0 || finger === 3 ? .066 : .082;
      ellipsoid(skin, [fx, -.362, .012], [.014, length / 2, .017], elbow);
      ellipsoid(skin, [fx, -.385 - length / 4, .022], [.013, .024, .016], elbow);
      line(shadowSkin, [[fx - .007, -.367, .028], [fx + .007, -.367, .028]], .0026, elbow, 2);
    }
    const thumb = ellipsoid(skin, [-side * .060, -.324, .028], [.023, .050, .023], elbow); thumb.rotation.z = side * .50;
    const leg = new THREE.Group(); leg.position.set(side * .155, .91, 0); root.add(leg); legs.push(leg); segments.push(leg);
    cylinder(trousers, [0, -.19, 0], .129, .095, .385, leg);
    ellipsoid(trousers, [0, -.035, 0], [.128, .12, .13], leg);
    ellipsoid(trousers, [0, -.381, .012], [.098, .093, .105], leg);
    line('#83918a', [[side * .096, -.08, .068], [side * .086, -.20, .063], [side * .071, -.35, .053]], .006, leg);
    const knee = new THREE.Group(); knee.position.set(0, -.39, 0); leg.add(knee); knees.push(knee); segments.push(knee);
    cylinder(trousers, [0, -.15, -.006], .09, .074, .30, knee);
    // Rounded shafts, shaped ankle and forward toe, stitched soles and laces.
    cylinder(leather, [0, -.304, .005], .091, .085, .22, knee);
    rounded(darkLeather, [0, -.436, .065], [.212, .168, .35], .056, knee);
    rounded('#3d3530', [0, -.502, .062], [.221, .036, .36], .015, knee);
    rounded('#b09362', [0, -.416, .132], [.11, .06, .08], .017, knee, [-.25, 0, 0]);
    for (let lace = 0; lace < 3; lace++) line(trim, [[-.052, -.373 - lace * .016, .113 + lace * .022], [.052, -.373 - lace * .016, .113 + lace * .022]], .005, knee, 2);
    cylinder(trim, [0, -.239, .005], .094, .094, .025, knee);
  }

  if (!isPlayer && idle === 'reading') {
    const forearm = elbows[0];
    rounded('#756455', [0, -.342, .113], [.29, .31, .048], .013, forearm, [-.20, 0, -.10]);
    rounded('#eadfbc', [0, -.339, .144], [.262, .280, .024], .008, forearm, [-.20, 0, -.10]);
    line('#b5a47d', [[-.063, -.285, .160], [.068, -.285, .148]], .004, forearm, 2);
    line('#b5a47d', [[-.064, -.313, .166], [.068, -.313, .154]], .004, forearm, 2);
    cylinder('#deb45f', [.013, -.36, .069], .009, .009, .20, elbows[1], [0, 0, -.45], 8);
  } else if (!isPlayer && idle === 'inspecting') {
    cylinder('#82bcb1', [0, -.345, .09], .036, .036, .15, elbows[0]);
    cylinder('#dfc684', [0, -.254, .09], .038, .038, .034, elbows[0]);
    cylinder('#bc7e78', [0, -.37, .091], .031, .031, .074, elbows[0]);
  } else if (!isPlayer && idle === 'working') {
    rounded('#597c82', [0, -.34, .08], [.17, .21, .035], .023, elbows[0]);
    rounded('#bad3b5', [0, -.335, .103], [.125, .15, .007], .012, elbows[0]);
    for (let i = 0; i < 3; i++) rounded(i % 2 ? '#c5a769' : '#699d95', [.06 - i * .047, -.30, .108], [.026, .026, .005], .004, elbows[0]);
  }

  // One shared opaque material and one mesh per independently moving segment.
  // Children are kept intact, so elbow and knee pivots survive geometry baking.
  const proxyParts = [];
  for (const segment of segments) {
    segment.updateMatrix(); const geometries = [];
    for (const child of [...segment.children]) {
      if (!child.isMesh) continue;
      child.updateMatrix();
      const parameters = child.geometry.parameters || {};
      let proxyGeometry;
      if (child.geometry.type === 'SphereGeometry') proxyGeometry = new THREE.SphereGeometry(parameters.radius, 8, 6, parameters.phiStart, parameters.phiLength, parameters.thetaStart, parameters.thetaLength);
      else if (child.geometry.type === 'CylinderGeometry') proxyGeometry = new THREE.CylinderGeometry(parameters.radiusTop, parameters.radiusBottom, parameters.height, 8, 1, parameters.openEnded);
      else if (child.geometry.type === 'TubeGeometry') { if (parameters.radius >= .016) proxyGeometry = new THREE.TubeGeometry(parameters.path, 5, parameters.radius, 4, false); }
      else if (child.geometry.type === 'TorusGeometry') proxyGeometry = new THREE.TorusGeometry(parameters.radius, parameters.tube, 4, 12);
      else if (child.geometry instanceof RoundedBoxGeometry) {
        child.geometry.computeBoundingBox(); const bounds = child.geometry.boundingBox, size = bounds.getSize(new THREE.Vector3());
        proxyGeometry = new RoundedBoxGeometry(size.x, size.y, size.z, 1, Math.min(.03, size.x / 3, size.y / 3, size.z / 3));
      } else proxyGeometry = child.geometry.clone();
      if (proxyGeometry) proxyParts.push({ geometry: proxyGeometry, segment, matrix: child.matrix.clone(), shade: child.material.color.clone() });
      const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
      geometry.applyMatrix4(child.matrix);
      const shade = child.material.color, count = geometry.attributes.position.count, colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) { colors[i * 3] = shade.r; colors[i * 3 + 1] = shade.g; colors[i * 3 + 2] = shade.b; }
      for (const attribute of Object.keys(geometry.attributes)) if (!['position', 'normal'].includes(attribute)) geometry.deleteAttribute(attribute);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometries.push(geometry);
      segment.remove(child); child.geometry.dispose();
    }
    if (!geometries.length) continue;
    const merged = mergeGeometries(geometries, false); geometries.forEach(geometry => geometry.dispose());
    merged.computeBoundingSphere(); const batch = new THREE.Mesh(merged, shaded); batch.castShadow = true; batch.receiveShadow = true; segment.add(batch);
  }
  actor.userData = { root, torso, head, arms, legs, elbows, knees, cape, originalAppearance: true, fictionalAdaptation: true, isPlayer, idle, variant, seed: hash, animation: { stride: 0, pace: 0, motion: 0 } };
  updateCharacter(actor, { elapsed: 0, dt: 1, moving: false, reducedMotion: false });
  actor.updateWorldMatrix(true, true);
  const inverse = actor.matrixWorld.clone().invert(), proxyGeometries = [];
  for (const part of proxyParts) {
    const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    part.geometry.dispose();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, part.segment.matrixWorld).multiply(part.matrix));
    const count = geometry.attributes.position.count, colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { colors[i * 3] = part.shade.r; colors[i * 3 + 1] = part.shade.g; colors[i * 3 + 2] = part.shade.b; }
    for (const attribute of Object.keys(geometry.attributes)) if (!['position', 'normal'].includes(attribute)) geometry.deleteAttribute(attribute);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); proxyGeometries.push(geometry);
  }
  const proxyGeometry = mergeGeometries(proxyGeometries, false); proxyGeometries.forEach(geometry => geometry.dispose());
  const proxy = new THREE.Mesh(proxyGeometry, shaded); proxy.visible = false; proxy.castShadow = false; proxy.receiveShadow = true; actor.add(proxy); actor.userData.proxy = proxy;
  return actor;
}

/** Smooth articulated gait and useful regional NPC idles. Call only for visible
 * NPCs; lookAt can be a world-space Vector3 when a conversation is active. */
export function updateCharacter(actor, { elapsed = 0, dt = .016, moving = false, speed = 0, jumping = false, reducedMotion = false, lookAt = null } = {}) {
  const data = actor.userData;
  if (!data?.animation) return;
  const { arms, legs, elbows, knees, head, root, cape, torso, animation, isPlayer, idle, seed } = data;
  const phase = (seed % 1024) * .031, t = elapsed + phase;
  const blend = 1 - Math.exp(-Math.max(0, dt) * 11);
  const movement = moving && !jumping ? 1 : 0;
  animation.motion += (movement - animation.motion) * blend;
  animation.pace += ((speed > 6 ? 13.2 : 9.4) - animation.pace) * blend;
  animation.stride += Math.max(0, dt) * animation.pace * animation.motion;
  const stride = Math.sin(animation.stride), run = speed > 6 ? 1 : 0;
  const breathe = reducedMotion ? 0 : Math.sin(t * 1.7) * .007;
  torso.scale.y = 1 + breathe * .38;
  torso.rotation.z = reducedMotion ? 0 : Math.sin(animation.stride) * .018 * animation.motion;
  head.rotation.x = 0; head.rotation.y = reducedMotion ? 0 : Math.sin(t * .42) * (isPlayer ? .025 : .105);
  head.rotation.z = reducedMotion ? 0 : Math.sin(t * .71) * .016;
  root.position.y = Math.abs(Math.cos(animation.stride * 2)) * .027 * animation.motion;
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1, step = stride * side, amount = animation.motion;
    legs[i].rotation.set(step * (.44 + run * .12) * amount, 0, 0);
    knees[i].rotation.x = Math.max(0, -step) * (.72 + run * .25) * amount;
    arms[i].rotation.set(-step * (.40 + run * .12) * amount, 0, side * -.07);
    elbows[i].rotation.x = -.12 - run * .40 * amount - Math.max(0, step) * .20 * amount;
  }
  if (jumping) {
    root.position.y = .02;
    arms[0].rotation.x = arms[1].rotation.x = -.57;
    elbows[0].rotation.x = elbows[1].rotation.x = -.48;
    legs[0].rotation.x = -.20; legs[1].rotation.x = .25;
    knees[0].rotation.x = .38; knees[1].rotation.x = .63;
    head.rotation.x = -.04;
  } else if (!isPlayer && animation.motion < .1) {
    const motion = reducedMotion ? 0 : Math.sin(t * .83);
    if (idle === 'reading' || idle === 'working') {
      arms[0].rotation.x = -.48; arms[0].rotation.z = .42;
      elbows[0].rotation.x = -1.05;
      arms[1].rotation.x = -.44 + motion * .025; arms[1].rotation.z = -.29;
      elbows[1].rotation.x = -1.10 + (reducedMotion ? 0 : Math.sin(t * 2.2) * .045);
      head.rotation.x = .15; head.rotation.y = Math.sin(t * .6) * (reducedMotion ? 0 : .045);
    } else if (idle === 'inspecting') {
      arms[0].rotation.x = -.80 + motion * .025; elbows[0].rotation.x = -.91;
      arms[0].rotation.z = .24;
      arms[1].rotation.x = -.15; elbows[1].rotation.x = -.31;
      head.rotation.x = .085; head.rotation.y = -.12 + motion * .025;
    } else {
      arms[1].rotation.x = -.27 + motion * .07; arms[1].rotation.z = -.12;
      elbows[1].rotation.x = -.38 + motion * .06;
      arms[0].rotation.x = .025; elbows[0].rotation.x = -.16;
      head.rotation.y = motion * .14;
    }
  }
  cape.rotation.x = -.035 - animation.motion * .17 + (reducedMotion ? 0 : Math.sin(t * 2.7) * .022);
  cape.rotation.z = reducedMotion ? 0 : Math.sin(t * 1.9) * .014;
  if (lookAt) {
    const angle = Math.atan2(lookAt.x - actor.position.x, lookAt.z - actor.position.z) - actor.rotation.y;
    const local = Math.atan2(Math.sin(angle), Math.cos(angle));
    head.rotation.y = Math.max(-.50, Math.min(.50, local));
    head.rotation.x = -.03;
  }
}

/** Full articulation nearby, a single simplified batch at middle distance. */
export function setCharacterDistance(actor, distance, { detailDistance = 26, maxDistance = 46, shadowDistance = 26 } = {}) {
  const { root, proxy, isPlayer } = actor.userData;
  if (isPlayer) return;
  actor.visible = distance <= maxDistance;
  root.visible = distance <= detailDistance;
  if (proxy) proxy.visible = distance > detailDistance && distance <= maxDistance;
  root.traverse(object => { if (object.isMesh) object.castShadow = distance <= shadowDistance; });
}
