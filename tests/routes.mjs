import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

// Plan against collision volumes, then travel using held real keyboard inputs.
// No teleport/testMove/restorePosition calls occur in this journey.
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport:{width:1280,height:800}});
const checks=[], failures=[], errors=[], routes=[];
page.on('pageerror',e=>errors.push(e.message));
const check=async(name,fn)=>{try{await fn();checks.push(name);console.log('PASS',name);}catch(e){failures.push({name,error:e.message});console.log('FAIL',name,e.message);}};
await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__AUIS_GAME__?.world?.debug);
await page.locator('#begin').click();
await page.evaluate(()=>window.__AUIS_GAME__.world.debug.setCamera({yaw:0}));
const position=()=>page.evaluate(()=>window.__AUIS_GAME__.world.getPosition());
async function plan(id){
  return page.evaluate(id=>{
    const w=window.__AUIS_GAME__.world,debug=w.debug,start=w.getPosition(),target=debug.targets.find(t=>t.id===id);
    if(!target)throw Error('Unknown target '+id);
    const clear=(a,b)=>{
      const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.18);
      for(let i=0;i<=n;i++){const t=n?i/n:0,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
        if(!debug.canStand(x,z))return false;
        // A small clearance margin prevents keyboard timing noise from grazing walls.
        if(Math.hypot(x-start.x,z-start.z)>.45&&![[.24,0],[-.24,0],[0,.24],[0,-.24]].every(([dx,dz])=>debug.canStand(x+dx,z+dz)))return false;
      }return true;
    };
    const goals=[];
    for(const radius of [.55,.85,1.2,1.6])for(let i=0;i<16;i++){
      const p={x:target.x+Math.cos(i*Math.PI/8)*radius,z:target.z+Math.sin(i*Math.PI/8)*radius};
      const nearest=debug.targets.filter(t=>debug.clearApproach(p,{x:t.x,z:t.z})).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      const own=Math.hypot(target.x-p.x,target.z-p.z);
      const separated=debug.targets.every(t=>t.id===id||Math.hypot(t.x-p.x,t.z-p.z)>own+.65);
      if(clear(p,p)&&nearest?.id===id&&separated)goals.push(p);
    }
    if(!goals.length)throw Error('No clear nearest interaction position');
    const key=(x,z)=>x+','+z, goal=goals.sort((a,b)=>Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z))[0];
    const startNode={x:Math.round(start.x),z:Math.round(start.z)};
    // Search all neighboring grid points if rounding is obstructed.
    const starters=[];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const p={x:startNode.x+dx,z:startNode.z+dz};if(clear(start,p))starters.push(p);}
    const nodes=new Map(),open=[];
    for(const p of starters){const n={...p,g:Math.hypot(p.x-start.x,p.z-start.z),parent:null};nodes.set(key(p.x,p.z),n);open.push(n);}
    let found=null,steps=0;
    while(open.length&&steps++<60000){
      let index=0;for(let i=1;i<open.length;i++)if(open[i].g+Math.hypot(open[i].x-goal.x,open[i].z-goal.z)<open[index].g+Math.hypot(open[index].x-goal.x,open[index].z-goal.z))index=i;
      const n=open.splice(index,1)[0];if(n.closed)continue;n.closed=true;
      const reachable=goals.find(g=>Math.hypot(g.x-n.x,g.z-n.z)<1.8&&clear(n,g));
      if(reachable){found={...reachable,parent:n};break;}
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
        const p={x:n.x+dx,z:n.z+dz};if(Math.abs(p.x)>109||Math.abs(p.z)>109||!clear(n,p))continue;
        const id=key(p.x,p.z),g=n.g+Math.hypot(dx,dz),old=nodes.get(id);if(old&&old.g<=g)continue;
        const next={...p,g,parent:n};nodes.set(id,next);open.push(next);
      }
    }
    if(!found)throw Error('No on-foot route from '+JSON.stringify(start)+' to '+id);
    const path=[];for(let n=found;n;n=n.parent)path.unshift({x:n.x,z:n.z});path.unshift(start);
    const simplified=[start];let i=0;
    while(i<path.length-1){let j=i+1;while(j+1<path.length&&clear(path[i],path[j+1]))j++;simplified.push(path[j]);i=j;}
    return {target,path:simplified};
  },id);
}
async function walk(path){
  for(const goal of path.slice(1)){
    let stagnant=0,lastDistance=Infinity;
    for(let step=0;step<350;step++){
      const p=await position(),dx=goal.x-p.x,dz=goal.z-p.z,distance=Math.hypot(dx,dz);
      if(distance<.28)break;
      if(step===349)throw Error('Timed out reaching '+JSON.stringify(goal));
      if(distance>lastDistance-.012)stagnant++;else stagnant=0;lastDistance=distance;
      if(stagnant>18)throw Error('Movement stalled at '+JSON.stringify(p)+' toward '+JSON.stringify(goal));
      const command=await page.evaluate(goal=>{
        const w=window.__AUIS_GAME__.world,p=w.getPosition(),distance=Math.hypot(goal.x-p.x,goal.z-p.z),length=Math.min(.65,distance-.05);
        const options=[{x:1,z:0,keys:['d']},{x:-1,z:0,keys:['a']},{x:0,z:1,keys:['s']},{x:0,z:-1,keys:['w']},{x:Math.SQRT1_2,z:Math.SQRT1_2,keys:['d','s']},{x:Math.SQRT1_2,z:-Math.SQRT1_2,keys:['d','w']},{x:-Math.SQRT1_2,z:Math.SQRT1_2,keys:['a','s']},{x:-Math.SQRT1_2,z:-Math.SQRT1_2,keys:['a','w']}];
        const feasible=options.filter(o=>{
          for(let j=1;j<=10;j++)if(!w.debug.canStand(p.x+o.x*length*j/10,p.z+o.z*length*j/10))return false;
          o.remaining=Math.hypot(goal.x-p.x-o.x*length,goal.z-p.z-o.z*length);return true;
        }).sort((a,b)=>a.remaining-b.remaining);
        if(!feasible.length)throw Error('No safe keyboard direction');
        return {keys:feasible[0].keys,ms:Math.max(18,length/9.2*1000)};
      },goal);
      const {keys,ms}=command;
      await page.keyboard.down('Shift');for(const key of keys)await page.keyboard.down(key);
      await page.waitForTimeout(ms);for(const key of keys)await page.keyboard.up(key);await page.keyboard.up('Shift');
    }
  }
}
async function visit(id){
  await check('On-foot approach and E interaction: '+id,async()=>{
    const route=await plan(id);await walk(route.path);await page.waitForTimeout(80);
    const nearest=await page.evaluate(()=>window.__AUIS_GAME__.target?.id);assert.equal(nearest,id);
    await page.keyboard.press('e');await page.getByRole('dialog').waitFor();
    routes.push({id,waypoints:route.path.length,distance:Math.round(route.path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route.path[i].x,p.z-route.path[i].z),0))});
    if(id!=='bridge')await page.keyboard.press('Escape');
  });
}
for(const id of ['sera','mira','intro','archive','beacon','medical-guide','medical-support','samples','english-guide','english-support','story','business-guide','business-support','market','computing-guide','computing-support','commands','engineering-support','engineer-switzner','bridge'])await visit(id);
await check('Repair crossing through activity UI after walking from APP',async()=>{
  if(!(await page.locator('[data-segment="0"]').count()))throw Error('Bridge activity not opened on foot');
  for(let i=0;i<3;i++)await page.locator(`[data-segment="${i}"]`).click();await page.locator('[data-supports]').selectOption('2');await page.locator('[name="beam-material"][value="steel"]').check();await page.locator('[data-action="test"]').click();await page.locator('.activity-completion').waitFor();await page.keyboard.press('Escape');
});
for(const id of ['engineer-energy','energy','pharmacy-guide','pharmacy-support','ingredients','dentistry-guide','dentistry-support','tooth','mathematics-guide','mathematics-support','light','social-guide','social-support','council'])await visit(id);
await check('Journey discovered every region on foot and crossed repaired bridge',async()=>{
  const state=await page.evaluate(()=>window.__AUIS_GAME__.state);assert.equal(new Set(state.discovered).size,10);assert.ok(state.completed.includes('bridge'));assert.ok(routes.some(r=>r.id==='engineer-energy'));
});
await check('No browser runtime errors during traversal',async()=>assert.deepEqual(errors,[]));
await writeFile('docs/routes-results.json',JSON.stringify({testedAt:new Date().toISOString(),browser:browser.version(),movement:'Real WASD + Shift, no debug repositioning',checks,failures,errors,routes},null,2)+'\n');await browser.close();console.log(JSON.stringify({passed:checks.length,failures},null,2));if(failures.length)process.exitCode=1;
