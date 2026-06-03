import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
const code=fs.readFileSync('/tmp/growbundle2.js','utf8');
const dom=new JSDOM('<!doctype html><div id="root"></div>', {url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true});
const w=dom.window;
w.navigator.serviceWorker = { register:()=>Promise.resolve() };
w.localStorage.setItem('growup_history_monthbar_v1', JSON.stringify({selectedMonth:null, accounts:[], transactions:[], goals:[], monthSnapshots:{}}));
w.addEventListener('error', e=>console.error('window error', e.error?.stack||e.error||e.message));
w.addEventListener('unhandledrejection', e=>console.error('unhandled', e.reason));
try { w.eval(code); } catch(e) { console.error('eval throw', e.stack||e); }
setTimeout(()=>{ console.log('BODY', w.document.body.textContent.slice(0,500)); process.exit(0); }, 1000);
