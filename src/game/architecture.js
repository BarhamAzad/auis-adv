// Original, subject-specific procedural buildings. Coordinates keep the
// academic guides, activities and the connected walking trails in open plazas.
export function buildArchitecture({ THREE, scene, mesh, box, cylinder, sphere, mat, terrainHeight, addCollider }) {
  const TAU = Math.PI * 2;
  const palette = {
    stone: '#d8cfb3', pale: '#e9dfc6', mortar: '#aaaf9c', timber: '#765a43',
    wood: '#ac8158', bronze: '#b89255', metal: '#526c72', ink: '#354c59',
    terracotta: '#b66b51', teal: '#527f7c', blue: '#648aa4', plum: '#916e86',
    glass: '#80b4be', leaf: '#6e986c', soil: '#6d5942', paper: '#f3e5be',
  };
  const glass = mat('#99c9c9', { transparent: true, opacity: .44, roughness: .2, depthWrite: false, side: THREE.DoubleSide });
  const darkGlass = mat('#639ca8', { roughness: .3 });
  const roots = [], floors = [];
  const localGround = (x, z) => terrainHeight(x, z);

  function group(x, z, facing = 1) {
    const root = new THREE.Group(); root.position.set(x, localGround(x, z), z);
    root.scale.z = facing; scene.add(root); roots.push(root); return root;
  }
  function solid(root, x, z, w, d, h = 5) {
    addCollider(root.position.x + x, root.position.z + z * root.scale.z, w, d, h);
  }
  function block(root, w, h, d, color, x, y, z, collision = false) {
    const object = box(w, h, d, color, x, y, z, root);
    if (collision) solid(root, x, z, w, d, h); return object;
  }
  function rod(root, from, to, radius, color, segments = 10) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
    const object = cylinder(radius, radius, delta.length(), color, ...a.clone().add(b).multiplyScalar(.5).toArray(), root, segments);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return object;
  }
  function tube(root, points, radius, color, segments = 24) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    return mesh(new THREE.TubeGeometry(curve, segments, radius, 6, false), color, 0, 0, 0, root);
  }
  function extrude(root, shape, depth, color, x, y, z, bevel = 0) {
    return mesh(new THREE.ExtrudeGeometry(shape, {
      depth, steps: 1, curveSegments: 14, bevelEnabled: bevel > 0,
      bevelSegments: 2, bevelSize: bevel, bevelThickness: bevel,
    }), color, x, y, z - depth / 2, root);
  }
  function archShape(width, height) {
    const radius = width / 2, spring = height - radius, shape = new THREE.Shape();
    shape.moveTo(-radius, 0); shape.lineTo(-radius, spring);
    shape.absarc(0, spring, radius, Math.PI, 0, true);
    shape.lineTo(radius, 0); shape.closePath(); return shape;
  }
  function archTrim(root, width, height, thickness, color, x, y, z, depth = .22) {
    const radius = width / 2, spring = height - radius, shape = new THREE.Shape();
    shape.moveTo(-radius, 0); shape.lineTo(-radius, spring);
    shape.absarc(0, spring, radius, Math.PI, 0, true); shape.lineTo(radius, 0);
    shape.lineTo(radius - thickness, 0); shape.lineTo(radius - thickness, spring);
    shape.absarc(0, spring, radius - thickness, 0, Math.PI, false);
    shape.lineTo(-radius + thickness, 0); shape.closePath();
    return extrude(root, shape, depth, color, x, y, z, .035);
  }
  function archedWindow(root, width, height, x, y, z, transparent = false) {
    const pane = extrude(root, archShape(width - .16, height - .12), .025, transparent ? glass : darkGlass, x, y + .05, z);
    pane.castShadow = false;
    archTrim(root, width + .12, height + .1, .13, palette.pale, x, y, z + .06, .14);
    block(root, .065, height - .12, .08, palette.bronze, x, y + height / 2, z + .13);
    block(root, width - .12, .065, .08, palette.bronze, x, y + height * .48, z + .13);
    block(root, width + .35, .15, .34, palette.stone, x, y - .03, z + .06);
  }
  function facade(root, width, height, depth, doorWidth, doorHeight, color, windows = 2, transparent = false) {
    const r = doorWidth / 2, spring = doorHeight - r, shape = new THREE.Shape();
    // The doorway is an actual opening in the wall, rather than a painted door.
    shape.moveTo(-width / 2, 0); shape.lineTo(-r, 0); shape.lineTo(-r, spring);
    shape.absarc(0, spring, r, Math.PI, 0, true); shape.lineTo(r, 0);
    shape.lineTo(width / 2, 0); shape.lineTo(width / 2, height); shape.lineTo(-width / 2, height); shape.closePath();
    const centers = [];
    for (let side of [-1, 1]) for (let i = 0; i < windows / 2; i++) {
      const x = side * (r + (width / 2 - r) * ((i + .5) / (windows / 2)));
      const hole = new THREE.Path(), windowWidth = Math.min(1.6, (width / 2 - r) / (windows / 2) - .55), windowHeight = 1.8;
      const radius = windowWidth / 2, y = 1.1, s = y + windowHeight - radius;
      hole.moveTo(x - radius, y); hole.lineTo(x + radius, y); hole.lineTo(x + radius, s);
      hole.absarc(x, s, radius, 0, Math.PI, false); hole.closePath();
      shape.holes.push(hole); centers.push([x, y, windowWidth, windowHeight]);
    }
    extrude(root, shape, .34, color, 0, .05, depth / 2);
    const sideWidth = (width - doorWidth) / 2;
    for (const side of [-1, 1]) solid(root, side * (doorWidth / 2 + sideWidth / 2), depth / 2, sideWidth, .34, height);
    archTrim(root, doorWidth + .35, doorHeight + .19, .22, palette.pale, 0, .03, depth / 2 + .2, .24);
    centers.forEach(([x, y, w, h]) => archedWindow(root, w, h, x, y + .05, depth / 2 + .04, transparent));
  }
  function barrelRoof(root, width, depth, eave, rise, color, ribs = 4) {
    const shape = new THREE.Shape(); shape.moveTo(-width / 2, 0);
    shape.absellipse(0, 0, width / 2, rise, Math.PI, 0, true, 0); shape.lineTo(-width / 2, 0); shape.closePath();
    extrude(root, shape, depth, color, 0, eave, 0, .09);
    for (let j = 0; j < ribs; j++) {
      const z = -depth / 2 + .04 + j / Math.max(1, ribs - 1) * (depth - .08), points = [];
      for (let i = 0; i <= 18; i++) { const angle = Math.PI - i / 18 * Math.PI; points.push([Math.cos(angle) * width / 2, eave + Math.sin(angle) * rise + .05, z]); }
      tube(root, points, .07, palette.bronze, 24);
    }
    for (const side of [-1, 1]) block(root, .2, .24, depth + .3, palette.timber, side * width / 2, eave, 0);
  }
  function sawtoothRoof(root, width, depth, eave, rise, color) {
    const bay = depth / 3;
    for (let i = 0; i < 3; i++) {
      const back = -depth / 2 + i * bay, front = back + bay;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        -width / 2, eave + .1, back, width / 2, eave + .1, back,
        -width / 2, eave + rise, front, width / 2, eave + rise, front,
        -width / 2, eave, front, width / 2, eave, front,
      ], 3));
      geometry.setIndex([0, 2, 1, 1, 2, 3, 0, 4, 2, 1, 3, 5]); geometry.computeVertexNormals();
      mesh(geometry, mat(color, { side: THREE.DoubleSide }), 0, 0, 0, root);
      const pane = block(root, width - .18, rise - .16, .035, glass, 0, eave + rise / 2, front - .03); pane.castShadow = false;
      for (const x of [-width / 2, 0, width / 2]) block(root, .1, rise, .12, palette.metal, x, eave + rise / 2, front);
      rod(root, [-width / 2, eave + rise + .04, front], [width / 2, eave + rise + .04, front], .07, palette.metal);
      for (const x of [-width / 2, width / 2]) rod(root, [x, eave + .1, back], [x, eave + rise + .04, front], .07, palette.metal);
    }
  }
  function hall({ x, z, width = 10, depth = 8, height = 4.4, roof = palette.teal, wall = palette.stone, rise = 2, facing = 1, door = 2.5, windows = 4, glazing = false, roofStyle = 'vault' }) {
    const root = group(x, z, facing);
    // Foundations join the fixed interior floor to sloping terrain. Returned
    // floor surfaces let walking use the real paving top inside each hall.
    block(root, width + .4, 2.2, depth + .4, palette.mortar, 0, -1.08, 0);
    block(root, width + .5, .12, depth + .5, palette.mortar, 0, .03, 0);
    floors.push({ x, z, w: width + .5, d: depth + .5, y: root.position.y + .09 });
    block(root, .36, height, depth, wall, -width / 2, height / 2, 0, true);
    block(root, .36, height, depth, wall, width / 2, height / 2, 0, true);
    block(root, width, height, .36, wall, 0, height / 2, -depth / 2, true);
    facade(root, width, height, depth, door, 3.3, wall, windows, glazing);
    for (const side of [-1, 1]) {
      block(root, .66, .34, depth + .3, palette.mortar, side * width / 2, .19, 0);
      for (const zz of [-depth / 2, depth / 2]) {
        block(root, .52, height + .1, .6, palette.pale, side * (width / 2 - .05), height / 2, zz);
        block(root, .74, .22, .78, palette.bronze, side * (width / 2 - .05), height - .15, zz);
      }
    }
    block(root, width + .3, .28, depth + .3, palette.pale, 0, height, 0);
    if (roofStyle === 'factory') sawtoothRoof(root, width + .8, depth + .85, height + .12, rise, roof);
    else barrelRoof(root, width + .8, depth + .85, height + .12, rise, roof, 5);
    return root;
  }
  function bench(root, x, z, width = 2.8, depth = 1.25, color = palette.wood) {
    block(root, width, .18, depth, color, x, 1.1, z, true);
    for (const dx of [-width / 2 + .2, width / 2 - .2]) for (const dz of [-depth / 2 + .15, depth / 2 - .15]) block(root, .14, 1, .14, palette.timber, x + dx, .51, z + dz);
    block(root, width - .3, .12, depth - .12, palette.timber, x, .32, z);
  }
  function stool(root, x, z, color = palette.wood) {
    cylinder(.35, .4, .13, color, x, .65, z, root, 16);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; rod(root, [x + Math.cos(a) * .25, .08, z + Math.sin(a) * .25], [x + Math.cos(a) * .18, .6, z + Math.sin(a) * .18], .065, palette.timber); }
    solid(root, x, z, .65, .65, .8);
  }
  function book(root, x, y, z, color, angle = 0, size = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = angle; g.scale.setScalar(size); root.add(g);
    block(g, .52, .09, .7, color, 0, 0, 0); block(g, .46, .07, .65, palette.paper, 0, .07, 0);
    block(g, .52, .035, .7, color, 0, .12, 0); block(g, .07, .15, .7, color, -.25, .055, 0);
  }
  function bookcase(root, x, z, width = 3) {
    block(root, width, 2.6, .4, palette.timber, x, 1.4, z, true);
    for (let row = 0; row < 3; row++) {
      block(root, width + .1, .1, .7, palette.wood, x, .48 + row * .8, z + .16);
      for (let i = 0; i < 10; i++) {
        const h = .44 + (i % 3) * .09;
        const item = block(root, .17, h, .42, [palette.terracotta, palette.teal, palette.plum, palette.bronze][(row + i) % 4], x - width / 2 + .22 + i * (width - .3) / 10, .57 + row * .8 + h / 2, z + .2);
        if (i % 4 === 0) item.rotation.z = .09;
      }
    }
    block(root, width + .2, .17, .65, palette.bronze, x, 2.75, z);
  }
  function noticeboard(root, x, z, width = 2.6, height = 1.6) {
    block(root, width, height, .16, palette.timber, x, 2, z, true);
    block(root, width - .18, height - .18, .03, '#caad77', x, 2, z + .1);
    for (let i = 0; i < 5; i++) {
      const card = block(root, .5, .58, .02, i % 2 ? palette.paper : '#d9c98e', x - width * .34 + (i % 3) * width * .3, 2.2 - Math.floor(i / 3) * .63, z + .13); card.rotation.z = (i % 3 - 1) * .055;
      block(root, .32, .025, .02, '#7b8276', card.position.x, card.position.y + .12, z + .15);
    }
    for (const dx of [-width / 2 + .1, width / 2 - .1]) block(root, .12, 1.2, .12, palette.timber, x + dx, .6, z);
  }
  function flask(root, x, y, z, color = '#8eaf9c', size = 1, kind = 0) {
    const profile = kind ? [[.25, 0], [.31, .08], [.32, .4], [.17, .54], [.1, .61], [.1, .91]] : [[.19, 0], [.36, .11], [.37, .3], [.24, .48], [.1, .58], [.1, .88]];
    const points = profile.map(([r, h]) => new THREE.Vector2(r * size, h * size));
    mesh(new THREE.LatheGeometry(points, 16), color, x, y, z, root);
    cylinder(.115 * size, .115 * size, .07 * size, palette.pale, x, y + .91 * size, z, root, 12);
  }
  function microscope(root, x, z, y = 1.23, scale = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); root.add(g);
    block(g, .64, .09, .48, palette.metal, 0, .05, 0);
    tube(g, [[-.2, .12, -.13], [-.2, .55, -.2], [.02, .8, -.2], [.2, .66, -.07]], .09, palette.pale, 12);
    block(g, .46, .06, .35, palette.metal, 0, .36, .04);
    rod(g, [.18, .56, .06], [.29, .94, -.11], .08, palette.metal);
    cylinder(.11, .11, .07, palette.ink, .29, .98, -.13, g, 12);
    const focus = cylinder(.11, .11, .15, palette.bronze, -.27, .52, -.08, g, 12); focus.rotation.z = Math.PI / 2;
    block(g, .12, .02, .16, palette.glass, 0, .41, .06);
  }
  function plant(root, x, z, y = .2, scale = 1, blossom = false) {
    cylinder(.25 * scale, .18 * scale, .32 * scale, palette.terracotta, x, y + .16 * scale, z, root, 12);
    cylinder(.04 * scale, .05 * scale, .9 * scale, '#6a8659', x, y + .67 * scale, z, root, 8);
    for (let i = 0; i < 4; i++) {
      const angle = i * 2.4, leaf = sphere(.28 * scale, i % 2 ? '#7ea570' : '#94b77c', x + Math.cos(angle) * .22 * scale, y + (.53 + i * .13) * scale, z + Math.sin(angle) * .22 * scale, root, 1);
      leaf.scale.set(1.25, .25, .64); leaf.rotation.y = -angle; leaf.rotation.z = .25;
    }
    if (blossom) {
      sphere(.12 * scale, '#d7c182', x, y + 1.23 * scale, z, root, 1);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const petal = sphere(.13 * scale, '#c09abc', x + Math.cos(a) * .14 * scale, y + 1.2 * scale, z + Math.sin(a) * .14 * scale, root, 1); petal.scale.y = .45; }
    }
  }
  function emblem(root, shape, color, y, z, size = 1) {
    const plaque = cylinder(size, size, .14, palette.pale, 0, y, z, root, 32); plaque.rotation.x = Math.PI / 2;
    if (shape === 'book') {
      for (const side of [-1, 1]) { const page = block(root, size * .66, size * .75, .11, color, side * size * .32, y, z + .12); page.rotation.z = -side * .12; }
      block(root, .09, size * .8, .13, palette.bronze, 0, y, z + .2);
    } else if (shape === 'cross') {
      block(root, size * .3, size * 1.15, .12, color, 0, y, z + .12); block(root, size * 1.15, size * .3, .12, color, 0, y, z + .13);
    } else if (shape === 'network') {
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; rod(root, [0, y, z + .12], [Math.cos(a) * size * .64, y + Math.sin(a) * size * .64, z + .12], .035, color); sphere(.12, color, Math.cos(a) * size * .64, y + Math.sin(a) * size * .64, z + .18, root, 1); }
    } else if (shape === 'balance') {
      rod(root, [0, y - .55 * size, z + .15], [0, y + .55 * size, z + .15], .045, color);
      rod(root, [-size * .65, y + .28 * size, z + .15], [size * .65, y + .28 * size, z + .15], .045, color);
      for (const side of [-1, 1]) { rod(root, [side * .55 * size, y + .28 * size, z + .15], [side * .55 * size, y - .22 * size, z + .15], .025, color); const pan = mesh(new THREE.SphereGeometry(.23 * size, 12, 5, 0, TAU, Math.PI / 2, Math.PI / 2), color, side * .55 * size, y - .19 * size, z + .15, root); pan.scale.z = .3; }
    }
  }

  // Academic Preparatory Program: a vaulted study hall and open writing nook.
  const study = hall({ x: -8, z: 12.5, width: 7.5, depth: 6.6, height: 4.1, roof: palette.terracotta, rise: 1.8, windows: 2 });
  emblem(study, 'book', palette.teal, 4.9, 3.85, .65);
  bookcase(study, 0, -2.9, 4.5);
  for (const x of [-1.9, 1.9]) { bench(study, x, .3, 1.9, 1.3); book(study, x, 1.23, .3, palette.teal, .15); stool(study, x, 1.45); }
  const classroom = hall({ x: 10, z: 17, width: 6, depth: 5, height: 3.5, roof: palette.teal, rise: 1.1, facing: -1, windows: 2, door: 2 });
  noticeboard(classroom, 0, -1.5, 3.4, 1.6);
  bench(classroom, -1.6, .3, 1.6); bench(classroom, 1.6, .3, 1.6);
  const writingNook = group(-16, 6);
  for (const x of [-2, 2]) { block(writingNook, .18, 3, .18, palette.timber, x, 1.5, -1.3, true); block(writingNook, .18, 3, .18, palette.timber, x, 1.5, 1.3, true); }
  barrelRoof(writingNook, 4.6, 3.3, 3, .7, palette.paper, 3); bench(writingNook, 0, -.25, 3.2); book(writingNook, -.7, 1.22, -.25, palette.plum);

  // Engineering: glazed sawtooth workshop, trusses, fabrication tools and tests.
  const workshop = hall({ x: 30, z: -30, width: 9, depth: 9, height: 4.9, roof: '#748d84', rise: 1.45, wall: '#c8c3ad', glazing: true, windows: 4, door: 3.1, roofStyle: 'factory' });
  for (const z of [-3, 0, 3]) {
    rod(workshop, [-4.2, 4.3, z], [0, 5.8, z], .12, palette.timber); rod(workshop, [0, 5.8, z], [4.2, 4.3, z], .12, palette.timber);
    rod(workshop, [-4.2, 4.3, z], [4.2, 4.3, z], .1, palette.timber);
    for (const x of [-2.1, 0, 2.1]) rod(workshop, [x, 4.3, z], [x < 0 ? x + 2.1 : x - 2.1, 5.05, z], .07, palette.bronze);
  }
  bench(workshop, -2.6, -.3, 2.2, 2);
  const vise = block(workshop, .85, .35, .36, palette.metal, -2.6, 1.45, .22); block(workshop, 1.15, .08, .14, palette.bronze, -2.6, 1.4, .32);
  bench(workshop, 2.5, -2, 2.5, 1.4);
  const lathe = cylinder(.25, .25, 1.4, palette.metal, 2.5, 1.56, -2, workshop, 16); lathe.rotation.z = Math.PI / 2;
  for (const x of [1.75, 3.25]) block(workshop, .32, .64, .6, palette.bronze, x, 1.48, -2);
  for (const z of [-3.7, -2.9, -2.1]) block(workshop, 2.6, .16, .18, palette.wood, -2.7, .3 + (z + 3.7) * .22, z);
  const fabrication = group(19, -23);
  for (const x of [-1.5, 1.5]) block(fabrication, .6, 1.9, .75, palette.mortar, x, .95, 0, true);
  rod(fabrication, [-1.5, 1.95, 0], [1.5, 1.95, 0], .13, palette.bronze);
  for (let i = 0; i < 3; i++) { rod(fabrication, [-1.5 + i, 1.97, 0], [-1 + i, 2.65, 0], .07, palette.wood); rod(fabrication, [-1 + i, 2.65, 0], [-.5 + i, 1.97, 0], .07, palette.wood); }
  const bridgeBench = group(14.3, 0); bench(bridgeBench, 0, 0, 2.6, 1.4);
  for (let i = 0; i < 3; i++) rod(bridgeBench, [-.95, 1.28 + i * .13, -.32], [.9, 1.28 + i * .13, .36], .06, [palette.timber, palette.metal, palette.bronze][i]);
  const testing = group(49, -34); bench(testing, 0, 0, 3.4, 1.9);
  for (const x of [-1.2, 1.2]) { block(testing, .18, 2.3, .18, palette.metal, x, 2.2, 0); }
  block(testing, 2.6, .16, .35, palette.metal, 0, 3.3, 0); cylinder(.16, .2, 1, palette.bronze, 0, 2.73, 0, testing, 12); block(testing, 1.1, .12, .8, palette.metal, 0, 2.2, 0);

  // Computing and Informatics: a network hall with service racks and robotics.
  const computing = hall({ x: 60, z: 9, width: 12, depth: 7, height: 5, roof: palette.blue, rise: 1.45, wall: '#c9d9d1', door: 3, glazing: true });
  emblem(computing, 'network', palette.teal, 5.72, 4.15, .74);
  for (const x of [-4.2, 4.2]) {
    block(computing, 1.8, 3.2, 1.2, palette.ink, x, 1.8, -2.1, true);
    for (let row = 0; row < 6; row++) {
      block(computing, 1.5, .36, .12, palette.metal, x, .65 + row * .44, -1.43);
      for (let light = 0; light < 3; light++) sphere(.04, ['#9fd4be', '#ebc985', '#8cc1d2'][light], x - .53 + light * .16, .65 + row * .44, -1.34, computing, 1);
      block(computing, .45, .045, .03, '#8fabad', x + .35, .65 + row * .44, -1.33);
    }
  }
  tube(computing, [[-4.2, 3.5, -1.5], [-4.2, 4.4, -1.5], [0, 4.5, -1.5], [4.2, 4.4, -1.5], [4.2, 3.5, -1.5]], .07, palette.bronze, 18);
  bench(computing, -3.4, 1.3, 2.6); bench(computing, 3.4, 1.3, 2.6);
  for (const x of [-3.4, 3.4]) { block(computing, 1.1, .75, .1, palette.ink, x, 1.77, 1.1); block(computing, .97, .61, .035, '#8fc9c5', x, 1.78, 1.17); block(computing, .9, .04, .36, palette.metal, x, 1.23, 1.6); }
  // Antenna mast and a visible cable-connected cluster make the roof legible.
  cylinder(.11, .16, 3.7, palette.metal, 65, localGround(65, 9) + 7.4, 9, scene, 12);
  const antenna = mesh(new THREE.SphereGeometry(.85, 20, 10, 0, TAU, 0, Math.PI / 2), palette.pale, 65, localGround(65, 9) + 8, 9, scene); antenna.rotation.z = -.7;
  const robotLab = group(68.4, 19); bench(robotLab, 0, 0, 3.1, 1.8);
  cylinder(.47, .6, .3, palette.metal, 0, 1.35, 0, robotLab, 20);
  rod(robotLab, [0, 1.55, 0], [-.35, 2.7, 0], .16, '#d8b66e'); sphere(.28, palette.metal, -.35, 2.7, 0, robotLab, 2);
  rod(robotLab, [-.35, 2.7, 0], [.7, 3.12, .08], .13, '#d8b66e'); sphere(.23, palette.metal, .7, 3.12, .08, robotLab, 2);
  rod(robotLab, [.7, 3.12, .08], [1.05, 2.55, .08], .095, palette.pale);
  for (const x of [.9, 1.2]) rod(robotLab, [x, 2.6, .08], [x, 2.28, .08], .035, palette.metal);
  block(robotLab, .36, .25, .36, '#89b7b1', 1.06, 1.46, .15); noticeboard(robotLab, 0, -1.35, 2.9, 1.2);
  const programming = group(55.6, 22.8); bench(programming, 0, 0, 2.4, 1.2);
  for (let i = 0; i < 4; i++) { block(programming, .37, .13, .54, ['#89b7b1', '#d4b378', '#7c9db4', '#c68a8d'][i], -.75 + i * .5, 1.28, 0); }

  // Business Administration: a trading hall, market canopies and harbor pier.
  const trading = hall({ x: 31, z: 69, width: 13, depth: 8, height: 4.8, roof: '#b68058', rise: 1.8, wall: '#e5d0ac', facing: -1, door: 3.2 });
  emblem(trading, 'balance', palette.teal, 5.6, 4.55, .72);
  bench(trading, 0, -1.7, 5, 1.8);
  for (let i = 0; i < 5; i++) { stool(trading, -2 + i, -.2); book(trading, -2 + i, 1.23, -1.7, palette.teal, .1); }
  for (const x of [-4.5, 4.5]) { bench(trading, x, .3, 2.1); block(trading, 1.3, .8, .5, '#bb9971', x, 1.65, .3); block(trading, 1.1, .18, .6, palette.bronze, x, 2.15, .3); }
  function stall(x, z, color) {
    const g = group(x, z); bench(g, 0, 0, 2.8, 1.7);
    for (const x of [-1.5, 1.5]) { block(g, .1, 2.9, .1, palette.timber, x, 1.45, -.75, true); block(g, .1, 2.9, .1, palette.timber, x, 1.45, .75, true); }
    barrelRoof(g, 3.5, 2.15, 2.95, .48, color, 3);
    for (let i = 0; i < 3; i++) { block(g, .72, .25, .9, palette.wood, -.88 + i * .88, 1.33, 0); for (let j = 0; j < 3; j++) sphere(.16, ['#dcab6d', '#b4bc7b', '#c18470'][i], -1.08 + i * .88 + j * .2, 1.6, .06, g, 1); }
  }
  stall(20.5, 61, '#79a99d'); stall(20.5, 66.4, '#d7ac74'); stall(43.8, 59.8, '#af8493');
  const budget = group(35.2, 56.2); bench(budget, 0, 0, 2.8); book(budget, -.6, 1.23, 0, palette.plum);
  for (let i = 0; i < 4; i++) cylinder(.17, .17, .07 + i * .04, palette.bronze, .15 + i * .38, 1.27 + i * .02, .1, budget, 16);
  // Deck coordinates are also consumed by world's walkable harbor surface.
  for (let i = 0; i < 48; i++) box(3.8, .18, .5, i % 3 ? '#ad895f' : '#bb996c', 41, .73, 64.25 + i * .5);
  for (const z of [66, 70, 74, 78, 82, 86]) for (const x of [39.2, 42.8]) {
    cylinder(.1, .14, 2.2, palette.timber, x, .13, z, scene, 12); cylinder(.13, .13, .14, palette.bronze, x, 1.27, z, scene, 12);
    addCollider(x, z, .22, .22, 2.2);
  }
  for (const x of [39.2, 42.8]) { box(.1, .12, 22, palette.wood, x, 1.24, 76); addCollider(x, 76, .1, 22, 1.4); }
  const boat = group(46.4, 84);
  boat.position.y = -.59;
  const hullShape = new THREE.Shape(); hullShape.moveTo(-1.3, -.15); hullShape.quadraticCurveTo(-1.3, -.65, 0, -.7); hullShape.quadraticCurveTo(1.3, -.65, 1.3, -.15); hullShape.lineTo(.9, .18); hullShape.lineTo(-.9, .18); hullShape.closePath();
  extrude(boat, hullShape, 4.1, palette.wood, 0, .4, 0, .08);
  cylinder(.07, .09, 5.6, palette.timber, 0, 3, 0, boat, 12);
  const sailShape = new THREE.Shape(); sailShape.moveTo(.1, .1); sailShape.lineTo(.1, 4.2); sailShape.quadraticCurveTo(1.5, 2.1, 2, .2); sailShape.closePath();
  extrude(boat, sailShape, .035, palette.paper, 0, 1.1, 0); rod(boat, [0, 1.2, 0], [2, 1.2, 0], .04, palette.timber);

  // English: a reading hall, newspaper studio and translation alcove.
  const reading = hall({ x: -24, z: 63, width: 10.8, depth: 7.4, height: 4.4, roof: palette.plum, rise: 2.1, wall: '#e2d3bd', facing: -1, door: 2.7 });
  emblem(reading, 'book', palette.plum, 5.25, 4.3, .72);
  bookcase(reading, -2.8, -3.1, 3.6); bookcase(reading, 2.8, -3.1, 3.6);
  for (const x of [-2.9, 2.9]) { bench(reading, x, .5, 2.5, 1.6); book(reading, x, 1.22, .5, palette.plum, .12); stool(reading, x, 1.7); }
  const newsroom = hall({ x: -34.3, z: 56.7, width: 5.1, depth: 5, height: 3.8, roof: '#7c98a0', rise: 1, facing: -1, windows: 2, door: 1.9 });
  bench(newsroom, 0, -.6, 3.2, 1.5);
  block(newsroom, 1.1, .25, .8, palette.metal, 0, 1.35, -.6); block(newsroom, 1.1, .6, .2, palette.ink, 0, 1.72, -.92);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) cylinder(.035, .035, .025, palette.paper, -.37 + col * .105, 1.5, -.36 + row * .13, newsroom, 8);
  cylinder(.11, .11, 1.3, palette.paper, 0, 1.89, -.89, newsroom, 12).rotation.z = Math.PI / 2;
  noticeboard(newsroom, 0, -2, 3.3, 1.45);
  const translation = group(-15.3, 60);
  for (const x of [-1.8, 1.8]) block(translation, .15, 3.2, .15, palette.timber, x, 1.6, -1.15, true);
  barrelRoof(translation, 4.6, 3.2, 3.2, .65, '#b7a67d', 3); bench(translation, 0, -.3, 3.2, 1.4);
  book(translation, -.8, 1.24, -.2, palette.teal, -.3); book(translation, .8, 1.24, -.2, palette.plum, .3);
  const reports = group(-29.8, 51.1); noticeboard(reports, 0, 0, 3, 1.6);

  // Medical & Health Sciences: observation laboratory and specimen stations.
  const medical = hall({ x: -61, z: 14, width: 11, depth: 7, height: 4.5, roof: '#5d9b8c', rise: 1.5, wall: '#dbe2cc', door: 2.9, glazing: true });
  emblem(medical, 'cross', '#649988', 5.25, 4.08, .65);
  for (const x of [-3.7, 3.7]) {
    bench(medical, x, -.9, 2.8, 1.8, '#c6c6ad'); microscope(medical, x, -.8, 1.23, 1.15);
    flask(medical, x - .7, 1.22, -.8, '#b4c2a0', .6, 1);
    block(medical, 2.6, 2.7, .8, palette.pale, x, 1.42, -3, true);
    for (let row = 0; row < 3; row++) { block(medical, 2.3, .08, .82, palette.metal, x, .7 + row * .72, -2.91); for (let i = 0; i < 4; i++) flask(medical, x - .8 + i * .53, .74 + row * .72, -2.75, ['#9bb6aa', '#b3c59c', '#c4b2aa'][row], .42, 1); }
  }
  const observation = group(-68.5, 22.5); bench(observation, 0, 0, 3.1, 1.5, '#c6c6ad'); microscope(observation, -.6, 0, 1.23, 1.3);
  for (let i = 0; i < 3; i++) { const dish = cylinder(.23, .23, .07, palette.pale, .3 + i * .5, 1.24, .1, observation, 20); sphere(.12, ['#91bca0', '#c4b77d', '#a19cb9'][i], dish.position.x, 1.33, .1, observation, 1); }
  const field = group(-71.8, 15.6);
  for (const z of [-1.5, 1.5]) { block(field, 4.6, .32, 1.6, palette.wood, 0, .18, z, true); block(field, 4.3, .08, 1.32, palette.soil, 0, .38, z); for (let i = 0; i < 5; i++) plant(field, -1.7 + i * .83, z, .38, .55); }

  // Social Sciences and Law: domed civic chamber and an archival wing.
  const council = hall({ x: -65, z: -36, width: 11, depth: 8.5, height: 4.8, roof: '#788291', rise: 1.1, wall: '#ccd0c2', door: 3 });
  emblem(council, 'balance', '#7c7a9e', 5.6, 4.85, .78);
  const councilDome = mesh(new THREE.SphereGeometry(3.25, 28, 12, 0, TAU, 0, Math.PI / 2), '#889ca4', 0, 5.35, -1, council); councilDome.scale.y = .72;
  cylinder(3.3, 3.3, .2, palette.bronze, 0, 5.35, -1, council, 32);
  const roundTable = cylinder(2.15, 2.15, .15, palette.wood, 0, 1.1, -.6, council, 32); solid(council, 0, -.6, 4.3, 4.3, 1.2);
  cylinder(.24, .42, 1, palette.timber, 0, .55, -.6, council, 12);
  for (let i = 0; i < 7; i++) { const a = .15 + i / 7 * TAU; stool(council, Math.cos(a) * 2.75, -.6 + Math.sin(a) * 2.75); }
  const civicArchive = hall({ x: -48, z: -35, width: 5.6, depth: 6.2, height: 4.6, roof: palette.plum, rise: 1.15, windows: 2, door: 2 });
  bookcase(civicArchive, 0, -2.6, 4.6); bench(civicArchive, 0, -.1, 3);
  const debate = group(-58, -28);
  cylinder(4.7, 4.7, .1, '#c7ccb8', 0, .03, 0, debate, 36);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * .58 + i / 4 * Math.PI * .42;
    const seat = block(debate, 1.1, .5, .5, palette.wood, Math.cos(a) * 3.65, .32, -Math.sin(a) * 3.65); seat.rotation.y = a + Math.PI / 2;
    // Accurate axis-aligned envelope of each rotated seat.
    const angle = seat.rotation.y; solid(debate, seat.position.x, seat.position.z, Math.abs(Math.cos(angle)) * 1.1 + Math.abs(Math.sin(angle)) * .5, Math.abs(Math.sin(angle)) * 1.1 + Math.abs(Math.cos(angle)) * .5, .6);
  }
  const lectern = group(-63.5, -24.5); block(lectern, .8, 1.1, .65, palette.wood, 0, .55, 0, true); const pageTop = block(lectern, 1.1, .12, .9, palette.timber, 0, 1.15, 0); pageTop.rotation.x = .16; book(lectern, 0, 1.27, 0, palette.plum);

  // Mathematics and Natural Sciences: a walk-in ring observatory with dome.
  const observatory = group(-30, -74), radius = 4.6, wallHeight = 3.2, openingAngle = .37;
  cylinder(radius + .25, radius + .35, 2.2, palette.mortar, 0, -1.08, 0, observatory, 40);
  cylinder(radius + .2, radius + .3, .12, palette.mortar, 0, .04, 0, observatory, 40);
  floors.push({ x: -30, z: -74, radius: radius + .2, y: observatory.position.y + .1 });
  mesh(new THREE.CylinderGeometry(radius, radius, wallHeight, 40, 1, true, openingAngle, TAU - openingAngle * 2), mat('#c3cbbd', { side: THREE.DoubleSide }), 0, wallHeight / 2, 0, observatory);
  for (let i = 0; i < 22; i++) {
    const a0 = openingAngle + i / 22 * (TAU - openingAngle * 2), a1 = openingAngle + (i + 1) / 22 * (TAU - openingAngle * 2);
    const a = (a0 + a1) / 2, length = (a1 - a0) * radius;
    solid(observatory, Math.sin(a) * radius, Math.cos(a) * radius, Math.abs(Math.cos(a)) * length + Math.abs(Math.sin(a)) * .25, Math.abs(Math.sin(a)) * length + Math.abs(Math.cos(a)) * .25, wallHeight);
  }
  archTrim(observatory, 3.65, 3.3, .23, palette.pale, 0, .02, radius - .15, .38);
  cylinder(radius + .12, radius + .12, .22, palette.bronze, 0, wallHeight, 0, observatory, 40);
  // A split hemisphere forms the observing shutter and exposes the telescope.
  const slit = .18;
  mesh(new THREE.SphereGeometry(radius + .08, 36, 14, Math.PI / 2 + slit, TAU - slit * 2, 0, Math.PI / 2), mat('#638399', { side: THREE.DoubleSide }), 0, wallHeight + .12, 0, observatory);
  for (const phi of [Math.PI / 2 - slit, Math.PI / 2 + slit]) {
    const points = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; points.push([-Math.cos(phi) * Math.sin(a) * (radius + .13), wallHeight + .12 + Math.cos(a) * (radius + .13), Math.sin(phi) * Math.sin(a) * (radius + .13)]); } tube(observatory, points, .065, palette.bronze, 22);
  }
  cylinder(.28, .5, 3, palette.metal, 0, 1.5, -.8, observatory, 16);
  const telescope = new THREE.Group(); telescope.position.set(0, 3, -.8); telescope.rotation.x = .82; observatory.add(telescope);
  cylinder(.48, .55, 3.5, palette.pale, 0, .8, 0, telescope, 24); cylinder(.58, .58, .17, palette.bronze, 0, 2.57, 0, telescope, 24); cylinder(.43, .43, .025, darkGlass, 0, 2.67, 0, telescope, 24);
  rod(observatory, [-1.15, .08, -.8], [0, 1.5, -.8], .12, palette.metal); rod(observatory, [1.15, .08, -.8], [0, 1.5, -.8], .12, palette.metal); solid(observatory, 0, -.8, 1.5, 1.5, 3);
  const experiment = hall({ x: -17.5, z: -75, width: 5.8, depth: 6.3, height: 3.9, roof: '#7e9ead', rise: 1.2, windows: 2, door: 2 });
  bench(experiment, 0, -.9, 3.8); microscope(experiment, -1, -.9, 1.23, .9); flask(experiment, 1, 1.24, -.9, '#9ac5c3', .85);
  // Geometric instruments flank the open prism mechanism without filling it.
  for (const [x, z, type] of [[-35, -64.5, 0], [-18.7, -59.2, 1], [-25, -61.3, 2]]) {
    const y = localGround(x, z); cylinder(.7, .9, .24, palette.mortar, x, y + .12, z, scene, 20);
    const geometry = type === 0 ? new THREE.DodecahedronGeometry(.75) : type === 1 ? new THREE.TorusKnotGeometry(.44, .09, 40, 6, 2, 3) : new THREE.OctahedronGeometry(.8);
    const object = mesh(geometry, ['#91b4c6', '#c2af84', '#a4bbaa'][type], x, y + 1.13, z); object.rotation.y = .4; addCollider(x, z, 1.3, 1.3, 2);
  }

  // Dentistry: a glazed teaching clinic and recognizable simulation chairs.
  const clinic = hall({ x: 16, z: -72, width: 11, depth: 8, height: 4.5, roof: '#93afa6', rise: 1.9, wall: '#ece6d0', glazing: true, door: 2.8 });
  emblem(clinic, 'cross', '#81a69c', 5.45, 4.56, .7);
  function dentalChair(root, x, z) {
    cylinder(.45, .6, .22, palette.metal, x, .18, z, root, 20); block(root, .35, .7, .35, palette.pale, x, .57, z);
    block(root, .74, .18, 1.13, '#8cb7ad', x, 1, z);
    const back = block(root, .74, 1.2, .18, '#8cb7ad', x, 1.57, z - .46); back.rotation.x = -.27;
    const headrest = sphere(.27, '#9bc5b8', x, 2.21, z - .62, root, 2); headrest.scale.set(1.15, .55, .5);
    for (const dx of [-.49, .49]) { rod(root, [x + dx, 1.1, z - .28], [x + dx, 1.15, z + .45], .065, palette.pale); }
    rod(root, [x + 1, .1, z - .7], [x + 1, 2.7, z - .7], .07, palette.metal);
    rod(root, [x + 1, 2.7, z - .7], [x + .2, 3, z + .02], .06, palette.metal);
    const lamp = sphere(.33, palette.pale, x + .2, 2.91, z + .02, root, 2); lamp.scale.set(1.15, .3, .65);
    block(root, .65, .08, .75, palette.pale, x + 1, 1.3, z + .55); solid(root, x, z, 1.25, 1.75, 2.5);
  }
  dentalChair(clinic, -3.1, -.3); dentalChair(clinic, 3.1, -.3);
  bench(clinic, 0, -2.9, 3.6, 1.1, '#ccd7ca'); flask(clinic, -1.2, 1.23, -2.9, '#c4d4b6', .55, 1);
  for (let i = 0; i < 4; i++) {
    const molar = sphere(.2, palette.paper, -.6 + i * .43, 1.5, -2.85, clinic, 2); molar.scale.y = 1.3;
    cylinder(.15, .2, .08, '#99b4a5', -.6 + i * .43, 1.27, -2.85, clinic, 16);
  }
  const simulation = group(26.2, -63.8); bench(simulation, 0, 0, 2.8, 1.7, '#ccd7ca'); dentalChair(simulation, 0, 2.3);
  const jaw = mesh(new THREE.TorusGeometry(.65, .16, 10, 20, Math.PI * 1.4), '#ca9b97', 0, 1.42, 0, simulation); jaw.rotation.x = Math.PI / 2; jaw.rotation.z = Math.PI * .8;
  for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI * 1.4 + Math.PI * .8; const t = sphere(.12, palette.paper, Math.cos(a) * .65, 1.56, Math.sin(a) * .65, simulation, 1); t.scale.y = 1.4; }

  // Pharmacy: formulation laboratory, connecting canopy and botanical house.
  const pharmacy = hall({ x: 49, z: -66, width: 8, depth: 8, height: 4.6, roof: '#8c83a3', rise: 1.5, wall: '#dcd7c8', door: 2.5, glazing: true });
  emblem(pharmacy, 'cross', '#8b7ea3', 5.35, 4.65, .65);
  for (const x of [-2.5, 2.5]) { bench(pharmacy, x, -.6, 2.2, 1.9, '#c4c7bb'); for (let i = 0; i < 3; i++) flask(pharmacy, x - .6 + i * .6, 1.23, -.6, ['#b3b4cf', '#a5bd98', '#cbbd8e'][i], .68 + (i % 2) * .25, i % 2); }
  const condenser = group(49.5, -68.3);
  rod(condenser, [-.9, 1.2, 0], [-.9, 2.8, 0], .04, palette.metal); flask(condenser, -.45, 1.3, 0, '#a6bac4', 1.1);
  tube(condenser, [[-.45, 2.2, 0], [-.45, 2.9, 0], [.35, 2.9, 0], [.8, 2.2, 0], [.8, 1.8, 0]], .065, '#c6d7ce', 18); flask(condenser, .8, 1.25, 0, '#c1bcaa', .65, 1);
  const canopy = group(57.2, -66.4);
  for (const x of [-2.3, 2.3]) block(canopy, .14, 3.25, .14, palette.metal, x, 1.63, -1.1, true);
  barrelRoof(canopy, 5.5, 3.2, 3.3, .5, '#adbcb4', 3);
  const greenhouse = group(66, -68), greenhouseWidth = 9, greenhouseDepth = 11, greenhouseEave = 3.3, greenhouseRise = 2.3;
  block(greenhouse, greenhouseWidth + .4, 2.2, greenhouseDepth + .4, palette.mortar, 0, -1.08, 0);
  block(greenhouse, greenhouseWidth + .5, .12, greenhouseDepth + .5, palette.mortar, 0, .03, 0);
  floors.push({ x: 66, z: -68, w: greenhouseWidth + .5, d: greenhouseDepth + .5, y: greenhouse.position.y + .09 });
  for (const side of [-1, 1]) {
    block(greenhouse, .28, .65, greenhouseDepth, palette.stone, side * greenhouseWidth / 2, .34, 0, true);
    for (let i = 0; i < 5; i++) block(greenhouse, .12, 3.3, .12, palette.metal, side * greenhouseWidth / 2, 1.65, -5.5 + i * 2.75);
    const pane = block(greenhouse, .04, 2.7, greenhouseDepth - .15, glass, side * greenhouseWidth / 2, 1.98, 0); pane.castShadow = false;
  }
  // Curved roof panes use one coherent transparent surface and visible ribs.
  const roofPositions = [], roofIndices = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI - i / 24 * Math.PI, x = Math.cos(a) * greenhouseWidth / 2, y = greenhouseEave + Math.sin(a) * greenhouseRise;
    roofPositions.push(x, y, -greenhouseDepth / 2, x, y, greenhouseDepth / 2);
    if (i < 24) { const j = i * 2; roofIndices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
  }
  const roofGeometry = new THREE.BufferGeometry(); roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roofPositions, 3)); roofGeometry.setIndex(roofIndices); roofGeometry.computeVertexNormals();
  mesh(roofGeometry, glass, 0, 0, 0, greenhouse, false);
  for (let j = 0; j < 5; j++) {
    const points = []; for (let i = 0; i <= 18; i++) { const a = Math.PI - i / 18 * Math.PI; points.push([Math.cos(a) * greenhouseWidth / 2, greenhouseEave + Math.sin(a) * greenhouseRise, -greenhouseDepth / 2 + j * greenhouseDepth / 4]); }
    tube(greenhouse, points, .07, palette.metal, 22);
  }
  for (const x of [-3, -1.5, 0, 1.5, 3]) {
    const y = greenhouseEave + Math.sqrt(1 - (x / 4.5) ** 2) * greenhouseRise;
    block(greenhouse, .055, .055, greenhouseDepth, palette.metal, x, y, 0);
  }
  block(greenhouse, greenhouseWidth, .62, .3, palette.stone, 0, .32, -greenhouseDepth / 2, true);
  const backPane = block(greenhouse, greenhouseWidth - .2, 2.7, .04, glass, 0, 1.97, -greenhouseDepth / 2); backPane.castShadow = false;
  facade(greenhouse, greenhouseWidth, greenhouseEave, greenhouseDepth, 2.5, 3.05, palette.stone, 4, true);
  for (const x of [-2.7, 2.7]) {
    bench(greenhouse, x, 0, 2.1, 6.8, '#9b8763');
    for (let i = 0; i < 7; i++) plant(greenhouse, x + (i % 2 ? -.45 : .45), -2.8 + i * .92, 1.22, .75 + (i % 3) * .1, i % 2 === 0);
  }
  const formulation = group(53.5, -56.2); bench(formulation, 0, 0, 2.6, 1.4, '#c1c1ac');
  for (let i = 0; i < 4; i++) flask(formulation, -.9 + i * .6, 1.23, 0, ['#b1b5d0', '#a2b890', '#c8b77c', '#9dbbb9'][i], .6, i % 2);
  const garden = group(67.5, -50);
  for (const z of [-1.9, 1.9]) {
    block(garden, 5.8, .38, 2.1, palette.stone, 0, .2, z, true); block(garden, 5.4, .06, 1.75, palette.soil, 0, .44, z);
    for (let i = 0; i < 6; i++) plant(garden, -2.15 + i * .86, z, .45, .8, true);
  }

  return { roots, floors, pier: { x: 41, zMin: 64, zMax: 88, width: 3.8, height: .82 } };
}
