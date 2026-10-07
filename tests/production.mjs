import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[],checks=[],failures=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const NativeAudio=window.AudioContext;window.AudioContext=class extends NativeAudio{constructor(...args){super(...args);window.__lastAudioContext=this;}};});
await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__AUIS_GAME__?.world?.debug);
const check=async(name,fn)=>{try{await fn();checks.push(name);console.log('PASS',name);}catch(e){failures.push({name,error:e.message});console.log('FAIL',name,e.message);}};
await check('Production build and bundled fonts render',async()=>{assert.ok(await page.locator('#world canvas').count());assert.equal(await page.evaluate(()=>document.fonts.check('16px "DM Sans"')),true);assert.equal(await page.evaluate(()=>document.fonts.check('16px "Libre Caslon Display"')),true);});
await page.locator('#begin').click();
await mkdir('public/screenshots',{recursive:true});
const targets=await page.evaluate(()=>window.__AUIS_GAME__.world.debug.targets.filter(t=>['faculty','support','activity'].includes(t.type)));
for(const target of targets){await check(`Approach and interact: ${target.id}`,async()=>{
 const found=await page.evaluate(t=>{const w=window.__AUIS_GAME__.world;const options=[];for(const d of [.6,1,1.8,2.6,3.2])for(let i=0;i<8;i++)options.push({x:t.x+Math.cos(i*Math.PI/4)*d,z:t.z+Math.sin(i*Math.PI/4)*d});for(const p of options){if(!w.debug.canStand(p.x,p.z))continue;w.testMove(p);if(window.__AUIS_GAME__.target?.id===t.id)return true;}return false;},target);
 assert.ok(found,'target has no reachable nearest interaction position');await page.keyboard.press('e');await page.getByRole('dialog').waitFor();const dialog=await page.locator('.modal-header h2').innerText();assert.ok(dialog.length>2);if(target.type==='faculty')assert.ok(dialog.includes(target.name.split(' ·')[0]));if(target.type==='activity')assert.ok(await page.locator('.activity-shell').count());await page.keyboard.press('Escape');});}
await check('Original music starts and stops after user gesture',async()=>{await page.locator('#audio-toggle').click();assert.equal(await page.evaluate(()=>window.__lastAudioContext?.state),'running');assert.equal(await page.evaluate(()=>window.__AUIS_GAME__.state.settings.music),true);await page.locator('#audio-toggle').click();assert.equal(await page.evaluate(()=>window.__AUIS_GAME__.state.settings.music),false);});
await check('Camera settings, modal focus, and movement pause remain usable',async()=>{await page.locator('[data-menu="settings"]').click();await page.locator('#sensitivity').evaluate(e=>{e.value='1.8';e.dispatchEvent(new Event('change',{bubbles:true}));});const before=await page.evaluate(()=>window.__AUIS_GAME__.world.getPosition());await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');assert.deepEqual(await page.evaluate(()=>window.__AUIS_GAME__.world.getPosition()),before);await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('.modal')));await page.keyboard.press('Escape');});
const gpu=await page.evaluate(()=>{const gl=window.__AUIS_GAME__.world.renderer.getContext();const e=gl.getExtension('WEBGL_debug_renderer_info');return e?{vendor:gl.getParameter(e.UNMASKED_VENDOR_WEBGL),renderer:gl.getParameter(e.UNMASKED_RENDERER_WEBGL)}:{renderer:gl.getParameter(gl.RENDERER)};});
const performance=[];
const views = [
  {region:'village',file:'09-app-study-hall',position:{x:0,z:17},camera:{yaw:0,pitch:.28,distance:10.7}},
  {region:'engineering',file:'10-engineering-workshop',position:{x:39,z:-20},camera:{yaw:.45,pitch:.34,distance:13}},
  {region:'computing',file:'11-computing-robotics',position:{x:60,z:18},camera:{yaw:.38,pitch:.3,distance:12.4}},
  {region:'business',file:'12-business-trading-hall',position:{x:31,z:57},camera:{yaw:Math.PI+.28,pitch:.3,distance:12}},
  {region:'english',file:'13-english-reading-hall',position:{x:-24,z:54},camera:{yaw:Math.PI+.25,pitch:.3,distance:12.6}},
  {region:'medical',file:'14-medical-laboratory',position:{x:-61,z:24},camera:{yaw:.18,pitch:.3,distance:11.5}},
  {region:'social',file:'15-social-council',position:{x:-58,z:-20},camera:{yaw:.45,pitch:.34,distance:12}},
  {region:'mathematics',file:'16-mathematics-observatory',position:{x:-26,z:-54},camera:{yaw:.25,pitch:.38,distance:14}},
  {region:'dentistry',file:'17-dentistry-clinic',position:{x:18,z:-51},camera:{yaw:.16,pitch:.34,distance:13.4}},
  {region:'pharmacy',file:'18-pharmacy-greenhouse',position:{x:58,z:-56},camera:{yaw:.32,pitch:.4,distance:14}},
];
async function setView(page,view){
  await page.evaluate(v=>{
    const w=window.__AUIS_GAME__.world;
    if(!w.testMove(v.position))throw Error('Blocked review view '+v.region);
    w.debug.setCamera(v.camera);
    document.querySelector('#toast').hidden=true;
  },view);
}
for(const view of views){
  await setView(page,view);await page.waitForTimeout(1800);
  const samples=[];for(let i=0;i<4;i++){samples.push(await page.evaluate(()=>window.__AUIS_GAME__.metrics));await page.waitForTimeout(360);}
  performance.push({region:view.region,deviceScale:1,quality:'high',samples});
  await page.screenshot({path:'public/screenshots/'+view.file+'.png'});
}
await page.evaluate(()=>{const w=window.__AUIS_GAME__.world;w.testMove({x:0,z:17});w.player.rotation.y=Math.PI;w.debug.setCamera({yaw:Math.PI,pitch:.2,distance:4.6});document.querySelector('#toast').hidden=true;});
await page.waitForTimeout(700);await page.screenshot({path:'public/screenshots/19-explorer-detail.png'});
await page.evaluate(()=>{const w=window.__AUIS_GAME__.world;w.testMove({x:41,z:82});w.debug.setCamera({yaw:1.9,pitch:.3,distance:9});document.querySelector('#toast').hidden=true;});
await page.waitForTimeout(700);await page.screenshot({path:'public/screenshots/20-harbor-landscape.png'});
await setView(page,views[0]);await page.waitForTimeout(700);await page.screenshot({path:'public/screenshots/08-production-village.png'});
await page.close();
const retina=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
retina.on('pageerror',e=>errors.push(e.message));
await retina.goto(process.env.GAME_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});await retina.waitForFunction(()=>window.__AUIS_GAME__?.world);await retina.locator('#begin').click();
for(const quality of ['high','balanced']){
  await retina.evaluate(q=>window.__AUIS_GAME__.world.setSettings({quality:q}),quality);
  for(const view of views.filter(v=>['village','engineering','computing','mathematics','pharmacy'].includes(v.region))){
    await setView(retina,view);await retina.waitForTimeout(1800);
    const samples=[];for(let i=0;i<4;i++){samples.push(await retina.evaluate(()=>window.__AUIS_GAME__.metrics));await retina.waitForTimeout(360);}
    performance.push({region:view.region,deviceScale:2,quality,samples});
  }
}
await retina.close();
await check('Production has no browser runtime errors',async()=>assert.deepEqual(errors,[]));
const report={browser:'Google Chrome '+browser.version(),device:{model:execFileSync('sysctl',['-n','hw.model'],{encoding:'utf8'}).trim(),cpu:execFileSync('sysctl',['-n','machdep.cpu.brand_string'],{encoding:'utf8'}).trim(),memoryBytes:Number(execFileSync('sysctl',['-n','hw.memsize'],{encoding:'utf8'}).trim()),os:execFileSync('sw_vers',['-productVersion'],{encoding:'utf8'}).trim()},gpu,testedAt:new Date().toISOString(),checks,failures,errors,performance};await writeFile('docs/production-results.json',JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
