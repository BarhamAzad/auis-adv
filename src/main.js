import { createIcons, BookOpen, Map, Compass, Settings, X, ArrowUpRight, Sparkles, Volume2, VolumeX, ChevronRight, Check, Flag, ScrollText, Sun, Footprints, RotateCcw, GraduationCap, Info, Menu } from 'lucide';
import { createWorld } from './game/world.js';
import { regions } from './game/regions.js';
import { academics, academicAudit, preparatory, library } from './data/academics.js';
import { activityDefinitions, mountActivity } from './game/activities.js';
import { loadState, saveState, resetState, lanternCount } from './game/state.js';
import { createAudio } from './game/audio.js';
import './ui/style.css';
import './ui/activities.css';

const app=document.querySelector('#app');
let state=loadState(), world, activeModal=null, activityCleanup, lastSaved=0, currentTarget=null, toastTimer;
let modalOpener=null, saveFailed=false, musicRequest=0;
if(!state.savedAt&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)state.settings.reducedMotion=true;
const audio=createAudio();
const icons={BookOpen,Map,Compass,Settings,X,ArrowUpRight,Sparkles,Volume2,VolumeX,ChevronRight,Check,Flag,ScrollText,Sun,Footprints,RotateCcw,GraduationCap,Info,Menu};
const icon=(name,cls='')=>`<i data-lucide="${name.replace(/([a-z])([A-Z])/g,'$1-$2').toLowerCase()}" class="${cls}"></i>`;
const escape=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lookup=(id)=>academics.find(a=>a.id===id);
const regionFor=(id)=>regions.find(r=>r.id===id)||regions[0];
const tasks=Object.values(activityDefinitions);
function refreshIcons(){createIcons({icons,attrs:{'stroke-width':1.65}});}

app.innerHTML=`
 <main id="game" aria-label="Lanterns of Learning fantasy adventure">
  <div id="world" aria-label="Interactive third-person 3D world"></div>
  <div class="vignette"></div>
  <header class="hud topbar">
   <a class="brand" href="#" aria-label="Lanterns of Learning"><span class="brand-mark">${icon('Sparkles')}</span><span><strong>Lanterns of Learning</strong><small>AN AUIS ADVENTURE</small></span></a>
   <div class="compass-rose" aria-label="World compass"><span>W</span><b>· · · · ·</b><span class="north">N</span><b>· · · · ·</b><span>E</span><div class="compass-pointer">◆</div></div>
   <nav class="nav-actions" aria-label="Game menus"><button data-menu="map" aria-label="World map" title="World map (M)">${icon('Map')}<span>Map</span><kbd>M</kbd></button><button data-menu="journal" aria-label="Quest journal" title="Quest journal (J)">${icon('ScrollText')}<span>Journal</span><kbd>J</kbd></button><button data-menu="archive" aria-label="Moulakis Archive" title="Moulakis Archive (L)">${icon('BookOpen')}<span>Archive</span><kbd>L</kbd></button><button data-menu="settings" class="round-button" aria-label="Settings">${icon('Settings')}</button></nav>
  </header>
  <div class="hud explorer-card"><div class="explorer-avatar">${icon('Compass')}</div><div><span class="eyebrow">STUDENT EXPLORER</span><div class="vital-bar"><span></span></div></div><span class="vital-label">READY</span></div>
  <aside class="hud quest-card"><div class="quest-heading">${icon('Sun')}<span>THE KNOWLEDGE BEACON</span><button id="quest-collapse" aria-label="Toggle quest details" aria-expanded="true">${icon('ChevronRight')}</button></div><h2>A light worth finding</h2><p id="quest-instruction">Begin in the Academic Preparatory Program. Then follow the trail to the Department of Engineering.</p><div class="beacon-progress" id="beacon-progress" aria-hidden="true"></div><div class="quest-foot"><span id="lantern-count">0 / 9 lanterns</span><button data-menu="journal">View quests ${icon('ChevronRight')}</button></div></aside>
  <section class="hud region-card"><span class="eyebrow" id="region-type">YOUR JOURNEY BEGINS</span><h1 id="region-title">Academic Preparatory Program</h1><p id="region-subtitle">Every great discovery begins with a question.</p><span class="region-weather">${icon('Sun')} Golden hour <span>·</span> The Learning Isles</span></section>
  <div class="hud landmark-label" id="landmark-label"><span class="landmark-line"></span><span>MOULAKIS ARCHIVE</span><small>A home for every discovery</small></div>
  <div class="hud minimap-wrap"><button id="minimap" aria-label="Open world map"></button><div class="minimap-label">${icon('Compass')} <span id="mini-region">Academic Preparatory Program</span></div></div>
  <div class="hud interaction" id="interaction" hidden><kbd>E</kbd><div><small id="interaction-type">TALK</small><span id="interaction-label">Speak to Sera</span></div></div>
  <div class="hud controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span><i></i><span><kbd>SHIFT</kbd> Run</span><i></i><span><kbd>SPACE</kbd> Jump</span><i></i><span>${icon('RotateCcw')} Drag to look</span><i></i><span>Scroll to zoom</span></div>
  <button class="hud audio-toggle round-button" id="audio-toggle" aria-label="Enable original music" title="Original music">${icon('VolumeX')}</button>
  <div id="welcome" class="hud welcome-card" ${state.welcomed?'hidden':''}><span class="eyebrow">WELCOME, EXPLORER</span><h2>The world has a little<br>something to teach you.</h2><p>Follow your curiosity. Meet the guides, try your ideas, and bring light back to the knowledge beacon.</p><button class="btn btn-primary" id="begin">Begin your journey ${icon('Compass')}</button><small>Your progress is saved on this device.</small></div>
  <div id="toast" role="status" aria-live="polite" hidden></div>
  <div id="touch-controls"><div class="touch-pad"><button data-key="KeyW" aria-label="Move forward">▲</button><button data-key="KeyA" aria-label="Move left">◀</button><button data-key="KeyS" aria-label="Move backward">▼</button><button data-key="KeyD" aria-label="Move right">▶</button></div><button data-key="Space" aria-label="Jump">Jump</button><button id="touch-interact" disabled>Interact</button></div>
 </main><div id="modal-root"></div>`;
refreshIcons();

function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4200);}
function persist(silent=true){
 if(world)state.position=world.getPosition();
 const result=saveState(state);
 if(!silent||(!result&&!saveFailed))toast(result?'Journey saved on this device.':'This browser could not save your journey. Keep this tab open to retain your progress.');
 saveFailed=!result;
 const status=document.querySelector('#save-status');
 if(status)status.textContent=result?'Progress is saved automatically in this browser. It stays on this device.':'Saving is unavailable in this browser. Current progress remains in this tab.';
 return result;
}
function updateHUD(){
 const count=lanternCount(state);
 document.querySelector('#lantern-count').textContent=`${count} / 9 lanterns`;
 document.querySelector('#beacon-progress').innerHTML=Array.from({length:9},(_,i)=>`<span class="${i<count?'lit':''}"></span>`).join('');
 let instruction='Begin in the Academic Preparatory Program. Then follow the trail to the Department of Engineering.';
 if(state.completed.includes('intro'))instruction='Find Professor Switzner at the river crossing. Build a bridge to the Department of Engineering.';
 if(state.completed.includes('bridge'))instruction='The new bridge opens the way. Find Professor Al-Waeli and power the engineering workshop.';
 if(state.completed.includes('bridge')&&state.completed.includes('energy'))instruction='The engineering lantern is glowing. Explore the other academic regions and gather their discoveries.';
 if(count===9)instruction='Every lantern is lit. Return to the beacon and celebrate what you have discovered.';
 document.querySelector('#quest-instruction').textContent=instruction;
 drawMinimap();
}
function onRegion(id){
 const r=regionFor(id);state.region=id;
 if(!state.discovered.includes(id)){state.discovered.push(id);toast(`Discovered ${r.name}`);persist();}
 document.querySelector('#region-type').textContent=id==='village'?'ACADEMIC PREPARATORY PROGRAM':(lookup(id)?.type||'ACADEMIC REGION').toUpperCase();
 document.querySelector('#region-title').textContent=r.name;
 document.querySelector('#region-subtitle').textContent=r.subtitle;
 document.querySelector('#mini-region').textContent=r.name;
 document.querySelector('#landmark-label').style.opacity=id==='village'?'1':'0';
 updateHUD();
}
function onPrompt(target){
 currentTarget=target;const el=document.querySelector('#interaction');el.hidden=!target||!!activeModal;
 if(target){document.querySelector('#interaction-type').textContent=target.type==='activity'?'EXPLORE & TRY':target.type==='archive'?'OPEN ARCHIVE':target.type==='beacon'?'KNOWLEDGE BEACON':'CONVERSATION';document.querySelector('#interaction-label').textContent=target.label||target.name;}
 const touch=document.querySelector('#touch-interact');touch.disabled=!target||!!activeModal;
 touch.textContent=!target?'Interact':target.type==='activity'?'Try activity':['archive','beacon'].includes(target.type)?'Open':'Talk';
}
function clearModal(){activityCleanup?.();activityCleanup=null;document.querySelector('#modal-root').innerHTML='';}
function closeModal(){
 if(!activeModal)return;
 clearModal();activeModal=null;document.querySelector('#game').inert=false;document.body.classList.remove('dialog-open');
 world?.setPaused(document.hidden);onPrompt(currentTarget);
 const focusTarget=modalOpener?.isConnected?modalOpener:document.querySelector('#world canvas');
 modalOpener=null;focusTarget?.focus({preventScroll:true});
}
function showModal(title,subtitle='',size=''){
 if(!activeModal)modalOpener=document.activeElement?.closest('#game')?document.activeElement:null;
 clearModal();activeModal=title;world?.setPaused(true);document.querySelector('#interaction').hidden=true;
 document.querySelector('#game').inert=true;document.body.classList.add('dialog-open');document.querySelector('#touch-interact').disabled=true;
 document.querySelector('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${size}" role="dialog" aria-modal="true" aria-label="${escape(title)}"><header class="modal-header"><div><span class="eyebrow">LANTERNS OF LEARNING</span><h2>${escape(title)}</h2>${subtitle?`<p>${escape(subtitle)}</p>`:''}</div><button id="close-modal" class="round-button" aria-label="Close dialog">${icon('X')}</button></header><div id="modal-content" class="modal-content"></div></section></div>`;
 document.querySelector('#close-modal').onclick=closeModal;
 document.querySelector('.modal-backdrop').onclick=e=>{if(e.target.classList.contains('modal-backdrop'))closeModal();};
 refreshIcons();document.querySelector('#close-modal').focus();return document.querySelector('#modal-content');
}
function completeActivity(result){
 const id=typeof result==='string'?result:result.id;if(state.completed.includes(id))return;
 state.completed.push(id);world.setProgress(state.completed);updateHUD();persist();audio.reward();
 const count=lanternCount(state);toast(id==='bridge'?`Bridge restored! A new path opens to the Department of Engineering. · ${count}/9 lanterns`:id==='energy'?`Engineering workshop powered! ${state.completed.includes('bridge')?'Your engineering lantern is restored.':'Restore the bridge to complete the engineering lantern.'}`:`${activityDefinitions[id]?.reward||'Discovery recorded.'} · ${count}/9 lanterns`);
}
function openActivity(id){
 const def=activityDefinitions[id];if(!def){toast('This activity is not available.');return;}
 const content=showModal(def.title,`${regionFor(def.regionId).name} · ${def.subject}`,'activity-modal');
 activityCleanup=mountActivity(id,content,{onComplete:completeActivity,onClose:closeModal,completed:state.completed.includes(id),reducedMotion:state.settings.reducedMotion});
 refreshIcons();
}
const regionActivities={village:['intro'],engineering:['bridge','energy'],computing:['commands'],business:['market'],english:['story'],medical:['samples'],social:['council'],mathematics:['light'],dentistry:['tooth'],pharmacy:['ingredients']};
const supportNames={village:'Sera',engineering:'Tavi',computing:'Pip',business:'Nalin',english:'Luma',medical:'Rin',social:'Oren',mathematics:'Esra',dentistry:'Ava',pharmacy:'Basil'};
function resolveGuide(target){
 const unit=lookup(target.regionId);let faculty=unit?.faculty?.[0];
 if(target.id==='engineer-energy')faculty=unit?.faculty.find(f=>f.name.includes('Al-Waeli'))||unit?.faculty?.[1];
 if(target.id==='engineer-switzner')faculty=unit?.faculty.find(f=>f.name.includes('Switzner'))||faculty;
 return {unit,faculty};
}
function openConversation(target){
 const {unit,faculty}=resolveGuide(target),isFaculty=target.type==='faculty';
 const name=isFaculty&&faculty?faculty.name:target.name||supportNames[target.regionId]||'Student explorer';
 const ids=regionActivities[target.regionId]||['intro'];const task=target.id==='engineer-energy'?'energy':target.id==='engineer-switzner'?'bridge':ids.find(id=>!state.completed.includes(id))||ids[0];
 const def=activityDefinitions[task];
 const dialog={village:'The beacon once held a little light from every field of knowledge. Let’s start with curiosity: observe, ask, and test. There’s a clue on our study table.',engineering:task==='energy'?'The settlement is waiting for sunlight. Turn the collector toward the light, connect its circuit, and see what changes.':'The river broke our crossing. Choose a beam material and supports, then test your design. An idea becomes useful when we try it.',computing:'A little clockwork creature has lost its way. Give it a clear sequence of commands. Watch the result, then revise your instructions.',business:'Our market has sixty coins and a big idea. Plan supplies, people, and promotion. Every choice has a cost.',english:'Two reports tell different stories. Read carefully, compare their evidence, and choose what the newspaper can responsibly publish.',medical:'Patterns often hide in small details. Compare these simulated samples and look for the unusual pattern.',social:'Two villages share one river. Listen to both sides and propose an agreement they can live with.',mathematics:'Light follows a pattern. Turn the mirrors, observe the beam, and test your prediction.',dentistry:'Our oversized teaching model has come apart. Reassemble its structures and explore what each one does.',pharmacy:'The garden’s magical mixtures are entirely fictional. Sort our imaginary ingredients and observe how the formulation changes.'}[target.regionId];
 const content=showModal(name,isFaculty?'Faculty guide · fictional fantasy adaptation':target.regionId==='village'?'Study mentor · original fictional character':'Local companion · original fictional character','conversation-modal');
 content.innerHTML=`<div class="conversation-portrait ${target.regionId}">${icon(isFaculty?'GraduationCap':'Compass')}</div><div class="conversation-location">${escape(regionFor(target.regionId).name)}</div><p class="dialogue-text">${escape(state.completed.includes(task)?'You tested an idea and learned from the result. That discovery is now part of the archive. Keep following your curiosity.':dialog)}</p><div class="dialogue-options"><button class="dialogue-choice" id="ask-task">${icon('Flag')} ${state.completed.includes(task)?'Try the activity again':'I’m ready to help'} <span>${escape(def?.title||'Study skills')}</span></button><button class="dialogue-choice" id="ask-field">${icon('BookOpen')} Tell me about this field <span>Verified AUIS information</span></button><button class="dialogue-choice" id="ask-hint">${icon('Sparkles')} Give me a hint <span>A little nudge</span></button></div><div id="conversation-detail" role="status" aria-live="polite"></div><p class="fiction-note">${isFaculty?'The name and academic affiliation are verified. This fantasy role and all game dialogue are fictional; they are not quotations or endorsements.':'This character and conversation were created for the game.'}</p>`;
 content.querySelector('#ask-task').onclick=()=>openActivity(task);
 content.querySelector('#ask-hint').onclick=()=>{content.querySelector('#conversation-detail').innerHTML=`<div class="hint-box">${escape(def?.hint||'Approach the study table and read the supplied clues.')}</div>`;};
 content.querySelector('#ask-field').onclick=()=>{
  content.querySelector('#conversation-detail').innerHTML=`<div class="fact-box"><span class="eyebrow">OFFICIAL ACADEMIC INFORMATION</span><h3>${escape(unit?.unit||'Academic Preparatory Program')}</h3><p>${escape(unit?.summary||preparatory?.summary||'APP prepares students for university study through academic English and study skills.')}</p>${faculty?`<p><strong>${escape(faculty.name)}</strong>: ${escape(faculty.specialty)}</p>`:''}<button class="btn btn-secondary" id="see-entry">Open the archive entry</button></div>`;
  content.querySelector('#see-entry').onclick=()=>openArchive(target.regionId);};
 refreshIcons();
}
function onInteract(target){if(activeModal||!target)return;if(target.type==='activity')openActivity(target.id);else if(target.type==='archive')openArchive();else if(target.type==='beacon')openBeacon();else openConversation(target);}
function openBeacon(){
 const count=lanternCount(state);const el=showModal('The knowledge beacon',count===9?'A world illuminated by curiosity':'Nine fields. One shared light.','beacon-modal');
 el.innerHTML=`<div class="beacon-symbol">${icon('Sparkles')}</div><h3>${count===9?'You brought the light home.':`${count} of 9 lanterns restored`}</h3><p>${count===9?'The beacon shines again. Engineering, computing, business, language, health, society, science, dentistry, and pharmacy each contributed a way to understand the world. Your discoveries remain in the Moulakis Archive.':'The beacon was damaged when its discoveries drifted across the Learning Isles. Complete each academic region’s activity and bring its knowledge back. Both activities in the Department of Engineering contribute one engineering lantern.'}</p><button class="btn btn-primary" id="beacon-journal">${count===9?'Explore your discoveries':'See your next quest'}</button>`;
 el.querySelector('#beacon-journal').onclick=()=>count===9?openArchive():openJournal();refreshIcons();
}
function drawMinimap(){
 const pos=world?.getPosition()||{x:0,z:12};
 document.querySelector('#minimap').innerHTML=`<svg viewBox="0 0 190 190" aria-hidden="true"><defs><radialGradient id="mini-ground"><stop stop-color="#849b65"/><stop offset="1" stop-color="#284b42"/></radialGradient></defs><circle cx="95" cy="95" r="91" fill="url(#mini-ground)"/><path d="M4 112 Q42 119 76 101 T126 93 T188 73" fill="none" stroke="#70b7be" stroke-width="8"/><path d="M95 111 L126 69 M95 111L150 105 M95 111L48 80" stroke="#c9bf87" stroke-width="2" opacity=".65"/>${regions.map(r=>`<circle cx="${95+r.x*.68}" cy="${95+r.z*.68}" r="${r.id==='village'?5:3}" fill="${state.discovered.includes(r.id)?r.color:'#acc29a'}"/>`).join('')}<path transform="translate(${95+pos.x*.68} ${95+pos.z*.68})" d="M0 -7 L5 5 L0 3 L-5 5Z" fill="#fff4be" stroke="#253f37" stroke-width="1.5"/><text x="95" y="19" text-anchor="middle" fill="#fff1c6" font-size="12" font-family="sans-serif">N</text></svg>`;
}
function openMap(){
 const el=showModal('The Learning Isles','Follow a trail. Find a question. Bring back a little light.','wide-modal');
 const complete=r=>(regionActivities[r.id]||[]).every(id=>state.completed.includes(id));
 el.innerHTML=`<div class="map-layout"><div class="map-overview"><div class="world-map"><svg viewBox="0 0 620 540" role="img" aria-label="Numbered map of the Academic Preparatory Program, seven departments and two colleges. Select a full unit name in the legend."><defs><radialGradient id="map-ground"><stop stop-color="#758f57"/><stop offset="1" stop-color="#214540"/></radialGradient></defs><rect width="620" height="540" fill="#20423e"/><path d="M72 190 Q96 50 251 57 Q406 9 540 162 Q598 278 518 427 Q361 513 207 463 Q31 410 72 190Z" fill="url(#map-ground)" stroke="#adc88b" stroke-opacity=".3" stroke-width="2"/><path d="M51 318 Q162 350 281 288 Q348 241 414 277 T588 224" fill="none" stroke="#68abb0" stroke-width="17" opacity=".7"/>${regions.filter(r=>r.id!=='village').map(r=>`<path d="M310 304 L${310+r.x*2.6} ${270+r.z*2.6}" stroke="#d8c391" stroke-width="2" stroke-dasharray="6 5" opacity=".45"/>`).join('')}${regions.map((r,i)=>`<g class="map-node" data-map-region="${r.id}" transform="translate(${310+r.x*2.6} ${270+r.z*2.6})"><title>${escape(r.name)}</title><circle r="17" fill="${r.color}" stroke="#f9e6b1" stroke-width="2"/><text y="5" text-anchor="middle" fill="#173d35" font-size="15" font-weight="700">${i+1}</text>${complete(r)?'<text x="22" y="5" fill="#fff4d4" font-size="18">✓</text>':''}</g>`).join('')}<text x="310" y="520" text-anchor="middle" fill="#cbd6bc" font-size="11" letter-spacing="3">THE LEARNING ISLES</text><text x="570" y="50" fill="#e9d2a1" font-size="19">N</text><path d="M578 58 L578 85 M570 68 L578 58 586 68" fill="none" stroke="#e9d2a1"/></svg></div><div class="map-region-list" aria-label="Select an academic region">${regions.map((r,i)=>`<button data-region="${r.id}" aria-pressed="false"><span class="map-number" style="--region-color:${r.color}">${i+1}</span><span>${escape(r.name)}</span>${complete(r)?`<span class="map-done" aria-label="Activities complete">✓</span>`:''}</button>`).join('')}</div></div><div id="map-detail" class="map-detail" aria-live="polite"></div></div>`;
 const select=(id,reveal=false)=>{
  const r=regionFor(id),unit=lookup(r.id),discovered=state.discovered.includes(r.id);
  el.querySelectorAll('[data-region]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.region===r.id)));
  el.querySelectorAll('[data-map-region]').forEach(node=>node.classList.toggle('active',node.dataset.mapRegion===r.id));
  el.querySelector('#map-detail').innerHTML=`<span class="eyebrow">${discovered?'DISCOVERED REGION':'UNEXPLORED REGION'}</span><h3>${escape(r.name)}</h3><p>${escape(r.subtitle)}</p><div class="map-unit">${icon('GraduationCap')} ${escape(unit?.type||'Preparatory program')} · ${complete(r)?'Activities complete':'Discovery awaits'}</div><p class="subtle">${escape(unit?.summary||preparatory.summary)}</p><div class="region-quest-list">${(regionActivities[r.id]||[]).map(q=>`<div>${icon(state.completed.includes(q)?'Check':'Flag')} ${escape(activityDefinitions[q]?.title)}</div>`).join('')}</div><button class="btn btn-primary" id="travel">${discovered?'Travel to this region':'Follow the trail'}</button><p class="subtle small">${discovered?'Fast travel returns you to a region you have discovered.':'Explore on foot to discover this region and unlock fast travel.'}</p>`;
  el.querySelector('#travel').onclick=()=>{
   closeModal();if(discovered){world.teleport(r.id);persist();toast(`Arrived at ${r.name}`);}
   else{toast(`${r.name} lies ${r.z<0?'north':'south'}${r.x>15?'east':r.x<-15?'west':''} of the Academic Preparatory Program. Follow your map.`);}
  };refreshIcons();
  if(reveal&&innerWidth<=760)el.querySelector('#map-detail').scrollIntoView({block:'start',behavior:'instant'});
 };
 el.querySelectorAll('[data-region]').forEach(n=>n.onclick=()=>select(n.dataset.region,true));
 el.querySelectorAll('[data-map-region]').forEach(n=>n.onclick=()=>select(n.dataset.mapRegion,true));
 select(state.region);refreshIcons();
}
function openJournal(){
 const el=showModal('Your quest journal','Every discovery begins with something you can try.','wide-modal');
 el.innerHTML=`<div class="journal-summary"><span>${icon('Sun')} <strong>${lanternCount(state)} / 9</strong> knowledge lanterns</span><span>${state.completed.length} / ${tasks.length} activities complete</span></div><div class="quest-list">${tasks.map(t=>`<article class="quest-row ${state.completed.includes(t.id)?'completed':''}"><div class="quest-status">${icon(state.completed.includes(t.id)?'Check':'Flag')}</div><div><span class="eyebrow">${escape(regionFor(t.regionId).name)}</span><h3>${escape(t.title)}</h3><p>${escape(t.description)}</p><span class="quest-subject">${escape(t.subject)}</span></div><button class="btn btn-secondary" data-quest="${t.id}">${state.completed.includes(t.id)?'Review':'Find activity'}</button></article>`).join('')}</div>`;
 el.querySelectorAll('[data-quest]').forEach(button=>button.onclick=()=>{const t=activityDefinitions[button.dataset.quest];if(state.completed.includes(t.id))openActivity(t.id);else{closeModal();toast(`Find ${t.title} in ${regionFor(t.regionId).name}. Approach a guide or activity marker.`);}});refreshIcons();
}
function sourceLinks(item){return (item?.sources||[]).map(s=>`<a class="source-link" href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title||'Official AUIS source')} ${icon('ArrowUpRight')}</a>`).join('');}
function openArchive(initial='village'){
 const el=showModal('Moulakis Archive','A home for the knowledge you bring back.','archive-modal wide-modal');
 el.innerHTML=`<div class="archive-layout"><nav class="archive-nav" aria-label="Archive units"><button data-entry="village">${icon('Footprints')} Academic Preparatory Program <small>Preparatory program</small></button>${academics.map(a=>`<button data-entry="${a.id}">${icon('GraduationCap')} ${escape(a.unit)}<small>${escape(a.type)}</small></button>`).join('')}<button data-entry="library">${icon('BookOpen')} The real AUIS library</button><button data-entry="audit">${icon('Info')} Source & classification notes</button></nav><article id="archive-entry"></article></div>`;
 function select(id){
  el.querySelectorAll('[data-entry]').forEach(b=>{b.classList.toggle('active',b.dataset.entry===id);if(b.dataset.entry===id)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});const target=el.querySelector('#archive-entry');target.scrollTop=0;
  if(id==='audit'){target.innerHTML=`<span class="eyebrow">VERIFICATION & CLASSIFICATION</span><h3>Seven linked departments. Two colleges.</h3><p>The academic-programs overview states “eight departments,” but links seven named departments and two colleges. The official 2025–26 catalog and academic directory list seven departments and two colleges. The reason for the overview mismatch is unresolved.</p><div class="fact-box">This game represents the seven linked departments and two colleges as nine academic regions. APP is a preparatory program; it is not counted as a department. Degrees and minors retain their own labels.</div><h4>About the adaptation</h4><p>All fantasy scenery, characters other than identified faculty, story events, activities, and dialogue are original fictional adaptations. Real faculty names and academic subjects are sourced from AUIS. No dialogue is a faculty quotation or endorsement.</p><p class="verification">Verified against public AUIS pages on 6 October 2026. Program offerings and faculty affiliations can change. Follow the official links for current information.</p><a class="source-link" href="https://www.auis.edu.krd/academic-programs" target="_blank" rel="noopener noreferrer">Academic programs overview ${icon('ArrowUpRight')}</a><a class="source-link" href="https://auis.edu.krd/sites/default/files/2025-09/Academic%20Catalog%2025-26%20UPDATED-.pdf" target="_blank" rel="noopener noreferrer">2025–26 Academic Catalog ${icon('ArrowUpRight')}</a>`;}
  else if(id==='library'||id==='village'){const item=id==='library'?library:preparatory;target.innerHTML=`<span class="eyebrow">${id==='library'?'UNIVERSITY LIBRARY':'PREPARATORY PROGRAM'}</span><h3>${escape(item?.unit||'Academic Preparatory Program')}</h3><p>${escape(item?.summary||'Academic English, critical thinking, and university study skills.')}</p><div class="fact-box">${id==='library'?'The fantasy Moulakis Archive is inspired by the real AUIS library’s support for research, information literacy, reading, and writing.':'Academic Preparatory Program turns reading clues, asking questions, and testing an idea into short beginner quests. Its story and characters are fictional.'}</div>${sourceLinks(item)}<p class="verification">Official sources verified 6 October 2026.</p>`;}
  else{const a=lookup(id);if(!a)return;target.innerHTML=`<span class="eyebrow">${escape(a.type)} · OFFICIAL AUIS INFORMATION</span><h3>${escape(a.unit)}</h3><p>${escape(a.summary)}</p><div class="archive-region"><span class="region-color" style="background:${regionFor(id).color}"></span><span>Explore it in <strong>${escape(a.fantasy||regionFor(id).name)}</strong></span></div>${a.degrees?.length?`<h4>Degree programs</h4><div class="program-list">${a.degrees.map(d=>`<div><span>${escape(typeof d==='string'?d:d.name)}</span><small>${escape(d.type||'Degree program')}</small>${d.url?`<a href="${escape(d.url)}" target="_blank" rel="noopener noreferrer" aria-label="Official ${escape(d.name)} page">${icon('ArrowUpRight')}</a>`:''}</div>`).join('')}</div>`:''}${a.minors?.length?`<h4>Minors</h4><div class="chips">${a.minors.map(m=>`<span class="pill">${escape(typeof m==='string'?m:m.name)}</span>`).join('')}</div>`:''}<h4>Faculty guides</h4>${(a.faculty||[]).map(f=>`<div class="faculty-fact"><strong>${escape(f.name)}</strong><p>${escape(f.specialty)}</p><a href="${escape(f.url)}" target="_blank" rel="noopener noreferrer">Official faculty profile ${icon('ArrowUpRight')}</a></div>`).join('')}<h4>Your discoveries</h4><div class="archive-discoveries">${(regionActivities[id]||[]).map(q=>`<div>${icon(state.completed.includes(q)?'Check':'Flag')} ${escape(activityDefinitions[q]?.title)} <small>${state.completed.includes(q)?'Recorded':'Awaiting your discovery'}</small></div>`).join('')}</div><h4>Official sources</h4>${sourceLinks(a)}<p class="verification">Verified 6 October 2026 · Fantasy activities and dialogue are fictional adaptations.</p>`;}
  refreshIcons();
 }
 el.querySelectorAll('[data-entry]').forEach(b=>b.onclick=()=>select(b.dataset.entry));select(initial);refreshIcons();
}
function openSettings(){
 const el=showModal('Make yourself at home','Your camera, sound, and journey.','settings-modal');
 el.innerHTML=`<div class="settings-row"><div><h3>Original music</h3><p>A gentle, original melody for the Learning Isles.</p></div><label class="switch"><input id="music" aria-label="Original music" type="checkbox" ${state.settings.music?'checked':''}/><span></span></label></div><div class="settings-row"><div><h3>Graphics quality</h3><p>Choose a lighter setting for a smoother journey.</p></div><select id="quality" aria-label="Graphics quality"><option value="high" ${state.settings.quality==='high'?'selected':''}>High</option><option value="balanced" ${state.settings.quality==='balanced'?'selected':''}>Balanced</option><option value="low" ${state.settings.quality==='low'?'selected':''}>Low</option></select></div><div class="settings-row"><div><h3>Camera sensitivity</h3><p>Adjust how quickly the view turns when you drag.</p></div><input id="sensitivity" aria-label="Camera sensitivity" type="range" min="0.4" max="2" step="0.1" value="${state.settings.sensitivity}"/></div><div class="settings-row"><div><h3>Reduced motion</h3><p>Calmer scenery and interface animations.</p></div><label class="switch"><input id="reducedMotion" aria-label="Reduced motion" type="checkbox" ${state.settings.reducedMotion?'checked':''}/><span></span></label></div><div class="settings-help"><h3>How to explore</h3><p><strong>WASD / arrows</strong> walk · <strong>Shift</strong> run · <strong>Space</strong> jump<br><strong>Drag</strong> orbit camera · <strong>Scroll</strong> zoom · <strong>E</strong> interact<br><strong>M</strong> map · <strong>J</strong> journal · <strong>L</strong> archive · <strong>Esc</strong> close</p></div><div class="settings-actions"><button class="btn btn-primary" id="save-now">Save journey</button><button class="btn btn-secondary" id="new-journey">Start a new journey</button></div><p class="subtle small" id="save-status" role="status">${saveFailed?'Saving is unavailable in this browser. Current progress remains in this tab.':'Progress is saved automatically in this browser. It stays on this device.'}</p><div id="reset-confirm"></div>`;
 const apply=()=>{state.settings={music:el.querySelector('#music').checked,quality:el.querySelector('#quality').value,sensitivity:Number(el.querySelector('#sensitivity').value),reducedMotion:el.querySelector('#reducedMotion').checked};applyPreferences();syncMusic();updateAudio();persist();};
 el.querySelectorAll('input,select').forEach(c=>c.onchange=apply);el.querySelector('#save-now').onclick=()=>persist(false);
 el.querySelector('#new-journey').onclick=()=>{el.querySelector('#reset-confirm').innerHTML=`<div class="hint-box">Start over and clear this device’s saved discoveries? <button class="btn btn-secondary" id="cancel-reset">Keep my journey</button><button class="btn btn-primary" id="confirm-reset">Start over</button></div>`;el.querySelector('#cancel-reset').onclick=()=>{el.querySelector('#reset-confirm').innerHTML='';el.querySelector('#new-journey').focus({preventScroll:true});};el.querySelector('#cancel-reset').focus({preventScroll:true});el.querySelector('#confirm-reset').onclick=()=>{state=resetState();applyPreferences();syncMusic();updateAudio();world.setProgress([]);world.teleport('village');updateHUD();closeModal();document.querySelector('#welcome').hidden=false;document.querySelector('#begin').focus({preventScroll:true});toast('A new journey begins.');};};refreshIcons();
}
function updateAudio(){document.querySelector('#audio-toggle').innerHTML=icon(state.settings.music?'Volume2':'VolumeX');document.querySelector('#audio-toggle').setAttribute('aria-label',state.settings.music?'Disable original music':'Enable original music');refreshIcons();}
function applyPreferences(){document.body.classList.toggle('reduced-motion',state.settings.reducedMotion);world?.setSettings(state.settings);}
async function syncMusic(){
 const request=++musicRequest,started=await audio.setEnabled(state.settings.music&&!document.hidden);
 if(!started&&request===musicRequest&&state.settings.music&&!document.hidden){state.settings.music=false;updateAudio();persist();toast('Music could not start in this browser. You can try enabling it again in Settings.');}
}
const menus={map:openMap,journal:openJournal,archive:()=>openArchive(),settings:openSettings};
document.querySelectorAll('[data-menu]').forEach(button=>button.onclick=()=>menus[button.dataset.menu]());
document.querySelector('.brand').onclick=e=>{e.preventDefault();openJournal();};
document.querySelector('#minimap').onclick=openMap;
document.querySelector('#quest-collapse').onclick=()=>{const collapsed=document.querySelector('.quest-card').classList.toggle('collapsed');document.querySelector('#quest-collapse').setAttribute('aria-expanded',String(!collapsed));};
document.querySelector('#begin').onclick=()=>{state.welcomed=true;document.querySelector('#welcome').hidden=true;persist();toast('Find Sera by the study table. Approach and press E to talk.');if(state.settings.music)syncMusic();};
document.querySelector('#audio-toggle').onclick=()=>{state.settings.music=!state.settings.music;syncMusic();persist();updateAudio();};
document.querySelector('#touch-interact').onclick=()=>onInteract(currentTarget);
document.querySelectorAll('[data-key]').forEach(b=>{const dispatch=type=>window.dispatchEvent(new KeyboardEvent(type,{code:b.dataset.key,key:b.dataset.key==='Space'?' ':b.dataset.key.slice(-1).toLowerCase(),bubbles:true}));b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);dispatch('keydown');};b.onpointerup=()=>dispatch('keyup');b.onpointercancel=()=>dispatch('keyup');b.onlostpointercapture=()=>dispatch('keyup');});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(activeModal){e.preventDefault();closeModal();}return;}
 if(activeModal){if(e.key==='Tab'){const nodes=[...document.querySelector('.modal').querySelectorAll('button,a,input,select,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last||!document.activeElement.closest('.modal')){e.preventDefault();first?.focus();}}return;}
 if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
 if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
 const key=e.key.toLowerCase();if(['m','j','l'].includes(key)){e.preventDefault();({m:openMap,j:openJournal,l:openArchive})[key]();}
});
try {
 world=createWorld(document.querySelector('#world'),{onRegion,onInteract,onPrompt,onMove(position){state.position=position;if(Date.now()-lastSaved>8000){lastSaved=Date.now();persist();}drawMinimap();},onFrame(metrics){window.__gameMetrics=metrics;}},state);
 applyPreferences();world.setProgress(state.completed);if(state.position)world.restorePosition(state.position);document.querySelector('#world canvas').tabIndex=0;onRegion(state.region||'village');updateHUD();
}catch(error){document.querySelector('#world').innerHTML=`<div class="world-error"><h2>The world could not start.</h2><p>This game needs a browser with WebGL enabled. Try current Chrome, Firefox, or Safari.</p><button class="btn btn-primary" onclick="location.reload()">Try again</button></div>`;console.error(error);}
updateAudio();
const resumeMusic=()=>{if(state.settings.music&&!audio.enabled&&!document.hidden)syncMusic();};
document.addEventListener('pointerdown',resumeMusic,{capture:true});
document.addEventListener('keydown',resumeMusic,{capture:true});
document.addEventListener('visibilitychange',()=>{world?.setPaused(!!activeModal||document.hidden);if(document.hidden){musicRequest++;audio.setEnabled(false);persist();}else resumeMusic();});
window.addEventListener('pagehide',()=>{persist();musicRequest++;audio.setEnabled(false);});
// Read-only observability plus world navigation used by the documented browser QA.
window.__AUIS_GAME__={get state(){return structuredClone(state)},get world(){return world},get metrics(){return world?.getMetrics()},openActivity,openConversation,openMap,openJournal,openArchive,closeModal,get target(){return currentTarget},teleport:id=>world.teleport(id)};
