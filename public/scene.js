/* No Empty Seats · fixed-view Canvas compatibility scene. Original, asset-free artwork. */
(function () {
  'use strict';
  const COLORS = ['#4285f4','#ea4335','#fbbc04','#34a853'];
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const lerp = (a,b,t) => a+(b-a)*t;
  const ease = t => {t=clamp(t,0,1);return t*t*(3-2*t);};
  const hash = n => {const x=Math.sin(n*123.43+77.17)*43758.54;return x-Math.floor(x);};
  const seedFor = value => [...String(value??'idle')].reduce((seed,c)=>Math.imul(seed^c.charCodeAt(0),16777619)>>>0,2166136261);
  const VENUES = [
    {x:-240,z:-164,w:176,d:110,h:98,type:'theatre',name:'BOX OFFICE',color:COLORS[1]},
    {x:190,z:-164,w:160,d:106,h:85,type:'dining',name:'HOST STAND',color:COLORS[3]},
    {x:-240,z:150,w:164,d:104,h:96,type:'music',name:'THE NIGHT CLUB',color:COLORS[0]},
    {x:195,z:154,w:180,d:115,h:75,type:'sports',name:'THE GATE',color:COLORS[2]}
  ];
  class CityScene {
    constructor(canvas,options={}) {
      if(!canvas?.getContext) throw new Error('CityScene requires a canvas');
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw new Error('Canvas 2D is unavailable');
      this.state='idle';this.data={stage:0};this.started=performance.now();this.stateTime=this.started;this.searchTime=this.started;
      this.tourMs=7800;this.returnMs=1800;this.prepareTour('idle');
      this.destroyed=false;this.needsPaint=true;this.camera={x:0,z:0,zoom:.82};this.last=this.started;
      this.media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.reduced=options.reducedMotion??this.media?.matches??false;
      this.onMotion=e=>{this.reduced=e.matches;this.needsPaint=true;};this.media?.addEventListener?.('change',this.onMotion);
      this.resize=this.resize.bind(this);this.frame=this.frame.bind(this);
      this.observer=typeof ResizeObserver==='function'?new ResizeObserver(this.resize):null;this.observer?.observe(canvas);
      window.addEventListener?.('resize',this.resize,{passive:true});this.resize();
      this.raf=requestAnimationFrame(this.frame);
    }
    setState(state,data={}) {
      const now=performance.now(),seed=data.seed??data.huntId??this.seed;
      const changed=state!==this.state,newHunt=seed!==this.seed;
      if(Number.isFinite(data.tourDuration)&&data.tourDuration>0)this.tourMs=clamp(data.tourDuration,1,60)*1000;
      if(Number.isFinite(data.returnDuration)&&data.returnDuration>0)this.returnMs=clamp(data.returnDuration,.1,10)*1000;
      if(state==='returning'&&changed)this.returnFrom=this.heroPoint(now);
      if(state==='searching'&&(changed||newHunt)){
        this.prepareTour(seed);
        this.searchTime=now-(Number.isFinite(data.elapsed)?Math.max(0,data.elapsed)*1000:0);
      }
      if(changed||newHunt)this.stateTime=now;
      this.state=state;this.needsPaint=true;this.data={...this.data,...data};
      if(state==='idle')this.data={stage:0,...data};
      return this;
    }
    setReducedMotion(value){this.reduced=!!value;this.needsPaint=true;}
    prepareTour(seed){
      this.seed=seed;let random=seedFor(seed);
      const next=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
      this.tourOrder=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(next()*(i+1));[this.tourOrder[i],this.tourOrder[j]]=[this.tourOrder[j],this.tourOrder[i]];}
      this.tourOrder.length=3;
      this.tourRoutes=this.tourOrder.map((index,i)=>i?[...this.route(this.tourOrder[i-1]).reverse(),...this.route(index)]:this.route(index));
    }
    tourPhase(t){return Math.min(2,Math.floor(Math.max(0,t-this.searchTime)/(this.tourMs/3)));}
    heroPoint(t){
      if(this.reduced)return {x:60,z:193};
      const elapsed=Math.max(0,t-this.searchTime),phase=this.tourPhase(t),part=(elapsed-phase*this.tourMs/3)/(this.tourMs/3);
      return this.atRoute(this.tourRoutes[phase],ease(part/.8));
    }
    resize(){this.needsPaint=true;const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width||1000);this.height=Math.max(1,r.height||600);this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.base=Math.min(this.width/1070,this.height/630);}
    destroy(){this.destroyed=true;cancelAnimationFrame(this.raf);this.observer?.disconnect();window.removeEventListener?.('resize',this.resize);this.media?.removeEventListener?.('change',this.onMotion);}
    frame(t){if(this.destroyed)return;if((!this.reduced&&t-this.last>=30)||this.needsPaint){this.draw(t);this.needsPaint=false;}this.raf=requestAnimationFrame(this.frame);}
    p(x,z,h=0){return [this.width*.5+(x-this.camera.x-(z-this.camera.z)*.66)*this.scale,this.height*.57+((x-this.camera.x)*.205+(z-this.camera.z)*.48-h)*this.scale];}
    poly(points,fill,stroke,width=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width*this.scale;c.stroke();}}
    line(points,color,width=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width*this.scale;c.lineCap='round';c.lineJoin='round';c.stroke();}
    plane(x,z,w,d,h,color,stroke){this.poly([this.p(x-w/2,z-d/2,h),this.p(x+w/2,z-d/2,h),this.p(x+w/2,z+d/2,h),this.p(x-w/2,z+d/2,h)],color,stroke);}
    block(x,z,w,d,h,top='#d5ccaf',front='#928979',side='#746f65',base=0){const a=this.p(x-w/2,z-d/2,base+h),b=this.p(x+w/2,z-d/2,base+h),cc=this.p(x+w/2,z+d/2,base+h),dd=this.p(x-w/2,z+d/2,base+h);this.poly([b,cc,this.p(x+w/2,z+d/2,base),this.p(x+w/2,z-d/2,base)],side);this.poly([dd,cc,this.p(x+w/2,z+d/2,base),this.p(x-w/2,z+d/2,base)],front);this.poly([a,b,cc,dd],top);}
    front(x,z,w,h,y,color){this.poly([this.p(x-w/2,z,y),this.p(x+w/2,z,y),this.p(x+w/2,z,y+h),this.p(x-w/2,z,y+h)],color);}
    glow(x,z,h,r,color,opacity=.4){const c=this.ctx,p=this.p(x,z,h);c.save();c.globalAlpha=opacity;const g=c.createRadialGradient(...p,0,...p,r*this.scale);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(p[0]-r*this.scale,p[1]-r*this.scale,r*2*this.scale,r*2*this.scale);c.restore();}
    ellipse(x,z,h,rx,ry,color){const p=this.p(x,z,h),c=this.ctx;c.beginPath();c.ellipse(p[0],p[1],rx*this.scale,ry*this.scale,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
    sign(text,x,z,h,size,color='#f9efd1',spacing=0){const c=this.ctx,p=this.p(x,z,h);c.save();c.translate(...p);c.transform(this.scale,this.scale*.205,0,this.scale,0,0);c.font=`700 ${size}px Arial,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;if(spacing&&c.letterSpacing!==undefined)c.letterSpacing=spacing+'px';c.fillText(text,0,0);c.restore();}
    screenLabel(text,x,z,h,color){const c=this.ctx,p=this.p(x,z,h),s=this.scale;const fs=10.5;c.save();c.translate(...p);c.scale(s,s);c.font=`700 ${fs}px Arial,sans-serif`;const w=c.measureText(text).width+25;c.fillStyle='#0d232b';c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.roundRect(-w/2,-11,w,22,11);c.fill();c.stroke();c.fillStyle='#eee7d1';c.textAlign='center';c.textBaseline='middle';c.fillText(text,0,0);c.restore();}
    ring(x,z,r,color,opacity=1){const c=this.ctx;c.save();c.globalAlpha=opacity;const pts=[];for(let i=0;i<=60;i++){const a=i/60*Math.PI*2;pts.push(this.p(x+Math.cos(a)*r,z+Math.sin(a)*r,1));}this.line(pts,color,1.5);c.restore();}
    tree(x,z,size=1){this.block(x,z,5*size,5*size,24*size,'#6b6551','#655643','#4c4636');this.ellipse(x+4,z+4,0,18*size,6*size,'rgba(0,0,0,.18)');for(let k=0;k<3;k++){const p=this.p(x+(k-1)*7*size,z,31*size+(k===1?8:0));const c=this.ctx;c.beginPath();c.ellipse(p[0],p[1],13*size*this.scale,18*size*this.scale,0,0,Math.PI*2);c.fillStyle=['#244f42','#37624b','#315943'][k];c.fill();}}
    lamp(x,z,on=true){this.block(x,z,6,6,3,'#778082','#596568','#45555b');const p=this.p(x,z,4),q=this.p(x,z,62);this.line([p,q],'#839595',2);this.line([q,this.p(x+9,z,64)],'#839595',2);this.ellipse(x+9,z,63,5,2,'#f7e2a1');if(on){this.glow(x+9,z,60,32,'#ffcf76',.38);this.plane(x+7,z+10,36,37,.1,'rgba(255,211,119,.055)');}}
    person(x,z,color='#edb783',height=20){const c=this.ctx;this.ellipse(x,z,0,4,1.8,'rgba(0,0,0,.3)');this.line([this.p(x-2,z,1),this.p(x-2,z,height*.48)],'#1f353d',2);this.line([this.p(x+2,z,1),this.p(x+2,z,height*.48)],'#1f353d',2);this.front(x,z,8,height*.45,height*.3,color);this.ellipse(x,z,height*.85,3,3,'#eac39b');}
    stool(x,z,color='#d8b380'){this.block(x,z,10,8,4,color,'#946950','#775441',12);this.line([this.p(x-3,z,1),this.p(x-3,z,12)],'#b59870',1.4);this.line([this.p(x+3,z,1),this.p(x+3,z,12)],'#b59870',1.4);}
    agent(x,z,index,t,active=true,scale=1){const c=this.ctx;const bob=this.reduced?0:Math.sin(t*.004+index*1.7)*1.5;const color=COLORS[index%4];this.ellipse(x,z,1,8*scale,3*scale,'rgba(0,0,0,.38)');if(active)this.glow(x,z,7,25*scale,color,.17);const p=this.p(x,z,15*scale+bob);c.save();c.translate(...p);c.scale(this.scale*scale,this.scale*scale);c.fillStyle='#132a32';c.beginPath();c.roundRect(-7,-9,14,20,5);c.fill();const g=c.createLinearGradient(-8,-8,8,8);g.addColorStop(0,'#fff9e6');g.addColorStop(1,'#bfc4b2');c.fillStyle=g;c.beginPath();c.roundRect(-8,-9,16,14,6);c.fill();c.fillStyle=color;c.beginPath();c.roundRect(-6,-6,12,8,4);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(-2,-2,1,0,Math.PI*2);c.arc(3,-2,1,0,Math.PI*2);c.fill();c.strokeStyle='#dce1d2';c.lineWidth=2;c.beginPath();c.moveTo(0,-9);c.lineTo(1,-14);c.stroke();c.fillStyle=color;c.beginPath();c.arc(1,-15,2,0,Math.PI*2);c.fill();c.fillStyle='#7c9394';c.beginPath();c.roundRect(-8,7,6,3,1.5);c.roundRect(2,7,6,3,1.5);c.fill();c.restore();}
    taxi(x,z,reverse=false){this.block(x,z,26,12,9,'#f8c93e','#c99b25','#ab8021',3);this.block(x-1,z,14,10,6,'#efc849','#a78020','#987120',12);this.front(x,z+5.2,10,4,13,'#274450');this.block(x,z,4,4,2,'#f7edd2','#c9bda0','#c9bda0',18);for(const xx of [-8,8])this.ellipse(x+xx,z+6,4,2.2,3,'#122932');this.glow(x+(reverse?-15:15),z,6,13,'#ffdd8a',.22);}
    background(t){const c=this.ctx;const g=c.createLinearGradient(0,0,this.width,this.height);g.addColorStop(0,'#163b44');g.addColorStop(.45,'#102b36');g.addColorStop(1,'#091e29');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);c.save();const s=this.base;const halo=c.createRadialGradient(this.width*.52,this.height*.42,5,this.width*.52,this.height*.42,this.width*.58);halo.addColorStop(0,'rgba(84,120,107,.15)');halo.addColorStop(1,'rgba(8,21,30,0)');c.fillStyle=halo;c.fillRect(0,0,this.width,this.height);for(let i=0;i<43;i++){const x=hash(i+31)*this.width,y=hash(i+118)*this.height*.64;c.fillStyle=`rgba(241,221,167,${.04+hash(i)*.13})`;c.beginPath();c.arc(x,y,.5+hash(i+3)*.8,0,Math.PI*2);c.fill();}c.restore();}
    ground(t){this.block(0,4,885,610,18,'#24464b','#15343e','#193942',-22);this.plane(0,4,864,590,-3,'#304f50');this.plane(0,4,844,566,-2,'#18373e');
      // A walkable grid with wide sidewalks and quiet, lane-marked streets.
      this.plane(0,0,826,61,-1,'#142c34');this.plane(0,0,70,555,-.8,'#142c34');
      for(const z of [-44,44])this.plane(0,z,826,19,0,'#5c716d');for(const x of [-47,47])this.plane(x,0,19,555,.1,'#5c716d');
      for(let x=-397;x<412;x+=33)if(Math.abs(x)>55)this.plane(x,0,15,1,0,'#aaac83');for(let z=-267;z<274;z+=31)if(Math.abs(z)>44)this.plane(0,z,1,14,0,'#aaac83');
      for(const x of [-68,68])for(let z=-21;z<=21;z+=7)this.plane(x,z,15,3,.2,'#afb7a4');for(const z of [-65,65])for(let x=-22;x<=22;x+=7)this.plane(x,z,3,13,.2,'#afb7a4');
      // Tessellated pavements around each miniature set.
      VENUES.forEach(v=>{this.block(v.x,v.z,224,165,3,'#748278','#526661','#415b58',-2);for(let j=-2;j<=2;j++)this.line([this.p(v.x-110,v.z+j*31,1.1),this.p(v.x+110,v.z+j*31,1.1)],'#62756d',.6);for(let j=-3;j<=3;j++)this.line([this.p(v.x+j*31,v.z-80,1.1),this.p(v.x+j*31,v.z+80,1.1)],'#62756d',.6);});
      // Subway stairs and the familiar round entrance lights.
      this.plane(58,-258,38,25,1,'#102b34');for(let k=0;k<6;k++)this.line([this.p(41,-268+k*4,1),this.p(75,-268+k*4,1)],'#5d797a',1);for(const x of [38,78]){this.line([this.p(x,-272,2),this.p(x,-272,16),this.p(x,-242,16),this.p(x,-242,2)],'#8ca099',1.2);this.line([this.p(x,-276,2),this.p(x,-276,26)],'#a7b09a',1.2);this.ellipse(x,-276,28,3.6,3.6,'#65bc94');this.glow(x,-276,28,11,'#65bc94',.3);}
      this.sign('SUBWAY',58,-242,10,4.4,'#d9e6cf');
      // Waterfront dashes catch the light at the edge of the island.
      for(let i=0;i<24;i++){const x=-420+i*36;this.plane(x,306,20,1,-10,'rgba(117,164,161,.2)');}
      if(!this.reduced){this.taxi(-385+(t*.023%770),-15);this.taxi(390-(t*.017%780),18,true);}else this.taxi(290,18,true);
    }
    surrounding(){
      // Small silhouettes add density without hiding the four venues.
      const b=[[-397,-221,28,39,70],[-365,-236,29,39,100],[-325,-249,38,34,116],[310,-252,34,32,101],[354,-223,44,38,78],[391,-213,32,45,118],[-408,123,30,42,80],[-401,208,33,35,59],[342,238,32,35,57],[391,213,36,44,84]];
      b.forEach((a,i)=>{const [x,z,w,d,h]=a;this.block(x,z,w,d,h,'#49625d','#304e4e','#284449');this.block(x,z,w+3,d+3,3,'#62756a','#536962','#3e5855',h);for(let yy=14;yy<h-8;yy+=17)for(let xx=-w/2+7;xx<w/2-4;xx+=10){const on=hash(i*100+xx+yy)>.4;this.front(x+xx,z+d/2+.2,4,7,yy,on?'#b0a47a':'#213d42');}if(i===2||i===5){this.block(x,z,16,15,19,'#5c6d60','#4e6256','#3a554f',h+3);this.line([this.p(x,z,h+22),this.p(x,z,h+48)],'#79867a',1);}});
    }
    shell(v,t,frontColor,backColor){const {x,z,w,d,h}=v;this.block(x,z,w+8,d+8,6,'#c8bda0','#8d927b','#77836f',2);this.plane(x,z,w,d,9,'#a68766');this.block(x,z-d/2+4,w,8,h,backColor,frontColor,'#625c4e',9);this.block(x-w/2+4,z,8,d,h-3,backColor,frontColor,'#675d4d',9);this.block(x+w/2-4,z-d*.1,8,d*.8,h-3,backColor,frontColor,'#6c6554',9);
      this.plane(x,z,w-14,d-14,9.3,'#5e5347');
      // Open fronts make the host, clerk and room legible like a small film set.
      this.glow(x,z+5,38,92,'#e9ad54',.21);
    }
    theatre(v,t,active){const {x,z,w,d,h}=v;this.shell(v,t,'#9b7256','#d9c49c');const rear=z-d/2+9;
      this.front(x,rear,102,62,22,'#402e32');for(let k=0;k<12;k++)this.front(x-49+k*9,rear+.3,4,60,23,k%2?'#6f2836':'#883446');this.front(x,rear+1,55,61,22,'#1a2832');this.front(x,rear+2,39,3,34,'#a1814e');
      // Three physical seat rows, with one softly illuminated empty chair.
      for(let r=0;r<3;r++)for(let col=0;col<7;col++){const sx=x-49+col*16,sz=z-14+r*17;this.block(sx,sz,11,8,7,'#913f4d','#662c3a','#572735',11);this.front(sx,sz-3.5,11,10,17,'#a9505a');if(r===1&&col===4&&active){this.glow(sx,sz,23,17,'#ffcf71',.5);}}
      // Brass-topped ticket counter and clerk, at the open street edge.
      const f=z+d/2+1;this.block(x+55,f-8,46,21,30,'#d7bb7c','#875237','#624635',9);this.front(x+55,f+3,35,17,17,'#56322b');this.sign('TICKETS',x+55,f+3.4,26,5.7,'#ecd7a9');this.person(x+58,f-24,'#657773',32);this.block(x+46,f-6,12,8,3,'#1a3a42','#142f37','#15303a',40);this.front(x+46,f-1,11,8,43,'#78b9a5');
      this.block(x,f+5,w+16,27,13,'#c09354','#57333a','#694634',h-3);this.sign('N O   E M P T Y   S E A T S',x,f+19,h+3,7.2,'#ffdf9a');for(let k=0;k<17;k++){const bx=x-w/2+k*w/16;this.ellipse(bx,f+20,h-4,1.55,1.7,'#ffe3a0');if(active&&k%4===Math.floor(t*.006)%4)this.glow(bx,f+20,h-4,10,'#ffc76c',.45);}this.front(x-70,f+1,13,69,13,'#713a42');this.front(x+79,f+1,8,69,13,'#713a42');
      this.block(x-62,f+17,24,2,39,'#cdba8e','#eddeb5','#b59f78',4);this.sign('TONIGHT',x-62,f+19,34,4.6,'#7b3b36');for(let k=0;k<3;k++)this.front(x-62,f+19,14-k*2,1,25-k*4,'#b18660');
      if(active){this.front(x+63,f+5,13,8,37,'#fff0c9');this.line([this.p(x+48,f-1,48),this.p(x+48,f-1,50)],COLORS[1],2);}
    }
    restaurant(v,t,active){const {x,z,w,d,h}=v;this.shell(v,t,'#bdad84','#efe2b9');const rear=z-d/2+9;this.front(x,rear,120,48,24,'#2e5550');for(let k=0;k<4;k++)this.front(x-45+k*30,rear+1,1.7,48,24,'#b7a575');this.front(x,rear+1,122,2,48,'#b7a575');
      for(const xx of [-43,26])for(const zz of [-15,25]){this.block(x+xx,z+zz,30,24,2,'#eee4c9','#c8bba0','#c8bba0',30);this.block(x+xx,z+zz,3,3,20,'#b6a37c','#8d805e','#8d805e',10);for(const dz of [-19,19]){this.stool(x+xx,z+zz+dz,'#44745d');this.front(x+xx,z+zz+dz,11,10,19,'#587c62');}this.ellipse(x+xx-7,z+zz,32,4,1.8,'#faf7e9');this.ellipse(x+xx+7,z+zz,32,4,1.8,'#faf7e9');this.line([this.p(x+xx,z+zz,33),this.p(x+xx,z+zz,40)],'#e8ba79',1);this.glow(x+xx,z+zz,42,13,'#ffce85',.5);}
      for(const xx of [-47,32]){this.line([this.p(x+xx,z-20,h),this.p(x+xx,z-20,63)],'#625744',1);this.block(x+xx,z-20,18,14,4,'#cfa963','#dbb473','#af8d58',58);this.glow(x+xx,z-20,55,36,'#edb262',.2);}
      const f=z+d/2+2;this.block(x+57,f-3,32,18,34,'#7c5f3c','#456653','#2d5146',9);this.person(x+57,f-19,'#e7dac0',29);this.plane(x+57,f-3,25,12,44,'#fff2ce');this.line([this.p(x+57,f-9,44.2),this.p(x+57,f+3,44.2)],'#ad9d7b',.6);for(let k=0;k<3;k++)this.line([this.p(x+46,f-6+k*3,44.3),this.p(x+54,f-6+k*3,44.3)],'#bcad8b',.7);this.ellipse(x+66,f+1,46,2.8,1.8,'#d9b65d');
      this.block(x,f+8,w+11,26,5,'#e3d3a5','#46715b','#345840',h-2);for(let k=0;k<10;k++)this.plane(x-w/2+8+k*16,f+8,8,27,h+3.1,'#3c6b54');this.front(x,f+22,w+11,12,h-12,'#3f6b53');this.sign('HOST  STAND',x,f+22.3,h-6,7.6,'#f6e9be');for(const xx of [-68,74]){this.block(x+xx,f+10,12,12,15,'#b08256','#a1784f','#866646',8);this.tree(x+xx,f+10,.5);}
      if(active){this.glow(x+57,f,45,20,'#fff0aa',.32);this.front(x+38,f+11,8,10,14,'#ffe9b7');}
    }
    jazz(v,t,active){const {x,z,w,d,h}=v;this.shell(v,t,'#8d6f61','#c7ad8c');const rear=z-d/2+9;this.front(x,rear,125,69,16,'#283744');for(let j=0;j<13;j++)this.front(x-60+j*10,rear+.2,1,66,17,'#394652');this.block(x-31,z-20,64,37,10,'#55464b','#3c333f','#3d323d',10);
      // Tiny piano, double bass and overhead theatre lights.
      this.block(x-39,z-22,26,15,17,'#19272f','#131f29','#15232d',21);this.plane(x-39,z-11,25,5,34,'#ded6b7');for(let k=0;k<6;k++)this.plane(x-49+k*4,z-10,1,4,34.2,'#1e2c32');this.person(x-37,z-2,'#d5b57d',25);this.ellipse(x-4,z-26,37,7,10,'#b5804d');this.line([this.p(x-4,z-26,44),this.p(x-4,z-26,60)],'#d7b572',2);this.person(x+8,z-29,'#8d9b90',31);
      for(const xx of [-45,0,43]){this.ellipse(x+xx,z+27,30,12,5,'#8b6850');this.block(x+xx,z+27,2,2,20,'#866b52','#655643','#655643',9);this.stool(x+xx-14,z+30,'#945b51');this.stool(x+xx+13,z+21,'#945b51');this.ellipse(x+xx,z+27,33,2,2,'#f9d483');this.glow(x+xx,z+27,34,10,'#f9d483',.35);}
      for(const xx of [-35,22]){this.block(x+xx,z-20,7,7,5,'#b5996a','#8b7659','#77654e',h-9);this.poly([this.p(x+xx,z-20,h-12),this.p(x+xx-21,z-7,22),this.p(x+xx+22,z-7,22)],active?'rgba(139,155,246,.12)':'rgba(215,169,109,.05)');}
      const f=z+d/2+2;this.block(x,f+1,w+7,16,12,'#54758a','#294751','#294550',h-4);this.sign('LIVE MUSIC',x-9,f+10,h+2,11.5,'#b1e7eb');this.glow(x,f+9,h,65,'#3d9bbc',.18);this.front(x-74,f+1,9,h-13,9,'#334854');this.front(x+74,f+1,9,h-13,9,'#334854');
      this.block(x+53,f+12,21,14,25,'#475c59','#324841','#2c443f',8);this.person(x+52,f-2,'#c2a168',29);this.front(x+53,f+20,13,12,17,'#b6cfb5');this.sign('LIVE',x+53,f+20.2,23,5,'#264a49');
      for(const xx of [-55,-28]){this.line([this.p(x+xx,f+14,2),this.p(x+xx,f+14,24)],'#ad996c',1.5);this.ellipse(x+xx,f+14,25,2,2,'#dac18d');}this.line([this.p(x-55,f+14,21),this.p(x-42,f+14,17),this.p(x-28,f+14,21)],'#bd6154',2);
      if(active){const m=this.reduced?0:t*.002;for(let k=0;k<3;k++){const p=this.p(x-23+k*17,z-12,61+Math.sin(m+k)*3);this.ctx.save();this.ctx.fillStyle='#b3d5df';this.ctx.font=`${13*this.scale}px Arial`;this.ctx.fillText('♪',...p);this.ctx.restore();}}
    }
    stadium(v,t,active){const {x,z,w,d,h}=v;this.block(x,z,w+8,d+10,6,'#a9b1a0','#707e75','#5b706c',2);this.plane(x,z,w,d,9,'#39745d');
      // Banked seats and a tiny court, viewed through an open stadium gate.
      for(let row=0;row<4;row++){this.block(x,z-d/2+7+row*10,w-10,12,(4-row)*10,'#7b9795','#4d7478','#44666a',9);for(let col=0;col<13;col++)this.block(x-w/2+14+col*12,z-d/2+10+row*10,8,6,4,col%3===0?'#9bb3a4':'#648e93','#426b71','#426b71',9+(4-row)*10);}
      this.plane(x,z+25,130,48,9.4,'#4d8868');this.plane(x,z+25,70,40,9.5,'#ad835d');this.line([this.p(x-31,z+7,9.8),this.p(x+31,z+7,9.8),this.p(x+31,z+43,9.8),this.p(x-31,z+43,9.8),this.p(x-31,z+7,9.8)],'#d6c597',.8);this.line([this.p(x,z+7,9.9),this.p(x,z+43,9.9)],'#d6c597',.8);this.ring(x,z+25,10,'#e0ca98',.7);
      this.block(x,z-d/2-1,w+8,8,9,'#829289','#496766','#375558',63);this.front(x,z-d/2+4,69,25,39,'#19373d');this.sign('NEW YORK',x,z-d/2+4.5,55,7,'#ead9a4');this.sign('HOME   •   AWAY',x,z-d/2+4.5,45,4,'#8fac9b');
      const f=z+d/2;for(const xx of [-73,73])this.block(x+xx,f,18,20,58,'#bdc3ad','#698983','#537974',9);this.block(x,f,w+6,21,12,'#d6c795','#345e61','#396568',66);this.sign('ARENA GATE',x,f+11,72,9,'#eee4b9');for(const xx of [-41,-13,16,44]){this.block(x+xx,f+2,4,6,20,'#bdc1a6','#789690','#648882',9);this.line([this.p(x+xx-8,f+2,24),this.p(x+xx+8,f+2,24)],'#b7baa0',1.6);this.line([this.p(x+xx,f-6,24),this.p(x+xx,f+10,24)],'#b7baa0',1.6);}
      this.person(x+65,f-14,'#d3be67',28);for(const xx of [-83,83]){this.line([this.p(x+xx,z-30,5),this.p(x+xx,z-30,108)],'#91aaa0',2);this.block(x+xx,z-30,25,5,7,'#e8d599','#bdc6a9','#c1c1a3',105);for(let k=0;k<4;k++)this.glow(x+xx-9+k*6,z-27,110,11,'#fff4ba',.21);}
      if(active)this.glow(x+21,f,28,26,'#efcd57',.27);
    }
    hub(t){const x=60,z=152;this.block(x,z,60,50,9,'#b6c3b0','#6d8c83','#577c77',1);this.block(x,z,47,36,19,'#ded9bd','#acb49d','#819b8d',10);this.block(x,z,47,36,2,'#f4edd5','#c6ccb2','#a4b99e',29);this.front(x,z+18.1,37,11,14,'#1d454b');for(let k=0;k<4;k++)this.ellipse(x-12+k*8,z+19,20,2,2,COLORS[k]);this.sign('N E S',x,z+19,26,4.8,'#f6e6bd');this.block(x,z-9,28,17,2,'#405f61','#30545a','#2c4b53',34);this.plane(x,z-9,21,10,36.1,'#618f88');if(this.state==='idle'){for(let i=0;i<4;i++)this.agent(x-34+i*19,z+48,i,t,false,1);}}
    route(index){const v=VENUES[index],lane=19+(index-1.5)*4;return index<2?[{x:60+(index-1.5)*11,z:193},{x:lane,z:175},{x:lane,z:44},{x:v.x,z:44},{x:v.x,z:v.z+v.d/2+25}]:[{x:60+(index-1.5)*11,z:193},{x:lane,z:213},{x:lane,z:265+(index-2)*5},{x:v.x,z:265+(index-2)*5},{x:v.x,z:v.z+v.d/2+25}];}
    atRoute(route,progress){const lengths=[];let total=0;for(let i=1;i<route.length;i++){const l=Math.hypot(route[i].x-route[i-1].x,route[i].z-route[i-1].z);lengths.push(l);total+=l;}let distance=clamp(progress,0,1)*total;for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]){const f=distance/lengths[i];return {x:lerp(route[i].x,route[i+1].x,f),z:lerp(route[i].z,route[i+1].z,f)};}distance-=lengths[i];}return route.at(-1);}
    trails(t){
      if(!['searching','returning'].includes(this.state))return;
      const c=this.ctx,phase=this.tourPhase(t),elapsed=Math.max(0,t-this.searchTime),legMs=this.tourMs/3;
      for(let i=0;i<=phase;i++){
        const progress=this.reduced||i<phase?1:ease((elapsed-i*legMs)/(legMs*.8)),pts=[];
        for(let k=0;k<=40;k++){const a=this.atRoute(this.tourRoutes[i],progress*k/40);pts.push(this.p(a.x,a.z,2));}
        c.save();c.globalAlpha=.14;this.line(pts,COLORS[0],6);c.globalAlpha=.65;this.line(pts,COLORS[0],1.2);c.restore();
      }
      const returning=this.state==='returning',f=this.reduced?1:ease((t-this.stateTime)/this.returnMs);
      const from=this.returnFrom||this.heroPoint(t),p=returning?{x:lerp(from.x,60,f),z:lerp(from.z,193,f)}:this.heroPoint(t);
      this.agent(p.x,p.z,0,this.reduced?this.started:t,true,1);
      if(returning){
        const scale=1+ease((f-.6)/.4)*1.7;
        this.glow(p.x,p.z,35,35*scale,'#ffdb68',.25);
        this.front(p.x+12,p.z+2,21*scale,11*scale,26,'#ffdc78');
        this.sign('NES',p.x+12,p.z+2.1,26+5.5*scale,4*scale,'#755123');
      }else{
        const v=VENUES[this.tourOrder[phase]],q=this.reduced?.5:(t*.0006)%1;
        this.ring(v.x,v.z+v.d/2+17,10+q*15,COLORS[0],(1-q)*.65);
      }
    }
    draw(t=performance.now()){
      const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);this.last=t;
      const category=this.data.category||'theatre';const selected=category==='dining'?1:category==='sports'?3:category==='music'||category==='comedy'?2:0;
      let active=-1;
      if(this.state==='searching')active=this.tourOrder[this.tourPhase(t)];
      else if(['offer','booking','confirmed'].includes(this.state))active=selected;
      // One complete overview in every state. Only the canvas fitting changes on resize.
      this.camera.x=0;this.camera.z=0;this.camera.zoom=.82;
      this.scale=this.base*this.camera.zoom;
      if(this.reduced)t=this.started;
      this.background(t);this.ground(t);this.surrounding();
      const nodes=VENUES.map((v,i)=>({z:v.x*.205+v.z*.48,run:()=>{this[v.type==='theatre'?'theatre':v.type==='dining'?'restaurant':v.type==='music'?'jazz':'stadium'](v,t,active===i);}}));
      const trees=[[-355,-60],[-126,-231],[100,-230],[321,-77],[-352,83],[-124,235],[301,84],[326,265],[-381,265]];for(const [x,z]of trees)nodes.push({z:x*.205+z*.48,run:()=>this.tree(x,z,.86)});
      for(const [x,z]of [[-120,-39],[120,39],[-40,-236],[-40,228],[-341,40],[344,-40]])nodes.push({z:x*.205+z*.48,run:()=>this.lamp(x,z)});
      nodes.push({z:60*.205+152*.48,run:()=>this.hub(t)});nodes.sort((a,b)=>a.z-b.z);nodes.forEach(n=>n.run());this.trails(t);
      if(['offer','booking','confirmed'].includes(this.state)){const v=VENUES[selected],end={x:v.x,z:v.z+v.d/2+27};for(let i=0;i<4;i++){const route=this.route(i),from=this.atRoute(route,1);const f=this.reduced?1:ease((t-this.stateTime)/1800);const pos={x:lerp(from.x,end.x+(i-1.5)*17,f),z:lerp(from.z,end.z+Math.abs(i-1.5)*4,f)};this.agent(pos.x,pos.z,i,t,true,1);}this.ring(end.x,end.z,42,'#f9df91',.45);this.glow(end.x,end.z,45,92,'#ffe6ac',.16);if(this.state==='confirmed'&&!this.reduced)for(let i=0;i<22;i++){const p=(t*.00015+hash(i))%1;const x=end.x+(hash(i+27)-.5)*170;const z=end.z+(hash(i+61)-.5)*60;this.ellipse(x,z,50+p*90,1.5,1.5,COLORS[i%4]);}}
      // A quiet edge vignette gives the scene the depth of a physical installation.
      const vignette=c.createRadialGradient(this.width/2,this.height*.47,this.width*.12,this.width/2,this.height*.47,Math.max(this.width,this.height)*.67);vignette.addColorStop(0,'rgba(3,16,23,0)');vignette.addColorStop(.65,'rgba(3,16,23,.02)');vignette.addColorStop(1,'rgba(3,16,23,.43)');c.fillStyle=vignette;c.fillRect(0,0,this.width,this.height);
    }
  }
  window.CityScene=CityScene;
})();
