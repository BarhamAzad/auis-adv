import * as THREE from 'three';

// Original sculpted landforms and instanced botanical silhouettes, in world metres.
export function buildLandscape({ scene, mesh, mat, terrainHeight, regions, riverCenter, random, addCollider }) {
  const dummy = new THREE.Object3D();
  let lastDetailX = Infinity, lastDetailZ = Infinity;
  const instances = (geometry, material, entries, shadow = true) => {
    const batch = new THREE.InstancedMesh(geometry, material, entries.length);
    entries.forEach((e, i) => {
      dummy.position.set(...e.p); dummy.rotation.set(...(e.rot || [0, 0, 0])); dummy.scale.set(...(e.s || [1, 1, 1])); dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix); if (e.c) batch.setColorAt(i, new THREE.Color(e.c));
    });
    batch.castShadow = shadow; batch.receiveShadow = true; batch.computeBoundingSphere(); scene.add(batch); return batch;
  };
  // Each distant massif has several ridgelines and shoulders, rather than a
  // single cone. The shared height field joins the peaks into eroded landforms.
  for (let i = 0; i < 20; i++) {
    const angle = i / 20 * Math.PI * 2, radius = 146 + random() * 12;
    const height = 25 + random() * 27, width = 21 + random() * 15;
    const cx = Math.cos(angle) * radius, cz = Math.sin(angle) * radius;
    const positions = [], colors = [], indices = [], n = 32;
    const base = new THREE.Color(i % 2 ? '#78978f' : '#819ca5'), snow = new THREE.Color('#e2e4d4');
    const peaks = [[-.36,-.08,.76],[.13,.04,1],[.51,.13,.59]];
    for (let row = 0; row <= n; row++) for (let col = 0; col <= n; col++) {
      const u = col / n * 2 - 1, v = row / n * 2 - 1;
      let elevation = 0;
      for (const [pu,pv,scale] of peaks) {
        const d = Math.hypot((u-pu) / (.58+scale*.13), (v-pv) / .72);
        elevation = Math.max(elevation, Math.max(0,1-Math.pow(d,1.28)) * height * scale);
      }
      const erosion = Math.sin(u*18+i)*Math.cos(v*13-u*7) * 1.7;
      const h = -3 + Math.max(0,elevation + erosion * Math.min(1,elevation/6));
      positions.push(cx + (u*Math.cos(angle)-v*Math.sin(angle)) * width*1.35, h, cz+(u*Math.sin(angle)+v*Math.cos(angle))*width);
      const c = base.clone().lerp(snow,THREE.MathUtils.smoothstep(h/height,.68,.94));
      c.multiplyScalar(.93 + .045*Math.sin(h*.87+u*4) + .05*Math.cos(u*9-v*7));colors.push(c.r,c.g,c.b);
      if(row<n&&col<n){const k=row*(n+1)+col;indices.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
    }
    const geometry = new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    mesh(geometry,mat('#ffffff',{vertexColors:true}),0,0,0,scene,false);
  }

  const trunks = [], branches = [], leaves = [], pine = [], roots = [], rocks = [];
  const trees = [];
  for (let i = 0; i < 330; i++) {
    const x = random() * 216 - 108, z = random() * 216 - 108;
    if (regions.some(r => Math.hypot(r.x - x, r.z - z) < (r.id === 'english' ? 13 : 19)) || Math.hypot(x, z) < 25 || Math.abs(z - riverCenter(x)) < 9 || Math.hypot(x - 57, z - 93) < 34) continue;
    trees.push({x,z,h:3.8 + random() * 3.6, r:1.9 + random() * 1.1, pine:z < -40 && random() < .5});
  }
  for (const [x,z] of [[-15,19],[-18,7],[15,24],[17,14],[-16,-4],[51,-5],[-35,54],[-15,68]]) trees.push({x,z,h:5.4,r:2.5});
  const trunkGeometry = new THREE.CylinderGeometry(.18,.34,1,10,3);
  const p = trunkGeometry.attributes.position;
  for (let i=0;i<p.count;i++) p.setX(i,p.getX(i)+.06*Math.sin(p.getY(i)*4));
  trunkGeometry.computeVertexNormals();
  trees.forEach((t,i)=>{
    addCollider(t.x,t.z,.55,.55,t.h*.85);
    const y=terrainHeight(t.x,t.z), lean=Math.sin(i*3)*.065;
    trunks.push({p:[t.x,y+t.h*.42,t.z],s:[1,t.h*.84,1],rot:[lean, i*.67,0]});
    for(let j=0;j<3;j++) {
      const a=j/3*Math.PI*2+i, bx=t.x+Math.cos(a)*t.r*.4, bz=t.z+Math.sin(a)*t.r*.4;
      branches.push({p:[bx,y+t.h*.68,bz],s:[.48,t.h*.42,.48],rot:[Math.cos(a)*.65,0,-Math.sin(a)*.65]});
      roots.push({p:[t.x+Math.cos(a)*.25,y+.15,t.z+Math.sin(a)*.25],s:[.65,.8,.65],rot:[Math.cos(a)*1.1,0,-Math.sin(a)*1.1]});
    }
    if(t.pine){for(let j=0;j<4;j++)pine.push({p:[t.x,y+t.h*.55+j*t.h*.18,t.z],s:[t.r*(1-j*.2),t.h*.4,t.r*(1-j*.2)],c:['#4c897c','#63978a','#6fa397'][j%3]});}
    else for(let j=0;j<7;j++) {
      const a=j/7*Math.PI*2+i*.4, rr=j===6?0:t.r*.55;
      leaves.push({p:[t.x+Math.cos(a)*rr,y+t.h+(j===6?.65:Math.sin(j*2)*.25),t.z+Math.sin(a)*rr],s:[t.r*.7,t.r*.62,t.r*.65],rot:[0,a,.12*Math.sin(i+j)],c:(i%7===0?['#b7ad70','#c5ba7b','#a5b27a']:['#6ba17b','#82b184','#599875','#8bb88b'])[j%(i%7===0?3:4)]});
    }
  });
  instances(trunkGeometry,mat('#8a725c'),trunks); instances(new THREE.CylinderGeometry(.18,.29,1,8),mat('#8a725c'),branches);
  instances(new THREE.CylinderGeometry(.12,.3,1,7),mat('#8a725c'),roots);
  const foliageHigh = instances(new THREE.IcosahedronGeometry(1,2),mat('#ffffff'),leaves);
  const foliageFar = instances(new THREE.IcosahedronGeometry(1,1),mat('#ffffff'),leaves,false);
  function updateFoliage(position) {
    if (!position || Math.hypot(position.x - lastDetailX, position.z - lastDetailZ) < 3) return;
    lastDetailX = position.x; lastDetailZ = position.z;
    let high = 0, far = 0;
    for (const entry of leaves) {
      const batch = Math.hypot(entry.p[0]-position.x, entry.p[2]-position.z) < 32 ? foliageHigh : foliageFar;
      const index = batch === foliageHigh ? high++ : far++;
      dummy.position.set(...entry.p); dummy.rotation.set(...entry.rot); dummy.scale.set(...entry.s); dummy.updateMatrix();
      batch.setMatrixAt(index,dummy.matrix); batch.setColorAt(index,new THREE.Color(entry.c));
    }
    foliageHigh.count=high; foliageFar.count=far;
    for (const batch of [foliageHigh,foliageFar]) { batch.instanceMatrix.needsUpdate=true; batch.instanceColor.needsUpdate=true; batch.computeBoundingSphere(); }
  }
  instances(new THREE.ConeGeometry(1,1,16,3),mat('#ffffff'),pine);
  const rockGeometry = new THREE.IcosahedronGeometry(1,2), rp=rockGeometry.attributes.position;
  for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),d=1+.14*Math.sin(x*6+z*3)*Math.cos(y*7);rp.setXYZ(i,x*d,y*d,z*d);}rockGeometry.computeVertexNormals();
  for(let i=0;i<105;i++){
    const x=random()*212-106,z=random()*212-106;
    if(regions.some(r=>Math.hypot(x-r.x,z-r.z)<19)||Math.hypot(x,z)<23||Math.hypot(x-57,z-93)<33)continue;
    const bank=Math.abs(z-riverCenter(x))<9, size=bank?.45+random()*.7:.65+random()*1.5;
    rocks.push({p:[x,terrainHeight(x,z)+size*.18,z],s:[size*1.35,size*.72,size],rot:[.1,random()*6,.13],c:bank?'#a6b8af':['#9daa9d','#a5b29d','#b2b7a1'][i%3]});
  }
  instances(rockGeometry,mat('#ffffff'),rocks);

  // Reed clumps, small meadow blades and flowers use three instanced draw calls.
  const reeds=[], grass=[], petals=[];
  for(let i=0;i<130;i++) {
    const x=-100+random()*190,z=riverCenter(x)+(i%2?1:-1)*(5.6+random()*1.7);
    if(Math.abs(x-22)<5)continue;
    for(let j=0;j<4;j++)reeds.push({p:[x+j*.11,terrainHeight(x+j*.11,z)+.46,z],s:[.6,.8+random()*.45,.6],rot:[.13*Math.sin(i),0,.08*Math.cos(i)]});
  }
  for(let i=0;i<1250;i++) {
    const x=random()*190-95,z=random()*180-90;
    if(Math.abs(z-riverCenter(x))<9||regions.some(r=>Math.hypot(x-r.x,z-r.z)<19)||Math.hypot(x,z)<23||Math.hypot(x-57,z-93)<33)continue;
    const y=terrainHeight(x,z);
    grass.push({p:[x,y+.23,z],s:[.7+random()*.5,.6+random()*.8,.7],rot:[0,random()*6,.1],c:i%3?'#7da16c':'#a7b57b'});
    if(i%3===0)petals.push({p:[x,y+.48,z],s:[1,.6,1],c:['#efcda4','#d8b2d1','#c0d4e0','#f1daa0'][i%4]});
  }
  const blade=new THREE.ConeGeometry(.075,.6,4); instances(blade,mat('#ffffff'),grass,false);
  instances(new THREE.CylinderGeometry(.026,.045,1,5),mat('#8aa579'),reeds,false);
  instances(new THREE.SphereGeometry(.12,8,5),mat('#ffffff'),petals,false);

  const waterTime={value:0};
  const water=mat('#72bfc3',{metalness:.12,roughness:.28,transparent:true,opacity:.94,side:THREE.DoubleSide});
  water.onBeforeCompile=shader=>{
    shader.uniforms.landscapeTime=waterTime;
    shader.vertexShader='uniform float landscapeTime; varying vec3 waterWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y += sin(position.x * 1.1 + landscapeTime * 1.3) * .024 + cos(position.z * 2.2 - landscapeTime) * .018; waterWorld = position;');
    shader.fragmentShader='uniform float landscapeTime; varying vec3 waterWorld;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat ripple=pow(max(0.0,sin(waterWorld.x*2.1+waterWorld.z*3.7+landscapeTime*.9)),16.0); diffuseColor.rgb += vec3(.12,.16,.14)*ripple;');
  };
  water.customProgramCacheKey=()=> 'auis-ripple-water-v2';
  const vertices=[],indices=[],steps=256,breadth=8;
  for(let i=0;i<=steps;i++){
    const x=-109+i*206/steps;
    for(let j=0;j<=breadth;j++){
      vertices.push(x,-.18,riverCenter(x)-4.15+j*8.3/breadth);
      if(i<steps&&j<breadth){const k=i*(breadth+1)+j;indices.push(k,k+1,k+breadth+1,k+1,k+breadth+2,k+breadth+1);}
    }
  }
  const river=new THREE.BufferGeometry();river.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));river.setIndex(indices);river.computeVertexNormals();mesh(river,water,0,0,0,scene,false);
  const lake=mesh(new THREE.CircleGeometry(31,96),water,57,-.59,93,scene,false);lake.rotation.x=-Math.PI/2;
  return { update(time, reducedMotion, position){waterTime.value=reducedMotion?0:time;updateFoliage(position);} };
}
