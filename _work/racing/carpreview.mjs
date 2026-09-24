// Render the F1 car model from 8 directions x 2 tiers into one PNG, using the
// same per-direction face order, back-face rule and sun lighting as the game.
import { createRequire } from 'node:module';
import { f1Car } from './f1car.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const out = process.argv[2] || 'carprev.png';
const M = f1Car();
const html = `<canvas id=c width=1600 height=500></canvas><script>
const M=${JSON.stringify(M)};
const g=document.getElementById('c').getContext('2d');
g.fillStyle='#8fa8c0';g.fillRect(0,0,1600,500);
const KC=[[220,30,36],[240,240,240],[34,34,38],[22,22,24],[150,150,160],[250,210,40],[255,60,50],[120,20,24]];
const SUN=[-0.35,0.86,-0.37];
function draw(ox,oy,dir,tier,elev){
  const a=dir*Math.PI/4, ex=Math.sin(a)*9, ez=Math.cos(a)*9, ey=elev;
  // camera looking at (0,0.4,0)
  const fx=-ex,fy=0.4-ey,fz=-ez,fl=Math.hypot(fx,fy,fz);const F=[fx/fl,fy/fl,fz/fl];
  let R=[F[2],0,-F[0]];const rl=Math.hypot(...R);R=R.map(x=>x/rl);
  const U=[F[1]*R[2]-F[2]*R[1],F[2]*R[0]-F[0]*R[2],F[0]*R[1]-F[1]*R[0]];
  const P=M.V.map(([x,y,z])=>{const d=[x-ex,y-ey,z-ez];const vz=d[0]*F[0]+d[1]*F[1]+d[2]*F[2];
    const vx=d[0]*R[0]+d[1]*R[1]+d[2]*R[2], vy=d[0]*U[0]+d[1]*U[1]+d[2]*U[2];return [ox+vx*300/vz, oy-vy*300/vz];});
  const ord=tier?M.ordHi:M.ordLo, n=tier?M.F.length-M.fLo:M.fLo;
  for(let i=0;i<n;i++){const f=ord[dir*n+i]-1;const q=M.F[f].q.map(k=>P[k-1]);
    // screen y is down here, so the game's "ar > 0" becomes ar < 0
    const [A,B,C,D]=q;const ar=(B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0])+(C[0]-A[0])*(D[1]-A[1])-(C[1]-A[1])*(D[0]-A[0]);
    if(ar>=0)continue;
    const N=M.N[f];const l=0.45+0.6*Math.max(0,N[0]*SUN[0]+N[1]*SUN[1]+N[2]*SUN[2]);
    const c=KC[M.F[f].k].map(v=>Math.min(255,Math.round(v*l)));
    g.fillStyle='rgb('+c+')';g.beginPath();g.moveTo(...A);g.lineTo(...B);g.lineTo(...C);g.lineTo(...D);g.closePath();g.fill();}
}
for(let d=0;d<8;d++){draw(100+d*200,120,d,1,2.4);draw(100+d*200,300,d,1,5.5);draw(100+d*200,440,d,0,2.4);}
</script>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 500 } });
await p.setContent(html);
await p.screenshot({ path: out });
await b.close();
console.log('wrote', out);
