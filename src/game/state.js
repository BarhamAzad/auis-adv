import { regions } from './regions.js';

// Keep both the storage key and v1 schema: older journeys load without migration.
const KEY = 'auis-lanterns-v1';
const defaults = () => ({version:1, completed:[], discovered:['village'], position:null, welcomed:false, region:'village', settings:{music:false, quality:'high', sensitivity:1, reducedMotion:false}, savedAt:null});
const questIds = new Set(['intro','bridge','energy','commands','market','story','samples','council','light','tooth','ingredients']);
const regionIds = new Set(regions.map(r => r.id));
const uniqueValid = (values, allowed) => Array.isArray(values) ? [...new Set(values.filter(id => allowed.has(id)))] : [];
export function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw || raw.version !== 1) return defaults();
    const base = defaults(), saved = raw.settings || {};
    const position = raw.position && Number.isFinite(raw.position.x) && Number.isFinite(raw.position.z)
      ? {x:Math.max(-110,Math.min(110,raw.position.x)), z:Math.max(-110,Math.min(110,raw.position.z))} : null;
    return {
      ...base,
      completed:uniqueValid(raw.completed, questIds),
      discovered:[...new Set(['village', ...uniqueValid(raw.discovered, regionIds)])],
      position,
      welcomed:raw.welcomed === true,
      region:regionIds.has(raw.region) ? raw.region : 'village',
      savedAt:typeof raw.savedAt === 'string' ? raw.savedAt : null,
      settings:{
        music:saved.music === true,
        quality:['high','balanced','low'].includes(saved.quality) ? saved.quality : base.settings.quality,
        sensitivity:Number.isFinite(saved.sensitivity) ? Math.max(.4,Math.min(2,saved.sensitivity)) : 1,
        reducedMotion:saved.reducedMotion === true,
      },
    };
  } catch { return defaults(); }
}
export function saveState(state) {
  try {
    const savedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify({...state, version:1, savedAt}));
    state.savedAt = savedAt;
    return true;
  } catch { return false; }
}
export function resetState() { try { localStorage.removeItem(KEY); } catch { /* The fresh in-memory journey remains playable. */ } return defaults(); }
export function lanternCount(state) {
  const completed = new Set(Array.isArray(state.completed) ? state.completed : []);
  return [['bridge','energy'],['commands'],['market'],['story'],['samples'],['council'],['light'],['tooth'],['ingredients']].filter(ids => ids.every(id => completed.has(id))).length;
}
export { KEY as SAVE_KEY };
