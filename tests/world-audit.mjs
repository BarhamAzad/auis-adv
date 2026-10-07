import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

// Scenario setup uses read-only world observability and deliberate placement;
// movement, jumping, pausing and pointer gestures use real browser input.
const url = process.env.GAME_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const checks = [], failures = [], errors = [], measurements = {};
page.on('pageerror', error => errors.push(error.message));
async function check(name, operation) {
  try { await operation(); checks.push(name); console.log('PASS', name); }
  catch (error) { failures.push({ name, error: error.message }); console.log('FAIL', name, error.message); }
  finally {
    for (const key of ['w','a','s','d','q','r','Shift']) await page.keyboard.up(key);
    await page.evaluate(() => window.__AUIS_GAME__?.closeModal());
    await page.setViewportSize({width:1440,height:900});
    await page.locator('#world canvas').focus();
  }
}
const position = () => page.evaluate(() => window.__AUIS_GAME__.world.player.position.toArray());
async function place(x, z, progress) {
  return page.evaluate(({ x, z, progress }) => {
    const w = window.__AUIS_GAME__.world;
    if (progress) w.setProgress(progress);
    w.debug.setCamera({ yaw: 0, pitch: .23, distance: 10.7 });
    const allowed = w.testMove({ x, z });
    w.setPaused(false); return allowed;
  }, { x, z, progress });
}
async function observe(duration) {
  return page.evaluate(duration => new Promise(resolve => {
    const samples = [], start = performance.now();
    function sample() {
      const w = window.__AUIS_GAME__.world, p = w.player.position, c = w.camera.position;
      samples.push({ p: p.toArray(), c: c.toArray(), allowed: w.debug.canStand(p.x, p.z), floor: w.debug.groundHeight(p.x, p.z), cameraFloor: w.debug.terrainSurface(c.x, c.z), cameraHits: w.debug.colliders.filter(b => Math.abs(c.x - b.x) < b.w - .001 && Math.abs(c.z - b.z) < b.d - .001 && c.y > b.y && c.y < b.y + b.h).map(b => ({x:b.x,z:b.z})) });
      if (performance.now() - start < duration) requestAnimationFrame(sample); else resolve(samples);
    }
    requestAnimationFrame(sample);
  }), duration);
}
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__AUIS_GAME__?.world?.debug);
await page.locator('#begin').click();
await page.locator('#world canvas').focus();
await page.waitForTimeout(400);

await check('Keyboard diagonal movement slides along solid walls without penetration', async () => {
  const setup = await page.evaluate(() => {
    const w = window.__AUIS_GAME__.world;
    for (const c of w.debug.colliders) {
      if (Math.hypot(c.x, c.z) > 28 || c.w < 2 || c.d < .25 || c.h < 2) continue;
      const start = { x:c.x-c.w+1.0, z:c.z+c.d+.13 };
      if (w.debug.canStand(start.x,start.z) && w.debug.canStand(start.x+2.7,start.z)) return { c, start };
    }
    return null;
  });
  assert.ok(setup, 'An accessible village wall exists');
  assert.ok(await place(setup.start.x, setup.start.z));
  const a = await position();
  await page.keyboard.down('w'); await page.keyboard.down('d');
  const samples = await observe(540);
  await page.keyboard.up('w'); await page.keyboard.up('d');
  const b = await position(); measurements.wallSliding = { start:a, end:b, samples:samples.length };
  assert.ok(samples.every(s => s.allowed), 'Every actual movement frame remains outside colliders');
  assert.ok(b[0]-a[0] > 1.2, 'Tangential sliding displacement: '+(b[0]-a[0]));
  assert.ok(Math.abs(b[2]-a[2]) < .28, 'Blocked inward displacement: '+(b[2]-a[2]));
});

await check('Running jump cannot cross the unrepaired river, repaired bridge crosses on foot', async () => {
  const center = await page.evaluate(() => window.__AUIS_GAME__.world.debug.riverCenter(22));
  assert.ok(await place(22, center+5.2, []));
  const start = await position();
  await page.keyboard.down('Shift'); await page.keyboard.down('w'); await page.keyboard.press('Space');
  const blocked = await observe(1350);
  await page.keyboard.up('w'); await page.keyboard.up('Shift');
  const stopped = await position();
  assert.ok(Math.max(...blocked.map(s=>s.p[1])) > start[1]+.35, 'Actual keyboard jump lifted the actor');
  assert.ok(blocked.every(s=>s.allowed), 'Airborne movement never enters forbidden river cells');
  assert.ok(stopped[2] >= center+4.77, 'Stopped on near bank at '+stopped[2]);
  assert.ok(await place(22,center+5.2,['bridge']));
  await page.keyboard.down('w');
  const crossing = await observe(1950);
  await page.keyboard.up('w');
  const crossed = await position();
  assert.ok(crossed[2] < center-4.8, 'Keyboard walking reached opposite bank: '+crossed[2]);
  assert.ok(crossing.every(s=>s.allowed), 'Bridge route stays walkable');
  assert.ok(crossing.filter(s=>Math.abs(s.p[2]-center)<4.5).every(s=>s.p[1]>=1.15), 'Actor rests on the repaired visible deck');
  measurements.river = { center, start, stopped, crossed, jumpPeak: Math.max(...blocked.map(s=>s.p[1])) };
});

await check('Terrain sampling agrees with the rendered triangle surface and walking ground', async () => {
  const report = await page.evaluate(() => {
    const w=window.__AUIS_GAME__.world;
    const terrain=w.scene.children.find(m=>m.isMesh&&m.geometry.parameters?.width===245&&m.geometry.parameters?.widthSegments===144);
    if(!terrain) throw Error('Rendered terrain geometry not found');
    const a=terrain.geometry.attributes.position, cells=144, step=245/cells, errors=[], groundErrors=[];
    for(let i=0;i<260;i++){
      const x=-104+((i*37)%211)+.193, z=-104+((i*67)%211)+.317;
      const ix=Math.floor((x+122.5)/step), iz=Math.floor((z+122.5)/step), x0=ix*step-122.5,z0=iz*step-122.5,fx=(x-x0)/step,fz=(z-z0)/step;
      const base=iz*(cells+1)+ix, h00=a.getY(base),h10=a.getY(base+1),h01=a.getY(base+cells+1),h11=a.getY(base+cells+2);
      const rendered=fx+fz<=1?h00+(h10-h00)*fx+(h01-h00)*fz:h11+(h10-h11)*(1-fz)+(h01-h11)*(1-fx);
      errors.push(Math.abs(rendered-w.debug.terrainSurface(x,z)));
      const deck=Math.abs(x-22)<2.4&&Math.abs(z-w.debug.riverCenter(22))<6.1;
      const pier=Math.abs(x-41)<1.9&&z>64&&z<88;
      const floor=w.debug.floors.some(f=>f.radius?Math.hypot(x-f.x,z-f.z)<f.radius:Math.abs(x-f.x)<f.w/2&&Math.abs(z-f.z)<f.d/2);
      if(!deck&&!pier&&!floor)groundErrors.push(Math.abs(w.debug.groundHeight(x,z)-rendered));
    }
    return {points:errors.length,maxSurfaceError:Math.max(...errors),maxGroundError:Math.max(...groundErrors)};
  });
  measurements.terrain=report;
  assert.ok(report.maxSurfaceError<.00004, JSON.stringify(report));
  assert.ok(report.maxGroundError<.00004, JSON.stringify(report));
});

await check('Camera remains outside architecture and above rendered terrain during real orbit', async () => {
  const regions=await page.evaluate(()=>window.__AUIS_GAME__.world.regions.map(r=>r.id));
  const results=[];
  for(const id of regions){
    await page.evaluate(id=>window.__AUIS_GAME__.world.teleport(id),id);
    await page.keyboard.down('q'); const forward=await observe(480); await page.keyboard.up('q');
    await page.keyboard.down('r'); const reverse=await observe(480); await page.keyboard.up('r');
    const samples=[...forward,...reverse];
    results.push({region:id,samples:samples.length,collisions:samples.filter(s=>s.cameraHits.length).map(s=>({camera:s.c,hits:s.cameraHits})),minimumClearance:Math.min(...samples.map(s=>s.c[1]-s.cameraFloor))});
  }
  measurements.camera=results;
  assert.ok(results.every(r=>r.collisions.length===0),JSON.stringify(results.filter(r=>r.collisions.length)));
  assert.ok(results.every(r=>r.minimumClearance>=.44),JSON.stringify(results.filter(r=>r.minimumClearance<.44)));
  await place(0,19,['bridge']); await page.waitForTimeout(350);
  const before=await page.evaluate(()=>window.__AUIS_GAME__.world.camera.position.toArray());
  await page.mouse.move(720,530); await page.mouse.down(); await page.mouse.move(850,565,{steps:8}); await page.mouse.up();
  const samples=await observe(400), after=await page.evaluate(()=>window.__AUIS_GAME__.world.camera.position.toArray());
  assert.ok(Math.hypot(...after.map((v,i)=>v-before[i]))>.8,'Real pointer dragging changes the orbit');
  assert.ok(samples.every(s=>s.cameraHits.length===0&&s.c[1]-s.cameraFloor>=.44));
});

await check('Partial preference updates preserve reduced motion and disabled shadows', async () => {
  await place(0,17,['bridge']);
  await page.evaluate(()=>window.__AUIS_GAME__.world.setSettings({reducedMotion:true,shadows:false,sensitivity:1.7}));
  await page.waitForTimeout(200);
  const snapshot=()=>page.evaluate(()=>{const w=window.__AUIS_GAME__.world;const npc=w.scene.children.find(o=>o.userData.originalAppearance&&!o.userData.isPlayer&&o.visible&&o.userData.root.visible);if(!npc)throw Error('Nearby articulated NPC absent');return {name:npc.name,head:npc.userData.head.rotation.toArray().slice(0,3),cape:npc.userData.cape.rotation.toArray().slice(0,3),torso:npc.userData.torso.scale.y,shadows:w.renderer.shadowMap.enabled};});
  const a=await snapshot();
  await page.evaluate(()=>window.__AUIS_GAME__.world.setSettings({quality:'balanced'}));
  await page.waitForTimeout(600); const b=await snapshot(); measurements.partialSettings={before:a,after:b};
  assert.equal(b.shadows,false,'Omitted shadows preference remains disabled');
  assert.deepEqual(b.head,a.head,'Omitted reducedMotion preference retains static NPC idle');
  assert.deepEqual(b.cape,a.cape);
  assert.equal(b.torso,a.torso);
  await page.evaluate(()=>window.__AUIS_GAME__.world.setSettings({quality:'high',reducedMotion:false,shadows:true,sensitivity:1}));
});

await check('Wall obstruction prevents proximity interaction with the hidden target', async () => {
  const scenario=await page.evaluate(()=>{
    const w=window.__AUIS_GAME__.world;
    for(const target of w.debug.targets)for(let i=0;i<32;i++)for(const radius of [2.0,3.0,4.1]){
      const a=i/32*Math.PI*2,p={x:target.x+Math.cos(a)*radius,z:target.z+Math.sin(a)*radius};
      if(w.debug.canStand(p.x,p.z)&&!w.debug.clearApproach(p,target))return {target,p};
    }
    return null;
  });
  assert.ok(scenario,'A reachable point behind an opaque wall exists');
  assert.ok(await place(scenario.p.x,scenario.p.z,['bridge'])); await page.waitForTimeout(100);
  const prompt=await page.evaluate(()=>window.__AUIS_GAME__.target);
  assert.notEqual(prompt?.id,scenario.target.id,'Blocked target is absent from proximity prompt');
  await page.keyboard.press('e'); await page.waitForTimeout(100);
  if(await page.getByRole('dialog').count()){
    const heading=await page.locator('.modal-header h2').innerText();
    assert.ok(!heading.includes(scenario.target.name),'E cannot open the blocked target conversation');
    await page.keyboard.press('Escape');
  }
  measurements.wallInteraction={blocked:scenario.target.id,position:scenario.p,available:prompt?.id||null};
});

await check('Jump pauses in the journal and resumes landing without queued input', async () => {
  assert.ok(await place(0,19,['bridge'])); await page.locator('#world canvas').focus();
  const start=await position(); await page.keyboard.press('Space'); await page.waitForTimeout(170);
  const raised=await position(); assert.ok(raised[1]>start[1]+.35);
  await page.keyboard.press('j'); await page.getByRole('dialog').waitFor();
  const paused=await position();
  await page.locator('.modal-header h2').evaluate(el=>{el.tabIndex=-1;el.focus()});
  await page.keyboard.press('Space'); await page.waitForTimeout(350); const still=await position();
  assert.ok(Math.abs(still[1]-paused[1])<.005,'Vertical physics stay paused in the modal');
  await page.keyboard.press('Escape'); await page.waitForTimeout(900); const landed=await position();
  const floor=await page.evaluate(()=>{const w=window.__AUIS_GAME__.world,p=w.player.position;return w.debug.groundHeight(p.x,p.z)});
  assert.ok(Math.abs(landed[1]-floor)<.02,'Resumed jump lands on the surface');
  assert.ok(Math.hypot(landed[0]-start[0],landed[2]-start[2])<.01);
  measurements.pauseJump={start,raised,paused,still,landed};
});

await check('Window blur clears held movement and lost canvas capture ends orbit', async () => {
  assert.ok(await place(0,19,['bridge'])); await page.locator('#world canvas').focus();
  await page.keyboard.down('w'); await page.waitForTimeout(180);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  const a=await position(); await page.waitForTimeout(260); const b=await position(); await page.keyboard.up('w');
  assert.ok(Math.hypot(b[0]-a[0],b[2]-a[2])<.03,'Held keys stop immediately on blur');
  await page.evaluate(()=>window.__AUIS_GAME__.world.debug.setCamera({yaw:0,pitch:.23,distance:10.7})); await page.waitForTimeout(600);
  await page.locator('#world canvas').evaluate(el=>{el.addEventListener('pointerdown',event=>{window.auditPointerId=event.pointerId},{once:true});el.addEventListener('lostpointercapture',()=>{window.auditPointerLost=true},{once:true})});
  await page.mouse.move(720,530); await page.mouse.down(); await page.mouse.move(724,534);
  await page.locator('#world canvas').evaluate(el=>{const id=window.auditPointerId;if(el.hasPointerCapture(id))el.releasePointerCapture(id)});
  await page.mouse.move(726,534); await page.waitForTimeout(400);
  assert.ok(await page.evaluate(()=>window.auditPointerLost),'Browser dispatched native lostpointercapture');
  const before=await page.evaluate(()=>window.__AUIS_GAME__.world.camera.position.toArray());
  await page.mouse.move(870,560,{steps:6}); await page.mouse.up(); await page.waitForTimeout(400);
  const after=await page.evaluate(()=>window.__AUIS_GAME__.world.camera.position.toArray());
  assert.ok(Math.hypot(...after.map((v,i)=>v-before[i]))<.18,'Losing pointer capture ends drag; camera drift '+Math.hypot(...after.map((v,i)=>v-before[i])));
});

await check('Touch movement releases held input when pointer capture is lost', async () => {
  const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const mobile=await mobileContext.newPage();
  try {
    await mobile.goto(url,{waitUntil:'networkidle'});await mobile.waitForFunction(()=>window.__AUIS_GAME__?.world?.debug);await mobile.locator('#begin').click();
    await mobile.evaluate(()=>{const w=window.__AUIS_GAME__.world;w.setProgress(['bridge']);w.testMove({x:0,z:19});w.debug.setCamera({yaw:0});});
    const button=mobile.getByRole('button',{name:'Move forward',exact:true});await button.waitFor({state:'visible'});
    await button.evaluate(el=>{el.addEventListener('pointerdown',e=>{window.auditTouchId=e.pointerId},{once:true});el.addEventListener('lostpointercapture',()=>{window.auditTouchLost=true},{once:true})});
    const bounds=await button.boundingBox(),x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
    const session=await mobileContext.newCDPSession(mobile);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:4}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+2,y,id:4}]});await mobile.waitForTimeout(140);
    await button.evaluate(el=>{if(el.hasPointerCapture(window.auditTouchId))el.releasePointerCapture(window.auditTouchId)});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+3,y,id:4}]});await mobile.waitForTimeout(60);
    assert.ok(await mobile.evaluate(()=>window.auditTouchLost),'Browser dispatched native touch lostpointercapture');
    const a=await mobile.evaluate(()=>window.__AUIS_GAME__.world.player.position.toArray());await mobile.waitForTimeout(230);const b=await mobile.evaluate(()=>window.__AUIS_GAME__.world.player.position.toArray());
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok(Math.hypot(b[0]-a[0],b[2]-a[2])<.03,'Lost touch capture releases synthetic movement key; drift '+Math.hypot(b[0]-a[0],b[2]-a[2]));
    measurements.touchCapture={pointerId:await mobile.evaluate(()=>window.auditTouchId),before:a,after:b};
  } finally { await mobileContext.close(); }
});

await check('Every guide, companion and station has an unobstructed walkable approach, including council reward relocation', async () => {
  const report=await page.evaluate(()=>{
    const w=window.__AUIS_GAME__.world,results=[];
    for(const progress of [[],['bridge','council']]){
      w.setProgress(progress);
      for(const target of w.debug.targets){
        const approaches=[];
        for(const radius of [1.0,1.6,2.2])for(let i=0;i<24;i++){
          const a=i/24*Math.PI*2,p={x:target.x+Math.cos(a)*radius,z:target.z+Math.sin(a)*radius};
          if(w.debug.canStand(p.x,p.z)&&w.debug.clearApproach(p,target))approaches.push(p);
        }
        results.push({id:target.id,progress:progress.join(','),targetAllowed:w.debug.canStand(target.x,target.z),targetClearance:Math.abs(target.y-w.debug.groundHeight(target.x,target.z)),approaches:approaches.length,x:target.x,z:target.z});
      }
    }
    return results;
  });
  measurements.targetApproaches=report;
  assert.ok(report.every(r=>r.targetAllowed),JSON.stringify(report.filter(r=>!r.targetAllowed)));
  assert.ok(report.every(r=>r.approaches>=4),JSON.stringify(report.filter(r=>r.approaches<4)));
  assert.ok(report.every(r=>r.targetClearance<.09),JSON.stringify(report.filter(r=>r.targetClearance>=.09)));
  const relocated=report.find(r=>r.id==='social-support'&&r.progress.includes('council'));
  assert.ok(relocated&&relocated.x===-57.8&&relocated.approaches>=4);
});

await check('Observatory camera clears the explorer lower body across foreground terrain',async()=>{
  await page.evaluate(()=>{const w=window.__AUIS_GAME__.world;w.teleport('mathematics');w.debug.setCamera({yaw:0,pitch:.23,distance:10.7});});
  await page.waitForTimeout(700);
  const result=await page.evaluate(()=>{
    const w=window.__AUIS_GAME__.world,start=w.player.position.clone();start.y+=.10;const clearances=[];
    for(let i=0;i<=60;i++){const point=start.clone().lerp(w.camera.position,i/60);clearances.push(point.y-w.debug.terrainSurface(point.x,point.z));}
    return {minClearance:Math.min(...clearances),player:w.player.position.toArray(),camera:w.camera.position.toArray()};
  });measurements.lowerBodyCamera=result;assert.ok(result.minClearance>.025,JSON.stringify(result));
});
await check('Trading hall entry walks onto its visible interior floor above the shoreline',async()=>{
  await page.locator('#world canvas').focus();assert.ok(await place(31,64.2,['bridge']));
  await page.keyboard.down('s');const samples=await observe(570);await page.keyboard.up('s');
  const result=await page.evaluate(()=>{const w=window.__AUIS_GAME__.world,p=w.player.position,f=w.debug.floors.find(f=>f.x===31&&f.z===69);return {position:p.toArray(),floor:f.y,natural:w.debug.terrainSurface(p.x,p.z),inside:Math.abs(p.x-f.x)<f.w/2&&Math.abs(p.z-f.z)<f.d/2};});
  measurements.interiorFloor=result;assert.ok(result.inside);assert.ok(Math.abs(result.position[1]-result.floor)<.025,JSON.stringify(result));assert.ok(samples.every(s=>s.allowed));
});

await check('Nearby crane obstruction keeps the camera outside the explorer body',async()=>{
  assert.ok(await place(39,-20,['bridge']));await page.evaluate(()=>window.__AUIS_GAME__.world.debug.setCamera({yaw:.45,pitch:.34,distance:13}));await page.waitForTimeout(900);
  const result=await page.evaluate(()=>{const w=window.__AUIS_GAME__.world,p=w.player.position.clone();p.y+=1.5;return {distance:w.camera.position.distanceTo(p),camera:w.camera.position.toArray()};});measurements.cameraBodyClearance=result;assert.ok(result.distance>2.7,JSON.stringify(result));
});
await check('E interaction remains available after focus returns to a HUD menu button',async()=>{
  const t=await page.evaluate(()=>window.__AUIS_GAME__.world.debug.targets.find(t=>t.id==='sera'));assert.ok(await place(t.x+.6,t.z));await page.locator('[data-menu="map"]').focus();await page.keyboard.press('e');await page.getByRole('dialog').waitFor();assert.ok((await page.locator('.modal-header h2').innerText()).includes('Sera'));await page.keyboard.press('Escape');
});

await check('Regression scenarios produce no browser runtime errors',async()=>assert.deepEqual(errors,[]));
const report={testedAt:new Date().toISOString(),browser:'Google Chrome '+browser.version(),url,viewport:'1440×900; touch390×844',checks,failures,errors,measurements};
await writeFile('docs/world-audit-results.json',JSON.stringify(report,null,2)+'\n');
await browser.close(); console.log(JSON.stringify({passed:checks.length,failures},null,2)); if(failures.length)process.exitCode=1;
