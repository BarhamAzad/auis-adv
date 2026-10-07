import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.GAME_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const checks = [], failures = [], errors = [], measurements = {viewports:[],contrast:[]}, screenshots = [];
const activities = ['intro','bridge','energy','commands','market','story','samples','council','light','tooth','ingredients'];
await mkdir('public/screenshots',{recursive:true});
async function check(name, action) {
  try { await action(); checks.push(name); console.log('PASS',name); }
  catch(error) { failures.push({name,error:error.message}); console.log('FAIL',name,error.message); }
}
async function screenshot(page, name) {
  const path = `public/screenshots/branding-${name}.png`;
  await page.screenshot({path}); screenshots.push(path);
}
async function layout(page) {
  return page.evaluate(() => {
    const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    const image=document.querySelector('.brand img'), rect=box(image), clipping=[];
    for(let parent=image.parentElement;parent&&parent!==document.documentElement&&parent!==document.body;parent=parent.parentElement){
      const style=getComputedStyle(parent), bounds=box(parent);
      if(['hidden','clip','auto','scroll'].includes(style.overflowX)&&(rect.x<bounds.x-.5||rect.right>bounds.right+.5))clipping.push({element:parent.className,axis:'x'});
      if(['hidden','clip','auto','scroll'].includes(style.overflowY)&&(rect.y<bounds.y-.5||rect.bottom>bounds.bottom+.5))clipping.push({element:parent.className,axis:'y'});
    }
    const occluded=[[.25,.25],[.75,.25],[.25,.75],[.75,.75]].some(([x,y])=>{const hit=document.elementFromPoint(rect.x+rect.width*x,rect.y+rect.height*y);return hit!==image&&!image.contains(hit)});
    return {width:innerWidth,height:innerHeight,documentOverflow:document.documentElement.scrollWidth-innerWidth,logo:{...rect,clipping,occluded,transform:getComputedStyle(image).transform,wrapperTransform:getComputedStyle(image.closest('.brand-mark')).transform,objectFit:getComputedStyle(image).objectFit,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,currentSrc:image.currentSrc,complete:image.complete},menus:[...document.querySelectorAll('.nav-actions [data-menu]')].map(el=>{const bounds=box(el);return {menu:el.dataset.menu,...bounds,display:getComputedStyle(el).display,occluded:!el.contains(document.elementFromPoint(bounds.x+bounds.width/2,bounds.y+bounds.height/2))}}),welcome:document.querySelector('#welcome').hidden?null:box(document.querySelector('#welcome'))};
  });
}
async function noModalOverflow(page) {
  return page.evaluate(() => {
    const result=[], modal=document.querySelector('.modal');
    if(!modal)throw Error('No visible modal');
    const bounds=modal.getBoundingClientRect();
    if(bounds.left<-.5||bounds.right>innerWidth+.5||bounds.top<-.5||bounds.bottom>innerHeight+.5)result.push({element:'modal',bounds:{left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom}});
    for(const selector of ['.modal-content','.activity-shell','.activity-workspace','.activity-controls','.map-layout','#map-detail','#archive-entry']){
      const el=document.querySelector(selector);if(el&&el.clientWidth&&el.scrollWidth-el.clientWidth>2)result.push({element:selector,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth});
    }
    if(document.documentElement.scrollWidth>innerWidth+1)result.push({element:'document',width:document.documentElement.scrollWidth});
    return result;
  });
}
async function contrast(page, selectors) {
  return page.evaluate(selectors => {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const colorContext=canvas.getContext('2d',{willReadFrequently:true});
    const parse=value=>{
      const n=value.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number);
      if(value.startsWith('color(srgb ')&&n?.length>=3)return [n[0]*255,n[1]*255,n[2]*255,n.length>3?n[3]:1];
      if(/^rgba?\(/.test(value)&&n?.length>=3)return [n[0],n[1],n[2],n.length>3?n[3]:1];
      colorContext.clearRect(0,0,1,1);colorContext.fillStyle=value;colorContext.fillRect(0,0,1,1);const pixel=colorContext.getImageData(0,0,1,1).data;return [pixel[0],pixel[1],pixel[2],pixel[3]/255];
    };
    const mix=(top,bottom)=>top.slice(0,3).map((v,i)=>v*top[3]+bottom[i]*(1-top[3]));
    const luminance=rgb=>rgb.map(v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
    function backgrounds(el){
      if(!el)return [[255,255,255]];
      const style=getComputedStyle(el), under=backgrounds(el.parentElement);
      const gradient=style.backgroundImage.match(/(?:rgba?|color)\([^)]+\)/g);
      const paints=gradient?.length?gradient.map(parse):[parse(style.backgroundColor)];
      return paints.flatMap(paint=>under.map(bg=>mix(paint,bg))).slice(0,16);
    }
    return selectors.map(({name,selector})=>{
      const el=document.querySelector(selector);if(!el)throw Error('Missing contrast sample '+selector);
      const style=getComputedStyle(el),foreground=parse(style.color),bgs=backgrounds(el);
      const candidates=bgs.map(bg=>({background:bg,foreground:mix(foreground,bg),ratio:ratio(mix(foreground,bg),bg)}));
      const worst=candidates.reduce((a,b)=>a.ratio<b.ratio?a:b);
      return {name,selector,color:style.color,background:worst.background,ratio:Number(worst.ratio.toFixed(3))};
    });
  }, selectors);
}

for(const viewport of [{width:1440,height:900,label:'desktop'},{width:390,height:844,label:'phone'},{width:320,height:568,label:'compact phone'}]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1,isMobile:viewport.width<500,hasTouch:viewport.width<500});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push({viewport:viewport.label,message:error.message}));
  page.on('console',message=>{if(message.type()==='error')errors.push({viewport:viewport.label,message:message.text()});});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__AUIS_GAME__?.world?.debug);
  await page.locator('.brand img').waitFor({state:'visible'});await page.waitForTimeout(300);
  await check(`${viewport.label}: supplied logo loads without distortion or clipping`,async()=>{
    const info=await layout(page);measurements.viewports.push({label:viewport.label,...info});
    assert.equal(info.logo.naturalWidth,447,'Original logo width');assert.equal(info.logo.naturalHeight,447,'Original logo height');
    assert.ok(info.logo.complete&&new URL(info.logo.currentSrc).pathname==='/auis-logo.png','Browser displays the supplied PNG');
    assert.ok(Math.abs(info.logo.width-info.logo.height)<.75,'Rendered logo remains square');
    assert.ok(info.logo.width>=28&&info.logo.x>=0&&info.logo.y>=0&&info.logo.right<=info.width&&info.logo.bottom<=info.height,'Logo lies inside the visible viewport');
    assert.deepEqual(info.logo.clipping,[],'Ancestors preserve the whole logo');
    assert.equal(info.logo.occluded,false,'No overlay covers the visible logo');
    assert.equal(info.logo.transform,'none','The supplied logo remains untransformed');assert.equal(info.logo.wrapperTransform,'none');
    assert.ok(info.documentOverflow<=1,'Welcome screen has no horizontal overflow');
    assert.equal(info.menus.length,4);assert.ok(info.menus.every(m=>m.width>=28&&m.height>=28&&m.x>=0&&m.right<=info.width+.5&&m.y>=0&&m.bottom<=info.height+.5&&m.display!=='none'&&!m.occluded),'All four menu controls remain visible');
    assert.ok(info.welcome&&info.welcome.x>=0&&info.welcome.right<=info.width+.5&&info.welcome.y>=0&&info.welcome.bottom<=info.height+.5,'Welcome card remains within the screen');
    await page.locator('#begin').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('#begin').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'Begin action is visible and accepts a pointer hit');
    const brand=page.getByRole('link',{name:/Lanterns of Learning.*AUIS Adventure/i});assert.equal(await brand.count(),1,'Header names the AUIS adventure accessibly');
    assert.equal(await brand.getByRole('img',{name:'AUIS logo',exact:true}).count(),1);
  });
  if(viewport.label==='desktop'){
    await check('Supplied PNG favicon, navy browser theme, and exact core brand colors ship',async()=>{
      const info=await page.evaluate(()=>({theme:document.querySelector('meta[name="theme-color"]')?.content,icons:[...document.querySelectorAll('link[rel="icon"]')].map(el=>({href:new URL(el.href).pathname,type:el.type})),colors:Object.fromEntries(['--brand-navy','--brand-gold','--brand-white'].map(name=>[name,getComputedStyle(document.documentElement).getPropertyValue(name).trim().toLowerCase()]))}));
      assert.equal(info.theme,'#182b55');assert.ok(info.icons.some(icon=>icon.href==='/auis-logo.png'&&icon.type==='image/png'));
      assert.deepEqual(info.colors,{'--brand-navy':'#182b55','--brand-gold':'#c89921','--brand-white':'#ffffff'});
      const response=await page.request.get(new URL('/auis-logo.png',url).href);assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/image\/png/);
      const bytes=await response.body();assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],'Raw PNG asset is served');
      measurements.brand=info;
    });
    await check('Welcome primary action, gold label, and body copy meet 4.5:1 contrast',async()=>{
      const samples=await contrast(page,[{name:'navy on gold primary action',selector:'#begin'},{name:'gold on navy welcome label',selector:'#welcome .eyebrow'},{name:'welcome body text',selector:'#welcome p'},{name:'welcome save note',selector:'#welcome > small'}]);
      measurements.contrast.push(...samples);assert.ok(samples.every(s=>s.ratio>=4.5),JSON.stringify(samples.filter(s=>s.ratio<4.5)));
      assert.equal(await page.locator('#begin').evaluate(el=>getComputedStyle(el).color),'rgb(24, 43, 85)');
      assert.equal(await page.locator('#begin').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(200, 153, 33)');
    });
    await screenshot(page,'desktop-welcome');
  } else if(viewport.label==='phone')await screenshot(page,'mobile-welcome');
  else if(viewport.label==='compact phone')await screenshot(page,'compact-mobile-welcome');
  await page.locator('#begin').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#welcome').hidden);
  for(const menu of ['map','journal','archive','settings']){
    await check(`${viewport.label}: ${menu} menu fits and supports keyboard activation, focus trapping, and return`,async()=>{
      const opener=page.locator(`.nav-actions [data-menu="${menu}"]`);await opener.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor({state:'visible'});
      assert.deepEqual(await noModalOverflow(page),[]);
      if(menu==='map'){
        await page.locator('[data-region="mathematics"]').focus();await page.keyboard.press('Enter');
        assert.match(await page.locator('#map-detail h3').innerText(),/Department of Mathematics and Natural Sciences/);
        assert.deepEqual(await noModalOverflow(page),[]);
        await page.locator('[data-region="village"]').focus();await page.keyboard.press('Enter');
        if(viewport.label==='desktop')await screenshot(page,'world-map');
        if(viewport.label==='phone'){
          await page.locator('.modal-content').evaluate(el=>el.scrollTop=0);await screenshot(page,'mobile-map');
        }
      }
      if(viewport.label==='desktop'&&menu==='settings'){
        const samples=await contrast(page,[{name:'modal body text',selector:'.settings-row p'},{name:'modal gold label',selector:'.modal-header .eyebrow'},{name:'modal primary action',selector:'#save-now'},{name:'modal muted body text',selector:'#save-status'}]);
        measurements.contrast.push(...samples);assert.ok(samples.every(s=>s.ratio>=4.5),JSON.stringify(samples.filter(s=>s.ratio<4.5)));
      }
      await page.locator('#close-modal').focus();await page.keyboard.press('Shift+Tab');
      assert.ok(await page.evaluate(()=>!!document.activeElement?.closest('[role="dialog"]')),'Reverse tab stays inside dialog');
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.id),'close-modal','Tab wraps to the close button');
      await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
      assert.equal(await opener.evaluate(el=>document.activeElement===el),true,'Focus returns to the menu opener');
    });
    await page.evaluate(()=>window.__AUIS_GAME__.closeModal());
  }
  for(const id of activities){
    await check(`${viewport.label}: ${id} activity fits, and its hint and return controls work with the keyboard`,async()=>{
      await page.evaluate(id=>window.__AUIS_GAME__.openActivity(id),id);await page.getByRole('dialog').waitFor({state:'visible'});
      assert.deepEqual(await noModalOverflow(page),[]);
      const hint=page.locator('[data-action="hint"]');await hint.focus();await page.keyboard.press('Enter');await page.locator('.activity-feedback-hint').waitFor({state:'visible'});
      assert.deepEqual(await noModalOverflow(page),[],'Hint remains readable without horizontal overflow');
      if(viewport.label==='desktop'&&id==='bridge'){
        const samples=await contrast(page,[{name:'activity instruction text',selector:'.activity-description'},{name:'activity gold label',selector:'.activity-eyebrow'},{name:'activity primary action',selector:'[data-action="test"]'}]);measurements.contrast.push(...samples);assert.ok(samples.every(s=>s.ratio>=4.5),JSON.stringify(samples.filter(s=>s.ratio<4.5)));
        await page.locator('.modal-content').evaluate(el=>el.scrollTop=0);await screenshot(page,'activity');
      }
      await page.locator('[data-action="close"]').focus();await page.keyboard.press('Enter');assert.equal(await page.getByRole('dialog').count(),0);
    });
    await page.evaluate(()=>window.__AUIS_GAME__.closeModal());
  }
  await context.close();
}
await check('Branding and responsive screens produce no browser runtime errors',async()=>assert.deepEqual(errors,[]));
const report={testedAt:new Date().toISOString(),browser:'Google Chrome '+browser.version(),url,viewports:['1440×900 desktop','390×844 touch phone','320×568 touch phone'],checks,failures,errors,measurements,screenshots};
await writeFile('docs/branding-results.json',JSON.stringify(report,null,2)+'\n');
await browser.close();console.log(JSON.stringify({passed:checks.length,failures,screenshots},null,2));if(failures.length)process.exitCode=1;
