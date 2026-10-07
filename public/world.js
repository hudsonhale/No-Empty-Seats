/* No Empty Seats — an always-living, fixed-camera miniature. Decorative stories are not inventory claims. */
(()=>{'use strict';
const T=window.THREE;if(!T)return;
const TAU=Math.PI*2,V=(x,y,z)=>new T.Vector3(x,y,z),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const C={cream:'#f6e8cd',ivory:'#dacfaa',tomato:'#bd573d',cobalt:'#426ca5',lime:'#b3b657',pink:'#b9817b',teal:'#477c79',ink:'#384b4c',gold:'#e4b953',leaf:'#4e7353',wood:'#997551',brick:'#a56850'};
function random(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
class LivingWorld{
constructor(canvas,options={}){
 this.canvas=canvas;this.options=options;this.reducedMotion=!!options.reducedMotion;this.state='idle';this.data={};this.started=performance.now();this.stateAt=0;this.searchOffset=0;this.lastFrame=0;this.dead=false;
 this.materials=new Map();this.geometries=new Map();this.textures=[];this.actors=[];this.vehicles=[];this.dynamics=[];this.venues=[];this.lights=[];this.mixers=[];this.seed=419;this.night=false;this.personScale=.68;this.groundY=.54;
 this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
 this.scene=new T.Scene();this.scene.background=new T.Color('#ece7dd');
 this.camera=new T.OrthographicCamera(-28,28,20,-20,.1,200);
 // The camera is deliberately immutable during every idle, search and reveal state.
 this.target=V(.3,3.9,1.4);this.camera.position.copy(this.target).add(V(45,42,58));this.camera.lookAt(this.target);
 this.ambient=new T.HemisphereLight('#fff5e3','#897c6b',2.0);this.scene.add(this.ambient);
 this.sun=new T.DirectionalLight('#ffe6bb',2.5);this.sun.position.set(-24,40,28);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-34,right:34,top:30,bottom:-30,near:1,far:110});this.sun.shadow.normalBias=.045;this.sun.shadow.bias=-.00012;this.sun.shadow.radius=4;this.scene.add(this.sun);
 this.rim=new T.DirectionalLight('#dde9df',1.4);this.rim.position.set(28,20,-25);this.scene.add(this.rim);
 this.setupGeometry();this.environment();this.buildWorld();this.batchStatic();this.configureJourney(this.seed);
 this.resize=this.resize.bind(this);this.resize();this.resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(this.resize):null;this.resizeObserver?.observe(canvas);window.addEventListener('resize',this.resize);this.tick=this.tick.bind(this);this.ready=true;this.raf=requestAnimationFrame(this.tick);
}
mat(color,extra={}){const key=color+JSON.stringify(extra);if(!this.materials.has(key))this.materials.set(key,new T.MeshPhysicalMaterial({color,roughness:.86,metalness:0,clearcoat:.025,clearcoatRoughness:.75,...extra}));return this.materials.get(key);}
setupGeometry(){this.geometries.set('box',new T.BoxGeometry(1,1,1));const rb=new T.BoxGeometry(1,1,1,5,5,5),p=rb.attributes.position;for(let i=0;i<p.count;i++){const q=V(p.getX(i),p.getY(i),p.getZ(i)),core=V(clamp(q.x,-.40,.40),clamp(q.y,-.40,.40),clamp(q.z,-.40,.40));q.sub(core).normalize().multiplyScalar(.10).add(core);p.setXYZ(i,q.x,q.y,q.z);}rb.computeVertexNormals();this.geometries.set('round',rb);this.geometries.set('sphere',new T.SphereGeometry(1,20,14));this.geometries.set('cyl',new T.CylinderGeometry(1,1,1,24));this.geometries.set('cone',new T.ConeGeometry(1,1,24));this.geometries.set('capsule',new T.CapsuleGeometry(.5,1,5,12));this.geometries.set('plane',new T.PlaneGeometry(1,1));this.geometries.set('torus',new T.TorusGeometry(1,.065,8,48));}
environment(){const cv=document.createElement('canvas');cv.width=512;cv.height=256;const ctx=cv.getContext('2d'),g=ctx.createLinearGradient(0,0,0,256);g.addColorStop(0,'#d5eaff');g.addColorStop(.42,'#8ba5ac');g.addColorStop(.5,'#f4d9aa');g.addColorStop(1,'#51616b');ctx.fillStyle=g;ctx.fillRect(0,0,512,256);ctx.fillStyle='#fff5de';ctx.fillRect(62,20,38,102);ctx.fillStyle='#eff9ff';ctx.fillRect(315,35,16,75);const tx=new T.CanvasTexture(cv);tx.mapping=T.EquirectangularReflectionMapping;tx.colorSpace=T.SRGBColorSpace;this.textures.push(tx);this.scene.environment=tx;}
texture(type,a,b){const key='texture:'+type+a+b;if(this.materials.has(key))return this.materials.get(key);const cv=document.createElement('canvas');cv.width=cv.height=256;const cx=cv.getContext('2d');cx.fillStyle=a;cx.fillRect(0,0,256,256);const rand=random(893);if(type==='brick'){cx.fillStyle=b;for(let y=0;y<256;y+=32){cx.fillRect(0,y,256,3);for(let x=(y/32%2)*32;x<256;x+=64)cx.fillRect(x,y,3,32);}for(let i=0;i<2600;i++){cx.fillStyle=rand()>.5?'#ffffff0b':'#0000000d';cx.fillRect(rand()*256,rand()*256,rand()*7+1,1);}}else if(type==='tile'){cx.fillStyle=b;for(let x=0;x<256;x+=32){cx.fillRect(x,0,2,256);cx.fillRect(0,x,256,2);}for(let y=0;y<8;y++)for(let x=0;x<8;x++)if((x+y)%2){cx.fillStyle='#ffffff17';cx.fillRect(x*32+2,y*32+2,30,30);}}else if(type==='wood'){for(let i=0;i<75;i++){cx.strokeStyle=i%2?'#30140218':'#ffffdd1d';cx.lineWidth=.5+rand()*2;cx.beginPath();cx.moveTo(rand()*256,0);cx.bezierCurveTo(rand()*256,80,rand()*256,160,rand()*256,256);cx.stroke();}cx.fillStyle=b;for(let i=0;i<4;i++)cx.fillRect(i*64,0,2,256);}else{for(let i=0;i<3800;i++){cx.fillStyle=[b,'#eee0cf','#354e5522','#ffffff24'][i%4];cx.beginPath();cx.ellipse(rand()*256,rand()*256,.4+rand()*1.8,.3+rand()*1.2,rand()*6,0,TAU);cx.fill();}}const tx=new T.CanvasTexture(cv);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(type==='brick'?2:1.5,type==='brick'?2:1.5);tx.colorSpace=T.SRGBColorSpace;this.textures.push(tx);const mat=new T.MeshPhysicalMaterial({map:tx,roughness:type==='tile'?.68:.88,metalness:0,clearcoat:0});this.materials.set(key,mat);return mat;}
mesh(kind,col,pos,scale,parent=this.scene,opts={}){const m=new T.Mesh(this.geometries.get(kind),typeof col==='string'?this.mat(col):col);m.position.set(...pos);m.scale.set(...scale);m.castShadow=opts.shadow!==false;m.receiveShadow=true;m.userData.batch=opts.batch!==false;parent.add(m);return m;}
group(x=0,z=0,r=0,y=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=r;this.scene.add(g);return g;}
dynamic(g){g.traverse(o=>{if(o.isMesh)o.userData.batch=false;});return g;}
curve(points,closed=false,y=.24){return new T.CatmullRomCurve3(points.map(p=>V(p[0],p.length>2?p[1]:y,p.length>2?p[2]:p[1])),closed,'catmullrom',.32);}
ribbon(curve,width,col,y=0,segments=160){const pts=[],uv=[],idx=[];for(let i=0;i<=segments;i++){const u=i/segments,p=curve.getPoint(u),t=curve.getTangent(u),n=V(-t.z,0,t.x).normalize().multiplyScalar(width/2);pts.push(p.x+n.x,p.y+y,p.z+n.z,p.x-n.x,p.y+y,p.z-n.z);uv.push(0,u*12,1,u*12);if(i<segments){const j=i*2;idx.push(j,j+2,j+1,j+1,j+2,j+3);}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();const m=new T.Mesh(geo,typeof col==='string'?this.mat(col,{side:T.DoubleSide}):col);m.receiveShadow=true;this.scene.add(m);return m;}
organic(points,depth,col,y=0){const pts=this.curve(points,true,0).getPoints(120),shape=new T.Shape();shape.moveTo(pts[0].x,-pts[0].z);pts.slice(1).forEach(p=>shape.lineTo(p.x,-p.z));const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.12,bevelSize:.18,bevelSegments:4,steps:1,curveSegments:8});geo.rotateX(-Math.PI/2);const m=new T.Mesh(geo,typeof col==='string'?this.mat(col):col);m.position.y=y-depth;m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
sign(text,w,h,fg=C.cream,bg=C.ink,parent=this.scene,pos=[0,0,0],glow=false){const cv=document.createElement('canvas');cv.width=512;cv.height=Math.max(96,Math.round(512*h/w));const cx=cv.getContext('2d');cx.fillStyle=bg;cx.fillRect(0,0,cv.width,cv.height);cx.fillStyle=fg;cx.textAlign='center';cx.textBaseline='middle';cx.font='800 '+Math.floor(Math.min(cv.height*.59,478/(text.length*.63)))+'px Arial,sans-serif';cx.fillText(text,256,cv.height/2+1);const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;this.textures.push(tex);const mat=new T.MeshPhysicalMaterial({map:tex,roughness:.76,clearcoat:.04,side:T.DoubleSide,...(glow?{emissive:new T.Color('#ffba67'),emissiveMap:tex,emissiveIntensity:.3}:{})});return this.mesh('plane',mat,pos,[w,h,1],parent,{shadow:false});}
tube(points,r,col,parent=this.scene){const curve=new T.CatmullRomCurve3(points.map(p=>V(...p))),geo=new T.TubeGeometry(curve,Math.max(12,points.length*5),r,6,false),m=new T.Mesh(geo,this.mat(col));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
glow(col=C.gold){return this.mat(col,{emissive:col,emissiveIntensity:.65,roughness:.2,clearcoat:1});}
floor(g,w=5,d=4,col='#e4cfaa',checker=false){this.mesh('round',C.ivory,[0,.35,0],[w+.25,.5,d+.25],g);this.mesh('box',this.texture(checker?'tile':'wood',col,checker?'#76624d':'#9a785c'),[0,.64,0],[w,.10,d],g);if(checker){for(let x=0;x<8;x++)for(let z=0;z<6;z++)if((x+z)%2===0)this.mesh('box','#566b60',[(x-3.5)*w/8,.70,(z-2.5)*d/6],[w/8,.025,d/6],g,{shadow:false});}}
frame(g,x,y,z,w,h,color=C.gold){this.mesh('round',color,[x,y,z],[w,h,.12],g);this.mesh('box',this.glow('#ffd987'),[x,y,z+.08],[w-.12,h-.12,.035],g);for(const xx of[-.25,.25])this.mesh('box',C.ivory,[x+xx*w,y,z+.12],[.035,h,.04],g);this.mesh('box',C.ivory,[x,y,z+.13],[w,.04,.04],g);}
pendant(g,x,y,z,col=C.lime){this.mesh('cyl','#68543d',[x,y+.47,z],[.02,.86,.02],g);this.mesh('cone',col,[x,y,z],[.42,.35,.42],g);this.mesh('sphere',this.glow('#fff0bd'),[x,y-.14,z],[.22,.07,.22],g);}
chair(g,x,y,z,col=C.tomato,r=0){const a=new T.Group();a.position.set(x,y,z);a.rotation.y=r;g.add(a);this.mesh('round',col,[0,.45,0],[.58,.16,.58],a);this.mesh('round',col,[0,.78,-.22],[.60,.6,.16],a);for(const sx of[-.19,.19])for(const sz of[-.18,.18])this.mesh('cyl',this.mat('#d2b284',{metalness:.3,roughness:.35}),[sx,.2,sz],[.033,.4,.033],a);return a;}
table(g,x,z,r=.55,col=C.cream,y=.7){this.mesh('cyl',col,[x,y+.78,z],[r,.15,r],g);this.mesh('cyl',this.mat('#98886e',{metalness:.6,roughness:.24}),[x,y+.38,z],[.055,.68,.055],g);this.mesh('cyl','#856f54',[x,y+.04,z],[r*.54,.06,r*.54],g);for(const side of[-1,1]){this.mesh('cyl',C.cream,[x+side*r*.50,y+.88,z],[.16,.025,.16],g);this.mesh('sphere','#f0b64d',[x+side*r*.5,y+.92,z],[.09,.04,.07],g);}this.mesh('cyl',C.tomato,[x,y+.94,z],[.045,.18,.045],g);this.mesh('sphere',C.lime,[x,y+1.06,z],[.1,.11,.1],g);}
bottle(g,x,y,z,col=C.lime,s=1){this.mesh('cyl',col,[x,y+.15*s,z],[.075*s,.30*s,.075*s],g);this.mesh('cyl',col,[x,y+.34*s,z],[.031*s,.1*s,.031*s],g);this.mesh('box',C.cream,[x,y+.15*s,z+.073*s],[.09*s,.11*s,.012],g,{shadow:false});}
poster(g,x,y,z,w,h,col,label){this.mesh('round',C.ivory,[x,y,z],[w+.1,h+.1,.08],g);this.sign(label,w,h,C.cream,col,g,[x,y,z+.05]);}
plant(x,z,s=1,parent=this.scene,y=.15){const g=new T.Group();g.position.set(x,y,z);parent.add(g);this.mesh('cyl',C.tomato,[0,.3*s,0],[.38*s,.6*s,.38*s],g);this.mesh('cyl','#66563a',[0,.61*s,0],[.33*s,.03,.33*s],g);for(let i=0;i<9;i++){const a=i*2.399,leaf=this.mesh('sphere',i%2?'#487c48':'#739841',[Math.sin(a)*.3*s,(.85+(i%3)*.24)*s,Math.cos(a)*.3*s],[.18*s,.47*s,.105*s],g);leaf.rotation.z=Math.sin(a)*.6;leaf.rotation.x=Math.cos(a)*.6;}return g;}
clerk(parent,x,y,z,col,index){const c=this.character(col,.86);parent.add(c);c.position.set(x,y,z);this.dynamics.push({type:'clerk',g:c,phase:index});return c;}
seated(parent,x,y,z,col,s){const c=this.character(col,s);parent.add(c);c.position.set(x,y,z);c.rotation.y=Math.PI;this.dynamics.push({type:'seated',g:c,phase:x+z});return c;}
bench(x,z,r=0){const g=this.group(x,z,r);for(let i=0;i<4;i++)this.mesh('round',C.wood,[0,.54,i*.13],[1.5,.1,.11],g);for(let i=0;i<3;i++)this.mesh('round',C.wood,[0,.72+i*.14,-.12],[1.5,.11,.09],g);for(const side of[-1,1])this.mesh('round',C.teal,[side*.55,.28,.13],[.1,.50,.48],g);}
lamp(x,z){const g=this.group(x,z);this.mesh('cyl',C.teal,[0,1.70,0],[.048,3.1,.048],g);this.mesh('cyl',C.gold,[0,.31,0],[.11,.53,.11],g);this.mesh('sphere',this.glow('#ffe3a1'),[0,3.32,0],[.18,.23,.18],g);this.mesh('cone',C.tomato,[0,3.57,0],[.27,.15,.27],g);}
mergePainted(parent,key,parts=parent.children.filter(o=>o.isMesh)){if(!parts.length)return;const id='painted:'+key;let geo=this.geometries.get(id);if(!geo){const positions=[],normals=[],colors=[],p=new T.Vector3(),n=new T.Vector3();for(const part of parts){part.updateMatrix();const src=part.geometry,pa=src.attributes.position,na=src.attributes.normal,ix=src.index,normal=new T.Matrix3().getNormalMatrix(part.matrix),color=part.material.color;for(let i=0,count=ix?ix.count:pa.count;i<count;i++){const j=ix?ix.getX(i):i;p.fromBufferAttribute(pa,j).applyMatrix4(part.matrix);n.fromBufferAttribute(na,j).applyMatrix3(normal).normalize();positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);colors.push(color.r,color.g,color.b);}}geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeBoundingSphere();this.geometries.set(id,geo);}parts.forEach(o=>parent.remove(o));const merged=new T.Mesh(geo,this.mat('#ffffff',{vertexColors:true,roughness:.8,metalness:0,clearcoat:.025}));merged.castShadow=true;merged.receiveShadow=true;merged.userData.batch=false;parent.add(merged);}
character(col,scale=1,hero=false){scale=this.personScale;const g=new T.Group(),body=this.mesh('capsule',col,[0,.56,0],[.45,.35,.34],g,{batch:false});this.mesh('round',C.cream,[0,.64,.17],[.18,.16,.035],g,{batch:false});const head=new T.Group();g.add(head);head.position.y=1.12;this.mesh('sphere','#f6cc9f',[0,0,.03],[.32,.30,.28],head,{batch:false});this.mesh('sphere',hero?C.cobalt:'#68472f',[0,.17,-.03],[.33,.16,.27],head,{batch:false});this.mesh('sphere','#edb483',[0,-.04,.3],[.065,.06,.065],head,{batch:false});for(const side of[-1,1]){this.mesh('sphere','#24353a',[side*.11,.03,.282],[.034,.047,.024],head,{batch:false,shadow:false});this.mesh('sphere','#ed9a82',[side*.21,-.04,.246],[.055,.032,.018],head,{batch:false,shadow:false});this.mesh('sphere','#f2bf90',[side*.31,-.01,0],[.065,.09,.08],head,{batch:false});}if(hero){this.mesh('cyl',C.cobalt,[0,.23,.01],[.28,.12,.25],head,{batch:false});this.mesh('round',C.cobalt,[0,.21,.23],[.4,.055,.25],head,{batch:false});this.mesh('sphere',C.gold,[0,.29,.01],[.049,.05,.049],head,{batch:false});}const armL=new T.Group(),armR=new T.Group();g.add(armL,armR);armL.position.set(-.30,.8,0);armR.position.set(.30,.8,0);for(const [arm,side]of[[armL,-1],[armR,1]]){this.mesh('capsule',col,[side*.015,-.14,0],[.16,.22,.16],arm,{batch:false});this.mesh('sphere','#f6cc9f',[side*.03,-.34,.03],[.10,.11,.10],arm,{batch:false});}const legL=this.mesh('round','#274759',[-.13,.20,0],[.18,.33,.23],g,{batch:false}),legR=this.mesh('round','#274759',[.13,.20,0],[.18,.33,.23],g,{batch:false});for(const side of[-1,1])this.mesh('round',C.cream,[side*.13,.06,.07],[.21,.13,.32],g,{batch:false});this.mesh('round',hero?C.gold:'#a88161',[0,.65,-.24],[.41,.47,.20],g,{batch:false});if(hero){this.mesh('round',C.tomato,[0,.65,-.35],[.28,.18,.03],g,{batch:false});this.mesh('box',C.cream,[0,.65,-.372],[.11,.045,.02],g,{batch:false});}this.mergePainted(head,'head-'+hero);this.mergePainted(armL,'left-arm-'+col);this.mergePainted(armR,'right-arm-'+col);this.mergePainted(g,'accessories-'+hero,g.children.filter(o=>o.isMesh&&o!==body&&o!==legL&&o!==legR));g.userData={body,head,armL,armR,legL,legR,scale};g.scale.setScalar(scale);return g;}
animatePerson(g,t,moving=true,energy=1){const p=g.userData;if(!p.armL)return;const bob=moving?Math.abs(Math.sin(t*13))*.085*energy:Math.sin(t*2.7)*.013;p.body.position.y=.56+bob;p.head.position.y=1.12+bob;const swing=moving?Math.sin(t*13)*.72*energy:Math.sin(t*2)*.08;p.armL.rotation.x=swing;p.armR.rotation.x=-swing;p.legL.rotation.x=-swing*.7;p.legR.rotation.x=swing*.7;}
batchStatic(){this.scene.updateMatrixWorld(true);const buckets=new Map(),remove=[];this.scene.traverse(m=>{if(!m.isMesh||!m.userData.batch)return;const key=m.geometry.uuid+'|'+m.material.uuid+'|'+m.castShadow;let b=buckets.get(key);if(!b){b={geometry:m.geometry,material:m.material,cast:m.castShadow,matrices:[]};buckets.set(key,b);}b.matrices.push(m.matrixWorld.clone());remove.push(m);});remove.forEach(m=>m.parent.remove(m));for(const b of buckets.values()){const m=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((v,i)=>m.setMatrixAt(i,v));m.castShadow=b.cast;m.receiveShadow=true;m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();this.scene.add(m);}}
buildWorld(){
 this.mesh('box',this.mat('#ece7dd',{roughness:1}),[0,-5.3,0],[200,.3,200],this.scene,{shadow:false});
 const outline=[[-19,-10],[-14,-13.3],[-5,-13.6],[4,-12.8],[11,-12.6],[19,-10],[21,-4],[21.1,3],[19.8,8.1],[10,8.35],[0,8.2],[-8,8.25],[-17,8.0],[-19.6,4],[-20,-4]];
 this.organic(outline,4.9,this.texture('brick','#958f78','#827c69'),.34);
 this.organic(outline,.27,this.texture('terrazzo','#c6bca4','#9a967e'),.38);
 // Fine grained stone paving ties the painted model, newer alleys and underground together.
 this.frontStreet=this.curve([[-17.7,7.2],[-10,7.38],[-2,7.25],[5.8,7.32],[12.4,7.5],[19.5,7.25]],false,.535);
 this.alleyStreet=this.curve([[5.8,7.3],[5.8,3.5],[5.7,-2],[5.65,-7],[5.4,-11.6]],false,.537);
 this.ribbon(this.frontStreet,1.82,this.texture('tile','#b6ab8f','#9c927b'),0,100);
 this.ribbon(this.alleyStreet,1.72,this.texture('tile','#b6ab8f','#9c927b'),0,75);
 this.road=this.curve([[-17.8,-8.5],[-17.6,-1],[-17.3,5.9],[-9.8,7.3],[-1,7.28],[5.65,7.3],[5.65,1],[5.5,-8.9],[-1.8,-11.4],[-12,-11.2]],true,.55);
 this.plaza=this.curve([[-15.7,7.15],[-5.7,7.13],[5.7,7.2],[5.7,-1.3],[8,-1.3],[11,-1.3],[15.5,-1.35],[19.2,-1.2],[19.8,7.3],[11,7.7],[.2,7.65],[-15.7,7.7]],true,.55);
 // Foundation for the licensed, textured artist district. Replaced atomically after the GLB loads.
 this.artistPlaceholder=new T.Group();this.scene.add(this.artistPlaceholder);
 this.mesh('box',this.texture('tile','#bdb4a1','#999887'),[-5,.46,-3],[18,.14,18],this.artistPlaceholder,{batch:false});
 for(const [x,z,h,w,d]of[[-9,-5,5.8,4,5],[-3,-7,8.1,4.2,5],[.4,-1,4.3,3,4.1],[-8,1.1,3.7,4,4]]){
   this.mesh('box',this.texture('brick','#b5ac96','#9f957d'),[x,.5+h/2,z],[w,h,d],this.artistPlaceholder,{batch:false});
   this.mesh('box','#807f6b',[x,h+.55,z],[w+.18,.16,d+.18],this.artistPlaceholder,{batch:false});
 }
 this.makeLeftAlley();this.makeConnections();
 if(typeof window.NESBuildDistrict==='function')window.NESBuildDistrict(this);
 if(typeof window.NESBuildUndercity==='function')window.NESBuildUndercity(this);
 // The three points at the artist district's front edge are part of the shared pavement.
 this.registerVenue({id:'theatre',label:'BOX OFFICE',visit:[-10.7,.55,7.05],color:C.tomato});
 this.registerVenue({id:'comedy',label:'THE SIDE DOOR',visit:[-3.3,.55,7.0],color:C.teal});
 this.registerVenue({id:'sports',label:'ROOFTOP COURT',visit:[3.35,.55,7.0],color:C.cobalt});
 if(this.venues.length<6){this.registerVenue({id:'dining',label:'ORCHARD',visit:[9,.55,5.55],color:C.tomato});this.registerVenue({id:'music',label:'BLUE ROOM',visit:[13.6,.55,4.3],color:C.cobalt});this.registerVenue({id:'culture',label:'PICTURE HOUSE',visit:[18.1,.55,6.1],color:C.gold});}
 this.buildHub(-.5,7.55);this.makeStreetLife();this.makeHero();this.makeAtmosphere();
}
attachArtistScene(artistScene,animations=[]){
 if(this.dead){return null;}if(!artistScene?.isObject3D)throw new Error('An Object3D scene is required');
 if(this.artistGroup)this.scene.remove(this.artistGroup);
 const group=new T.Group();group.name='Littlest Tokyo — Glen Fox, CC BY 4.0';group.add(artistScene);
 artistScene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(artistScene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 if(![size.x,size.y,size.z].every(Number.isFinite)||size.x<=0||size.z<=0)throw new Error('Artist model has invalid bounds');
 // Native painted road is .383 above its base at this normalization. Nest the base in our plinth so streets meet.
 const scale=Math.min(18/size.x,18/size.z,18.5/size.y);group.scale.setScalar(scale);group.position.set(-5-center.x*scale,.122-bounds.min.y*scale,-3-center.z*scale);
 artistScene.traverse(obj=>{if(!obj.isMesh)return;obj.castShadow=true;obj.receiveShadow=true;obj.userData.batch=false;const mats=Array.isArray(obj.material)?obj.material:[obj.material];for(const m of mats){if(!m)continue;if(m.map)m.map.anisotropy=this.renderer.capabilities?.getMaxAnisotropy?.()||1;m.needsUpdate=true;}});
 this.scene.add(group);this.artistGroup=group;this.artistPlaceholder.visible=false;
 if(animations.length){const mixer=new T.AnimationMixer(artistScene);animations.forEach(clip=>mixer.clipAction(clip).play());this.mixers.push(mixer);}
 this.artistBounds={min:[-5-size.x*scale/2,.122,-3-size.z*scale/2],max:[-5+size.x*scale/2,.122+size.y*scale,-3+size.z*scale/2]};
 this.options.onArtistReady?.(this.artistBounds);return group;
}
makeLeftAlley(){
 const stone=this.texture('brick','#b8a487','#8d816b');
 // Irregular attached workshops climb the left retaining wall; none occupy the artist footprint.
 for(const [x,z,w,d,h,col]of[[-17.2,-8.6,3.2,3.4,5.8,'#baab84'],[-17.65,-4.8,2.75,3.6,7.6,'#8b9a86'],[-17.5,-.6,2.7,3.9,4.4,'#b48067'],[-17.0,3.5,3.35,3.4,3.1,'#ceb58a']]){
   const g=this.group(x,z,0,.5);this.mesh('box',this.texture('brick',col,'#b5a48d'),[0,h/2,0],[w,h,d],g);
   this.mesh('box','#655e50',[0,h+.12,0],[w+.18,.22,d+.20],g);
   for(let y=1.4;y<h-.3;y+=1.58)for(let j=0;j<2;j++){
     const xx=-w*.25+j*w*.5;this.mesh('box','#4c625c',[xx,y,d/2+.035],[.74,1.0,.11],g);
     this.mesh('box','#d1c7a6',[xx,y,d/2+.103],[.62,.89,.025],g);
     this.mesh('box','#566d61',[xx,y,d/2+.13],[.05,.88,.035],g);this.mesh('box','#566d61',[xx,y+.04,d/2+.13],[.63,.05,.035],g);
     this.mesh('box','#747863',[xx,y-.53,d/2+.21],[.9,.08,.35],g);
     if(j===0&&y>2){this.mesh('box',C.tomato,[xx,y-.44,d/2+.2],[.55,.16,.22],g);for(let k=0;k<4;k++)this.mesh('sphere',['#748249','#71894f','#997849'][k%3],[xx-.2+k*.13,y-.30,d/2+.2],[.1,.13,.11],g);}
   }
   // Front balconies, shutters, shop hardware and uneven roof life make the secondary facades as inhabited as the anchor.
   for(let level=3.0;level<h-.9;level+=1.58){
     this.mesh('box','#877b61',[0,level,d/2+.38],[w-.25,.09,.72],g);
     this.tube([[-w/2+.11,level+.62,d/2+.71],[w/2-.11,level+.62,d/2+.71]],.024,'#586455',g);
     for(let j=0;j<9;j++)this.mesh('cyl','#586455',[-w/2+.14+j*(w-.28)/8,level+.31,d/2+.71],[.018,.62,.018],g);
     this.mesh('box','#9e674d',[-w*.23,level+.10,d/2+.5],[.74,.20,.24],g);
     for(let j=0;j<5;j++)this.mesh('sphere',['#5a7450','#7b8a51','#899652'][j%3],[-w*.23-.28+j*.14,level+.25,d/2+.5],[.14,.17,.14],g);
     const towel=this.mesh('box','#c6b595',[w*.20,level+.35,d/2+.74],[.46,.46,.025],g);towel.rotation.z=.07;
   }
   for(const side of[-1,1]){this.mesh('box','#6a7d67',[side*w*.32,1.30,d/2+.09],[.30,1.12,.085],g);for(let j=0;j<7;j++)this.mesh('box','#9ca386',[side*w*.32,1.0+j*.1,d/2+.14],[.26,.035,.025],g);}
   const shopName=z<-7?'BOOKBINDERY':z<-3?'RECORDS':z<1?'CERAMICS':'FRUIT & FLOWERS';
   this.sign(shopName,w-.25,.32,'#ecdbb3',z<-3?'#536954':'#985e48',g,[0,2.13,d/2+.22]);
   for(let j=0;j<8;j++){const slat=this.mesh('box',j%2?'#cbb98e':'#687761',[-w*.43+j*w*.122,1.94,d/2+.40],[w*.125,.06,.58],g);slat.rotation.x=.17;}
   this.mesh('box','#554f40',[w*.31,.91,d/2+.21],[.41,.53,.15],g);this.sign('POST',.30,.12,'#d5c3a0','#554f40',g,[w*.31,1.02,d/2+.295]);
   for(let j=0;j<3;j++){this.mesh('box','#997951',[-w*.25+j*.35,.21,d/2+.3],[.31,.39,.39],g);for(let k=0;k<3;k++)this.mesh('box','#b09265',[-w*.25+j*.35,.11+k*.12,d/2+.51],[.33,.04,.025],g);}
   for(const zz of[-d/2+.12,d/2-.12]){this.mesh('box','#85806b',[0,h+.49,zz],[w-.1,.07,.07],g);for(let j=0;j<6;j++)this.mesh('cyl','#85806b',[-w*.44+j*w*.176,h+.30,zz],[.021,.44,.021],g);}
   this.mesh('box','#bca480',[-w*.23,h+.31,d*.15],[.71,.28,.45],g);for(let j=0;j<5;j++)this.mesh('sphere','#6d8959',[-w*.23-.28+j*.14,h+.59,d*.15],[.17,.24,.15],g);
   const roofHut=new T.Group();g.add(roofHut);roofHut.position.set(w*.19,h+.23,d*.20);
   this.mesh('box','#997c59',[0,.39,0],[.87,.78,.85],roofHut);this.mesh('box','#536a60',[0,.40,.45],[.46,.38,.045],roofHut);
   for(const side of[-1,1]){const roof=this.mesh('box','#95684e',[side*.25,.87,0],[.57,.08,1.05],roofHut);roof.rotation.z=-side*.33;for(let k=0;k<6;k++)this.mesh('box','#c09268',[side*.25,.92,-.43+k*.17],[.51,.035,.03],roofHut).rotation.z=-side*.33;}
   // Side elevations matter in a single wide composition.
   for(let y=1.5;y<h-.6;y+=1.65){this.mesh('box','#50665d',[w/2+.04,y,.2],[.08,.85,.70],g);this.mesh('box','#c7b78e',[w/2+.09,y,.2],[.025,.66,.52],g);}
   this.mesh('cyl','#7d7662',[w/2+.12,h/2+.1,-d/2+.25],[.042,h,.042],g);
   this.mesh('box','#aaa88d',[w*.18,h+.46,-d*.16],[.9,.72,.60],g);for(let k=0;k<5;k++)this.mesh('box','#6d7567',[w*.18,h+.24+k*.10,-d*.16+.31],[.72,.035,.03],g);
   for(let k=0;k<3;k++)this.plant(-w*.32+k*.38,d*.2,.3,g,h+.23);
   const ac=this.mesh('cyl','#8d8b77',[-w*.27,h+.8,-d*.2],[.38,.8,.38],g);this.mesh('cone','#645d51',[-w*.27,h+1.24,-d*.2],[.45,.24,.45],g);
 }
 const awning=this.group(-17.1,5.24,0,.5);
 for(let i=0;i<10;i++){const strip=this.mesh('box',i%2?'#d8c49b':'#a7593d',[-1.35+i*.3,2.05,0],[.3,.06,.85],awning);strip.rotation.x=.13;}
 this.mesh('box','#7a7659',[0,.54,0],[2.6,1.08,.9],awning);this.mesh('box','#b99865',[0,1.12,0],[2.82,.12,1.05],awning);
 for(let i=0;i<20;i++)this.mesh('sphere',i%3?'#d6a541':'#9d5242',[-1.04+(i%7)*.32,1.26+Math.floor(i/7)*.04,-.24+Math.floor(i/7)*.24],[.12,.12,.12],awning);
 this.sign('MARKET',2.6,.32,'#e8d6af','#506654',awning,[0,1.78,.44]);
 const marketClerk=this.character('#bc9651',.68);awning.add(marketClerk);marketClerk.position.set(-.5,.0,-.64);this.dynamics.push({type:'clerk',g:marketClerk,phase:1});
 // Fire escapes, external ducts and ladder rungs make the silhouette lived-in.
 for(let level=0;level<3;level++){
   this.mesh('box','#74796c',[-15.86,2+level*1.67,-5],[.86,.09,2.20]);
   for(let j=0;j<7;j++)this.mesh('cyl','#74796c',[-15.4,2.43+level*1.67,-5.9+j*.3],[.017,.77,.017]);
   this.tube([[-15.4,2.84+level*1.67,-6.1],[-15.4,2.84+level*1.67,-3.9]],.025,'#74796c');
 }
 for(let i=0;i<12;i++)this.mesh('box','#786e5b',[-15.8,1.7+i*.23,-3.4],[.48,.07,.13]);
 this.tube([[-16.05,1.4,-3.4],[-16.05,4.6,-3.4]],.027,'#786e5b');this.tube([[-15.55,1.4,-3.4],[-15.55,4.6,-3.4]],.027,'#786e5b');
}
makeConnections(){
 // A continuous curb and drainage details stitch the pieces together without a road grid.
 for(let i=0;i<94;i++){const p=this.frontStreet.getPoint(i/93),t=this.frontStreet.getTangent(i/93);for(const side of[-1,1]){const m=this.mesh('box','#bfb39b',[p.x-t.z*side*.92,.57,p.z+t.x*side*.92],[.30,.10,.13]);m.rotation.y=-Math.atan2(t.z,t.x);}}
 for(let i=0;i<13;i++){const p=this.frontStreet.getPoint((i+.4)/13);if(i%3===0){const disk=this.mesh('cyl','#7a7d6a',[p.x,.557,p.z],[.24,.018,.24]);for(let j=-2;j<=2;j++)this.mesh('box','#a09b83',[p.x+j*.058,.57,p.z],[.023,.006,.30]);}}
 const bridges=[{a:[-15.7,4.05,-4.6],b:[-13.7,4.05,-4.6]}, {a:[3.5,4.2,-4.2],b:[7.7,4.2,-4.2]}];
 bridges.forEach(({a,b})=>{const len=b[0]-a[0],x=(a[0]+b[0])/2;this.mesh('box','#8d8269',[x,a[1]-.10,a[2]],[len,.20,1.03]);for(let i=0;i<=Math.floor(len/.3);i++)this.mesh('box','#ab9a7b',[a[0]+i*.3,a[1]+.015,a[2]],[.28,.045,.99]);for(const side of[-1,1]){this.tube([[a[0],a[1]+.67,a[2]+side*.50],[b[0],b[1]+.67,b[2]+side*.50]],.025,'#767a68');for(let i=0;i<=Math.floor(len/.46);i++)this.mesh('cyl','#767a68',[a[0]+i*.46,a[1]+.34,a[2]+side*.50],[.024,.64,.024]);}});
 // Utilities cross the lanes in the same compact neighbourhood rather than floating separate lots.
 for(const z of[-9.4,-2.8,5.7]){
   this.tube([[3.75,5.0,z],[5.6,4.62,z+.10],[7.2,5.02,z+.05]],.025,'#6e6b5d');
   for(let i=0;i<5;i++)this.mesh('sphere',this.glow('#d7b86c'),[4.1+i*.59,4.9-Math.sin(i/4*Math.PI)*.22,z+.06],[.06,.085,.06],this.scene,{shadow:false});
 }
 for(const [x,z]of[[-13.2,7],[-6.2,7.95],[4.75,4.3],[5.0,-6.8],[18.9,7.6]]){
   const g=this.group(x,z,0,.50);this.mesh('cyl','#576457',[0,1.43,0],[.035,2.8,.035],g);this.mesh('cone','#4f6356',[0,2.96,.17],[.24,.18,.24],g);this.mesh('sphere',this.glow('#eadab0'),[0,2.84,.17],[.12,.075,.12],g);this.tube([[0,2.65,0],[0,2.92,.13],[0,2.94,.2]],.035,'#576457',g);
 }
 for(const[x,z,s]of[[-18,6.8,.43],[-15.4,6.6,.30],[-5.6,6.8,.29],[4.5,6.5,.35],[6.75,6.7,.38],[20,7,.4],[4.3,-9.5,.31]])this.plant(x,z,s,this.scene,.54);
 this.makeBicycle(-6.6,6.6,.1);this.makeBicycle(4.6,1.4,1.7);this.makeBicycle(-15.3,5.8,-.1);
}
makeBicycle(x,z,rot){const g=this.group(x,z,rot,.55),frame='#8b5945';for(const zz of[-.42,.42]){const m=this.mesh('torus','#454d43',[0,.33,zz],[.29,.29,.29],g);m.rotation.y=Math.PI/2;for(let a=0;a<6;a++){const ang=a*Math.PI/3;this.tube([[0,.33,zz],[0,.33+Math.cos(ang)*.25,zz+Math.sin(ang)*.25]],.008,'#b7b4a0',g);}}
 this.tube([[0,.33,-.42],[0,.69,-.20],[0,.33,.10],[0,.33,-.42],[0,.69,.18],[0,.33,.42]],.032,frame,g);this.tube([[0,.69,-.20],[0,.69,.18],[0,.89,.27],[.19,.91,.24],[-.19,.91,.24]],.028,frame,g);this.mesh('round','#665f4e',[0,.75,-.23],[.21,.07,.26],g);
}
makeAtmosphere(){
 // Small moving details stay readable in a fixed shot: laundry, pigeons, steam and a passing courier.
 const laundry=this.group(-15.2,-1.8,0,4.6);this.tube([[0,.6,0],[.9,.42,.12],[1.8,.6,0]],.015,'#797568',laundry);
 for(let i=0;i<4;i++){const cloth=this.mesh('box',['#a4b4a6','#b87561','#dbd1b1','#758da0'][i],[.22+i*.43,.20,.04],[.30,.43,.03],laundry,{batch:false});this.dynamics.push({type:'custom',update:t=>{cloth.rotation.x=Math.sin(t*1.4+i)*.13;}});}
 for(let i=0;i<7;i++){const g=this.group(-10+i*.29,7.42,0,.56);this.mesh('sphere','#7e8175',[0,.12,0],[.10,.12,.16],g,{batch:false});this.mesh('sphere','#607569',[0,.25,.10],[.075,.085,.08],g,{batch:false});this.mesh('cone','#ba9663',[0,.25,.18],[.03,.07,.03],g,{batch:false}).rotation.x=Math.PI/2;this.dynamic(g);this.dynamics.push({type:'custom',update:t=>{g.rotation.y=Math.sin(t*.35+i)*2;g.position.x=-10+i*.29+Math.sin(t*.6+i)*.12;g.rotation.x=Math.max(0,Math.sin(t*2.2+i))*.2;}});}
 for(let i=0;i<5;i++){const g=this.group();this.mesh('sphere','#cecbc0',[0,0,0],[.055,.04,.10],g,{batch:false});const a=this.mesh('box','#bebcae',[-.12,0,0],[.25,.024,.08],g,{batch:false}),b=this.mesh('box','#bebcae',[.12,0,0],[.25,.024,.08],g,{batch:false});this.dynamic(g);this.dynamics.push({type:'custom',update:t=>{const p=t*.12+i;g.position.set(Math.sin(p)*13,12.5+Math.sin(t*.7+i)*.4,Math.cos(p)*8);g.rotation.y=-p;a.rotation.z=Math.sin(t*8+i)*.4;b.rotation.z=-a.rotation.z;}});}
}
registerVenue({id,g=null,visit,label=id.toUpperCase(),color=C.gold}){
 if(this.venues.some(v=>v.id===id))return this.venues.find(v=>v.id===id);
 const anchor=Array.isArray(visit)?V(...visit):visit.clone(),stories=this.group(anchor.x,anchor.z,0,anchor.y),v={id,g:g||stories,visit:anchor,color,story:null};
 // Status belongs to a tiny street board, never a label stretched across the miniature.
 const board=this.mesh('box','#665e48',[.68,.35,-.21],[.55,.67,.09],stories);
 this.sign(label,.50,.24,'#eee2bd',color,stories,[.68,.53,-.153]);
 const status=this.sign('CLOSED',.48,.23,'#f5e9cc','#9b5f45',stories,[.68,.27,-.15]);status.userData.batch=false;status.visible=false;v.status=status;
 const full=this.sign('FULL',.48,.23,'#f5e9cc','#586d68',stories,[.68,.27,-.14]);full.userData.batch=false;full.visible=false;v.full=full;
 v.shutter=new T.Group();v.shutter.visible=false;stories.add(v.shutter);
 const queue=new T.Group();stories.add(queue);for(let i=0;i<3;i++){const actor=this.character([C.tomato,C.lime,C.teal][i],this.personScale);actor.position.set(-.12-i*.47,0,-.13);actor.rotation.y=Math.PI;queue.add(actor);this.dynamics.push({type:'queue',g:actor,phase:i+this.venues.length});}queue.visible=false;v.queue=queue;
 const ring=this.mesh('torus',this.glow(C.gold),[0,.035,0],[.41,.41,.41],stories,{batch:false,shadow:false});ring.rotation.x=-Math.PI/2;ring.visible=false;v.discovery=ring;
 this.venues.push(v);return v;
}
buildHub(x,z){this.hub=V(x,.55,z);const g=this.group(x,z,0,.54);this.mesh('cyl','#b5ac93',[0,.008,0],[.42,.016,.42],g);const ring=this.mesh('torus',this.glow(C.gold),[0,.025,0],[.43,.43,.43],g,{batch:false,shadow:false});ring.rotation.x=-Math.PI/2;this.hubRing=ring;}
makeStreetLife(){
 const colors=[C.cobalt,C.tomato,C.gold,C.lime,'#b58082','#5c8a77'];
 const paths=[this.frontStreet,this.alleyStreet,this.curve([[7.4,-3.25],[10,-3.25],[13.8,-3.25],[19.3,-3.25]],false,.63),this.curve([[-14.6,7.10],[-14.6,-.8],[-14.6,-8.5]],false,.55)];
 for(let i=0;i<28;i++){const g=this.character(colors[i%6],this.personScale);this.scene.add(g);this.actors.push({g,curve:paths[i%paths.length],offset:i*.618%1,speed:.010+(i%5)*.002,phase:i});}
 // Couriers share the alleys; vehicles are deliberately absent from the pedestrian frontage.
 const courier=this.character('#b26842',this.personScale);this.scene.add(courier);this.mesh('box','#bb995e',[0,.70,-.42],[.56,.62,.41],courier,{batch:false});this.actors.push({g:courier,curve:this.frontStreet,offset:.38,speed:.024,phase:29});
 for(let i=0;i<2;i++){const g=this.group();this.mesh('sphere',i?'#d3c097':'#a47b58',[0,.24,0],[.15,.18,.30],g,{batch:false});this.mesh('sphere',i?'#d3c097':'#a47b58',[0,.42,.23],[.16,.16,.15],g,{batch:false});this.mesh('sphere','#51483a',[0,.41,.36],[.08,.065,.06],g,{batch:false});for(const side of[-1,1])this.mesh('sphere','#795e44',[side*.12,.45,.20],[.05,.14,.075],g,{batch:false});this.dynamic(g);this.dynamics.push({type:'dog',g,phase:i,x:-6+i*2,z:7.4});}
}
makeHero(){
 this.hero=this.character(C.cobalt,this.personScale,true);this.scene.add(this.hero);this.hero.position.copy(this.hub);this.hero.visible=false;
 this.halo=this.mesh('torus',this.glow(C.gold),[0,.58,0],[.42,.42,.42],this.scene,{batch:false,shadow:false});this.halo.rotation.x=-Math.PI/2;this.halo.visible=false;
 // The carried ticket stays hand-sized. The large reveal is an HTML ticket over the still world.
 this.heroTicket=new T.Group();this.scene.add(this.heroTicket);this.mesh('box','#eed39a',[0,0,0],[.30,.18,.025],this.heroTicket,{batch:false});this.mesh('box','#bfa06b',[-.085,0,.016],[.008,.14,.01],this.heroTicket,{batch:false});this.heroTicket.visible=false;
 this.sparkles=new T.Group();this.heroTicket.add(this.sparkles);this.ticketLight=new T.PointLight('#e7c882',0,2,2);this.scene.add(this.ticketLight);
}
routeBetween(from,to){
 const a=Array.isArray(from)?from:[from.x,from.y,from.z],b=Array.isArray(to)?to:[to.x,to.y,to.z],y=.55,spine=7.42;
 const pts=[a];if(a[2]<6.75)pts.push([a[0],y,spine]);if(Math.abs(a[0]-b[0])>.15)pts.push([b[0],y,spine]);pts.push(b);
 const clean=pts.filter((p,i)=>i===0||Math.hypot(p[0]-pts[i-1][0],p[2]-pts[i-1][2])>.05);
 if(clean.length<2)clean.push([b[0]+.05,y,b[2]]);
 // Piecewise linear segments prevent Catmull-Rom cutting through facades on sharp alley turns.
 const curve=new T.CurvePath();for(let i=1;i<clean.length;i++)curve.add(new T.LineCurve3(V(...clean[i-1]),V(...clean[i])));return curve;
}
configureJourney(seed){
 this.seed=Number(seed)>>>0;const rng=random(this.seed),ids=this.venues.map((_,i)=>i);for(let i=ids.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}this.journey=ids.slice(0,3);
 const kinds=['closed','queue','full'];for(let i=2;i>0;i--){const j=Math.floor(rng()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}this.obstacles=kinds;this.night=false;
 this.venues.forEach((v,i)=>{v.queue.visible=i===ids[4];v.shutter.scale.y=.055;v.status.visible=i===ids[3];v.full.visible=false;v.discovery.visible=false;v.story=null;});
 this.heroLegs=this.journey.map((id,i)=>this.routeBetween(i?this.venues[this.journey[i-1]].visit:this.hub,this.venues[id].visit));
}
resize(){if(this.dead)return;const r=this.canvas.getBoundingClientRect(),w=Math.max(1,r.width||this.canvas.clientWidth||1200),h=Math.max(1,r.height||this.canvas.clientHeight||760);this.width=w;this.height=h;this.aspect=w/h;this.renderer.setSize(w,h,false);const viewHeight=Math.max(42.0,55.0/this.aspect);this.camera.left=-viewHeight*this.aspect/2;this.camera.right=viewHeight*this.aspect/2;this.camera.top=viewHeight/2;this.camera.bottom=-viewHeight/2;this.camera.updateProjectionMatrix();}
setReducedMotion(v){this.reducedMotion=!!v;}
setState(state,data={}){
 if(state===this.state){this.data={...this.data,...data};return;}this.state=state;this.data=data;this.stateAt=(performance.now()-this.started)/1000;this.phase=-1;
 if(state==='searching'){this.searchOffset=Number.isFinite(data.elapsed)?Math.max(0,data.elapsed):0;this.configureJourney(data.seed??this.seed);this.hero.visible=true;this.halo.visible=true;this.heroTicket.visible=false;}
 if(state==='returning'){this.returnStart=this.hero.position.clone();this.returnCurve=this.routeBetween(this.returnStart,this.hub);this.hero.visible=true;this.heroTicket.visible=true;const venue=this.venues[this.journey[2]];venue.discovery.visible=true;venue.queue.visible=false;venue.status.visible=false;venue.full.visible=false;}
 if(state==='idle'){this.hero.visible=false;this.halo.visible=false;this.heroTicket.visible=false;this.configureJourney(this.seed);}
 this.options.onPhase?.(state);
}
snapshotTime(s){this.renderAt(s);return this.canvas;}
tick(now){if(this.dead)return;this.raf=requestAnimationFrame(this.tick);if(now-this.lastFrame<1000/30)return;this.lastFrame=now;this.renderAt((now-this.started)/1000);}
renderAt(time){
 if(this.dead)return;const t=this.reducedMotion?0:time,elapsed=Math.max(0,time-this.stateAt+(this.state==='searching'?this.searchOffset:0)),searching=this.state==='searching',returning=this.state==='returning',tour=Number(this.data.tourDuration)||7.8,duration=Number(this.data.returnDuration)||1.8;
 this.mixers.forEach(m=>m.setTime(t));
 for(const a of this.actors){let u=(t*a.speed+a.offset)%1,direction=1;if(!a.curve.closed){direction=u<.5?1:-1;u=u<.5?u*2:2-u*2;}const p=a.curve.getPoint(u),d=a.curve.getTangent(Math.min(.999,Math.max(.001,u)));a.g.position.copy(p);a.g.rotation.y=Math.atan2(d.x,d.z)+(direction<0?Math.PI:0);this.animatePerson(a.g,t+a.phase,!this.reducedMotion,.7);}
 for(const v of this.vehicles){let u=(t*v.speed+v.offset)%1,dir=1;if(!v.curve.closed){dir=u<.5?1:-1;u=u<.5?u*2:2-u*2;}const p=v.curve.getPoint(u),d=v.curve.getTangent(Math.min(.999,Math.max(.001,u)));v.g.position.copy(p);v.g.position.y+=v.y||0;v.g.rotation.y=Math.atan2(d.x,d.z)+(dir<0?Math.PI:0);}
 for(const d of this.dynamics){if(d.type==='custom'){d.update?.(t);continue;}if(d.type==='clerk'||d.type==='seated'||d.type==='queue'){this.animatePerson(d.g,t+(d.phase||0),false);if(d.g.userData.head)d.g.userData.head.rotation.y=Math.sin(t*.75+(d.phase||0))*.2;if(d.type==='clerk')d.g.userData.armR.rotation.x=-.45+Math.sin(t*2+(d.phase||0))*.17;}else if(d.type==='musician'){this.animatePerson(d.g,t+(d.phase||0),false);d.g.userData.armL.rotation.x=Math.sin(t*5+d.phase)*.48;d.g.userData.armR.rotation.x=-Math.sin(t*5+d.phase)*.45;}else if(d.type==='player'){d.g.position.x=d.x+Math.sin(t*1.1+d.phase)*.22;d.g.position.z=d.z+Math.cos(t*.9+d.phase)*.21;this.animatePerson(d.g,t+d.phase,!this.reducedMotion,.6);}else if(d.type==='book'){d.g.rotation.x=.18+Math.max(0,Math.sin(t*1.1+d.phase))*.3;}else if(d.type==='dog'){d.g.position.set(d.x+Math.sin(t*.4+d.phase)*.4,.56,d.z+Math.cos(t*.4+d.phase)*.17);d.g.rotation.y=t*.4+d.phase;}else if(d.update)d.update(t);}
 let moving=false;
 if(searching){const legTime=tour/3,leg=Math.min(2,Math.floor(elapsed/legTime)),local=elapsed-leg*legTime,part=clamp(local/legTime),travel=.70,u=clamp(part/travel),curve=this.heroLegs[leg],p=curve.getPoint(u),dir=curve.getTangent(Math.min(u,.999));this.hero.position.copy(p);this.hero.rotation.y=Math.atan2(dir.x,dir.z);moving=part<travel;
  const venue=this.venues[this.journey[leg]],kind=this.obstacles[leg];if(leg!==this.phase){this.phase=leg;this.options.onPhase?.(leg===2?'last-look':kind);if(leg<2){venue.story=kind;venue.status.visible=kind==='closed';venue.queue.visible=kind==='queue';venue.full.visible=kind==='full';}else{venue.status.visible=false;venue.full.visible=false;venue.queue.visible=false;}}
  if(!moving){this.hero.rotation.y=Math.PI+Math.sin(t*1.8)*.12;this.hero.userData.head.rotation.z=leg<2?Math.sin(local*9)*.09:0;}if(elapsed>tour)moving=false;
 }
 if(returning){const u=ease(clamp(elapsed/duration)),pt=this.returnCurve.getPoint(u),dir=this.returnCurve.getTangent(Math.min(.999,u));this.hero.position.copy(pt);this.hero.rotation.y=u>.97?.45:Math.atan2(dir.x,dir.z);moving=u<.98;this.hero.userData.head.rotation.z=0;this.heroTicket.visible=true;this.halo.visible=true;}
 if(['offer','booking','confirmed','declined','failed','empty'].includes(this.state)){this.hero.position.copy(this.hub);this.hero.rotation.y=.45;this.hero.visible=this.state!=='empty';this.halo.visible=false;this.heroTicket.visible=['offer','booking','confirmed'].includes(this.state);}
 if(this.reducedMotion){this.hero.position.copy(this.hub);moving=false;}
 this.hero.scale.setScalar(this.personScale);this.animatePerson(this.hero,t*1.18,moving&&!this.reducedMotion,1);
 if(searching&&!moving){this.hero.userData.armL.rotation.x=-.3;this.hero.userData.armR.rotation.x=-.45+Math.sin(t*6)*.10;}if(returning)this.hero.userData.armR.rotation.x=-1.15;
 if(this.hero.visible){this.halo.position.set(this.hero.position.x,this.hero.position.y+.025,this.hero.position.z);this.heroTicket.position.copy(this.hero.position).add(V(.23,.70,.14));this.heroTicket.rotation.set(-.1,this.hero.rotation.y,.08);this.heroTicket.scale.setScalar(1);}
 this.hubRing.visible=this.state==='idle';this.renderer.render(this.scene,this.camera);
 this.stats={drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,agents:this.actors.length+1,state:this.state,seed:this.seed,night:false,journey:this.journey.map(i=>this.venues[i].id),obstacles:this.obstacles.slice(0,2),elapsed,artistLoaded:!!this.artistGroup,camera:'fixed',personScale:this.personScale};
}
destroy(){this.dead=true;cancelAnimationFrame(this.raf);this.resizeObserver?.disconnect();window.removeEventListener('resize',this.resize);this.mixers.forEach(m=>m.stopAllAction());const geos=new Set(),mats=new Set();this.scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));});geos.forEach(g=>g.dispose());mats.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();});this.textures.forEach(t=>t.dispose());this.renderer.dispose();}
}
window.LivingWorld=LivingWorld;
})();
