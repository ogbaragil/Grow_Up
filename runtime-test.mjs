import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';
const html = fs.readFileSync('./dist/index.html','utf8').replaceAll('href="/','href="file://' + process.cwd() + '/dist/').replaceAll('src="/','src="file://' + process.cwd() + '/dist/');
const vc = new VirtualConsole();
vc.on('error', e => console.error('vc error', e));
vc.on('jsdomError', e => console.error('jsdomError', e.message));
vc.on('log', (...args)=>console.log('log',...args));
const dom = new JSDOM(html, { url:'http://localhost/', runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole:vc });
dom.window.addEventListener('error', e => console.error('window error', e.error || e.message));
dom.window.addEventListener('unhandledrejection', e => console.error('unhandled', e.reason));
setTimeout(()=>{
 console.log('BODY:', dom.window.document.body.textContent.slice(0,1000));
 process.exit(0);
}, 3000);
