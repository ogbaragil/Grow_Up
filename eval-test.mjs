import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
const code=fs.readFileSync('/tmp/growbundle.js','utf8');
const vc=new VirtualConsole();
vc.on('error', (...a)=>console.error('vc error',...a));
vc.on('jsdomError', e=>console.error('jsdomError',e.stack||e.message));
const dom=new JSDOM('<!doctype html><div id="root"></div>', {url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc});
const w=dom.window;
w.Notification = undefined;
w.navigator.serviceWorker = { register:()=>Promise.resolve() };
w.addEventListener('error', e=>console.error('window error', e.error?.stack||e.error||e.message));
w.addEventListener('unhandledrejection', e=>console.error('unhandled', e.reason));
try { w.eval(code); } catch(e) { console.error('eval throw', e.stack||e); }
setTimeout(()=>{ console.log('BODY', w.document.body.textContent.slice(0,2000)); process.exit(0); }, 2000);
