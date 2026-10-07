/* Original miniature cutaway: a working station, canal and the stairs joining them to the city. */
(()=>{'use strict';
const T=window.THREE;
window.NESBuildUndercity=function(w){
 if(!T)return;
 const P={cream:'#ded4b7',tile:'#d0d5bb',grout:'#959c88',ink:'#303d3b',iron:'#526865',teal:'#427c78',rust:'#a66b4c',brick:'#9b6753',wood:'#8c6749',light:'#efcb83',water:'#476f71',plaster:'#b8ad8f'};
 const root=new T.Group();root.name='Canal Street — connected underground cutaway';w.scene.add(root);
 const box=(c,p,s,parent=root)=>w.mesh('box',c,p,s,parent),round=(c,p,s,parent=root)=>w.mesh('round',c,p,s,parent),cyl=(c,p,s,parent=root)=>w.mesh('cyl',c,p,s,parent);
 const material=(c,extra={})=>w.mat(c,{roughness:.87,metalness:0,clearcoat:0,...extra});
 const tile=w.texture('tile',P.tile,P.grout),brick=w.texture('brick',P.brick,'#b29577'),stone=w.texture('terrazzo','#a69e89','#817f6f'),wood=w.texture('wood',P.wood,'#70533e');
 const glow=material('#e8d1a0',{emissive:'#d8a858',emissiveIntensity:.22});
 const tube=(points,r,c,parent=root)=>w.tube(points,r,c,parent);
 const sign=(text,x,y,z,width,height,fg=P.cream,bg=P.ink,parent=root)=>w.sign(text,width,height,fg,bg,parent,[x,y,z]);
 function bolt(x,y,z,parent=root){cyl(material('#69706a',{metalness:.35}),[x,y,z],[.026,.024,.026],parent).rotation.x=Math.PI/2;}
 function pipe(points,r=.045,col=P.rust,parent=root){tube(points,r,col,parent);for(let i=1;i<points.length-1;i++){const p=points[i];const ring=cyl(material(col),p,[r*1.32,.095,r*1.32],parent);ring.rotation.z=Math.PI/2;}}
 function planter(x,y,z,scale=.6,parent=root){const pot=cyl(material('#9e6848'),[x,y+.15*scale,z],[.22*scale,.3*scale,.22*scale],parent);cyl(material('#655b43'),[x,y+.31*scale,z],[.20*scale,.035,.20*scale],parent);for(let n=0;n<7;n++){const a=n*2.4;const leaf=w.mesh('sphere',material(n%2?'#667d4d':'#788253'),[x+Math.sin(a)*.16*scale,y+(.43+(n%3)*.11)*scale,z+Math.cos(a)*.16*scale],[.11*scale,.27*scale,.055*scale],parent);leaf.rotation.z=Math.sin(a)*.45;}return pot;}
 function rail(x1,z1,x2,z2,y,parent=root){const len=Math.hypot(x2-x1,z2-z1),n=Math.ceil(len/.7);for(let i=0;i<=n;i++){const a=i/n;box(material(P.iron),[x1+(x2-x1)*a,y+.43,z1+(z2-z1)*a],[.035,.85,.035],parent);}tube([[x1,y+.87,z1],[x2,y+.87,z2]],.027,P.iron,parent);tube([[x1,y+.45,z1],[x2,y+.45,z2]],.018,P.iron,parent);}
 function bench(x,y,z,r=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=r;root.add(g);for(let n=0;n<5;n++)box(wood,[0,.36,-.21+n*.105],[1.6,.065,.08],g);for(let n=0;n<4;n++)box(wood,[0,.54+n*.10,-.22],[1.6,.065,.07],g);for(const side of[-1,1]){box(material(P.iron),[side*.58,.18,0],[.07,.36,.40],g);box(material(P.iron),[side*.58,.53,-.20],[.07,.72,.07],g);tube([[side*.76,.41,-.25],[side*.76,.65,-.25],[side*.76,.66,.24],[side*.76,.44,.24]],.028,P.iron,g);}return g;}
 function poster(text,x,y,z,col='#ad644e',size=.65,parent=root){box(material('#948d79'),[x,y,z],[size+.06,size*1.35+.06,.035],parent);sign(text,x,y,z+.025,size,size*1.35,P.cream,col,parent);box(material('#d3c2a1'),[x+.035,y-.10,z+.032],[size*.48,.025,.015],parent);box(material('#d3c2a1'),[x+.035,y-.18,z+.032],[size*.62,.018,.015],parent);}
 function lamp(x,y,z,parent=root){box(material(P.iron),[x,y,z],[.68,.095,.18],parent);box(glow,[x,y-.057,z],[.58,.025,.12],parent);box(material('#747d6c'),[x-.25,y+.17,z],[.035,.27,.035],parent);box(material('#747d6c'),[x+.25,y+.17,z],[.035,.27,.035],parent);}
 // Exposed material layers continue directly from the street slab above.
 box(stone,[.8,-4.20,11.10],[34.5,1.3,5.60]);
 box(material('#746f60'),[.8,-3.54,12.85],[34.5,.16,2.95]);
 box(brick,[.8,-1.65,8.98],[34.5,3.75,.62]);
 box(tile,[.8,-1.68,9.34],[33.6,2.55,.105]);
 box(material(P.teal),[.8,-.65,9.405],[33.6,.23,.04]);
 box(material('#797b63'),[.8,-2.69,9.43],[33.6,.15,.18]);
 box(material('#c9b99a'),[.8,.32,8.63],[34.5,.34,.76]);
 box(stone,[.8,.51,8.57],[34.5,.08,.94]);
 for(let x=-16;x<17.5;x+=.64){box(material(x%2?'#a7805e':'#b49a78'),[x,.18,9.02],[.60,.17,.15]);if(Math.round(x*100)%3===0)box(material('#b3b39a'),[x,-2.48,9.409],[.25,.17,.012]);}
 for(const x of[-14.9,-9.7,-4.4,.9,6.2,11.5,16.7]){box(material(P.iron),[x,-1.65,9.46],[.16,3.32,.17]);box(material('#746e5c'),[x,-.04,9.48],[.38,.13,.29]);for(const yy of[-.18,-.42,-2.8]){bolt(x-.05,yy,9.56);bolt(x+.05,yy,9.56);}}
 // Tiled platform, tactile edge, sleepers, clips, ballast and polished rail tops.
 box(stone,[.6,-2.96,10.52],[32.8,.37,2.37]);box(tile,[.6,-2.75,10.52],[32.8,.055,2.37]);box(material('#b09a53'),[.6,-2.70,11.60],[32.8,.055,.24]);
 for(let x=-15.45;x<16.9;x+=.18)for(const z of[11.54,11.63])cyl(material('#d0b775'),[x,-2.658,z],[.027,.018,.027]);
 for(let x=-16;x<18;x+=.44){box(wood,[x,-3.33,12.72],[.12,.10,2.18]);for(const z of[12.19,13.21])box(material('#606d69',{metalness:.65}),[x,-3.20,z],[.20,.035,.12]);}
 for(const z of[12.19,13.21]){box(material('#747f79',{metalness:.72,roughness:.38}),[.8,-3.20,z],[34.5,.13,.09]);box(material('#b1b4a3',{metalness:.78,roughness:.25}),[.8,-3.12,z],[34.5,.04,.13]);}
 for(let i=0;i<112;i++){const x=-16.15+(i*2.197%34),z=11.86+(i*.613%1.84);w.mesh('sphere',material(['#6c7067','#848173','#999081'][i%3]),[x,-3.35,z],[.07+(i%3)*.025,.048,.055+(i%2)*.03],root);}
 for(const x of[-12.7,-3.4,5.8,14.7]){sign('CANAL STREET',x,-1.05,9.47,2.43,.38,P.cream,P.teal);sign('DOWNTOWN  →',x,-1.55,9.47,1.72,.17,P.ink,P.tile);lamp(x,-.23,10.2);}
 // Thin pipes follow the architectural structure.
 pipe([[-16.4,.02,9.67],[-10,.02,9.67],[-4,.02,9.67],[3,.02,9.67],[9,.02,9.67],[17.2,.02,9.67]],.055,'#ab7850');
 pipe([[-16.3,-.16,9.72],[-7,-.16,9.72],[.5,-.16,9.72],[8.2,-.16,9.72],[17.2,-.16,9.72]],.022,'#68776c');
 for(const x of[-14,-6,2.6,11.3,16.8]){pipe([[x,-.01,9.70],[x,-.23,9.70],[x,-.24,9.70],[x,-1.81,9.70]],.037,'#8f8065');box(material('#b2a68a'),[x,-1.84,9.64],[.26,.37,.21]);for(let n=0;n<3;n++)box(material('#6b715e'),[x,-1.76-n*.085,9.76],[.15,.025,.018]);}
 for(const x of[-10.7,-.3,10.5]){bench(x,-2.72,10.18);const paper=box(material('#d9c49d'),[x+.38,-2.31,10.24],[.34,.025,.26]);paper.rotation.y=.16;}
 for(const [label,x,col]of[['NIGHT MARKET',-7.5,'#a16b50'],['PICTURE HOUSE',1.2,'#657c7d'],['LIVE TONIGHT',8.0,'#8b7960']])poster(label,x,-1.72,9.46,col,.76);
 // Printed route maps, not floating UI.
 for(const x of[-15.45,3.95]){box(material('#8c8471'),[x,-1.55,9.47],[1.05,1.2,.055]);box(material('#dbd2ae'),[x,-1.55,9.51],[.93,1.09,.023]);for(let j=0;j<4;j++){const xx=x-.31+j*.2;tube([[xx,-1.99,9.53],[xx,-1.55,9.53],[xx+.12,-1.3,9.53],[xx+.12,-1.14,9.53]],.012,['#a5664e','#557e77','#ad995e','#716580'][j]);for(let k=0;k<3;k++)w.mesh('sphere',material('#f3dfb9'),[xx,-1.84+k*.25,9.55],[.032,.032,.012],root);}}
 // Coffee and book hatch embedded in the station wall.
 const kiosk=new T.Group();kiosk.position.set(-5.3,-2.73,9.93);root.add(kiosk);
 box(material('#837a61'),[0,.75,0],[1.95,1.5,.85],kiosk);box(wood,[0,.67,.45],[2.06,.70,.20],kiosk);box(material('#9f8b63'),[0,1.10,.37],[2.10,.10,1.0],kiosk);box(material('#e8d1a6'),[0,1.82,-.04],[2.1,.18,.88],kiosk);
 sign('COFFEE  ·  BOOKS',0,1.58,.451,1.75,.30,P.cream,P.teal,kiosk);for(let i=0;i<7;i++)box(material(['#846d53','#6b7f77','#a97952'][i%3]),[-.79+i*.19,.97,.48],[.13,.25,.20],kiosk);
 round(material('#a2a491',{metalness:.4}),[.54,1.31,.17],[.43,.34,.37],kiosk);cyl(material('#685d46'),[.54,1.51,.17],[.11,.06,.11],kiosk);for(let i=0;i<3;i++){cyl(material(P.cream),[-.54+i*.17,1.20,.48],[.061,.16,.061],kiosk);cyl(material('#805337'),[-.54+i*.17,1.286,.48],[.05,.008,.05],kiosk);}
 // Vending cabinet with visible cans, coin slot, buttons and tray.
 const vend=new T.Group();vend.position.set(12.75,-2.73,9.97);root.add(vend);round(material('#987058'),[0,.77,0],[.9,1.54,.61],vend);box(material('#536f6b'),[-.1,.92,.319],[.53,.82,.04],vend);box(material('#9ba48a'),[-.1,.92,.346],[.46,.73,.026],vend);for(let r=0;r<3;r++)for(let c=0;c<3;c++){cyl(material(['#c19469','#647e79','#c4b58a'][(r+c)%3]),[-.245+c*.15,.68+r*.22,.39],[.039,.12,.039],vend);box(material('#665a44'),[-.10,.58+r*.22,.425],[.47,.03,.14],vend);}sign('DRINKS',0,1.40,.323,.70,.16,P.cream,P.teal,vend);box(material(P.ink),[.31,.98,.34],[.085,.033,.03],vend);for(let i=0;i<3;i++)cyl(material('#d0b97f'),[.32,.85-i*.10,.343],[.024,.025,.024],vend).rotation.x=Math.PI/2;box(material('#485b54'),[-.06,.31,.337],[.55,.21,.038],vend);box(material('#bbaa83'),[-.06,.22,.44],[.58,.05,.24],vend);
 for(const x of[-12,6.7,15.3]){cyl(material('#687c71'),[x,-2.39,10.35],[.21,.66,.21]);cyl(material('#515b4e'),[x,-2.04,10.35],[.22,.065,.22]);for(let j=0;j<10;j++){const a=j*Math.PI/5;box(material('#8f9a7c'),[x+Math.sin(a)*.211,-2.40,10.35+Math.cos(a)*.211],[.019,.57,.019]);}}
 box(material('#ad7054'),[-8.65,-1.99,9.60],[.48,.84,.31]);sign('FIRE',-8.65,-1.93,9.767,.32,.16,P.cream,'#ad7054');box(material('#d0b58c'),[-8.51,-2.04,9.78],[.035,.15,.025]);
 // Brick portals frame the open cutaway without a ceiling hiding it.
 function tunnelEnd(x){const g=new T.Group();g.position.set(x,-3.48,12.72);root.add(g);for(const z of[-1.03,1.03])box(brick,[0,.98,z],[.75,1.96,.28],g);for(let i=0;i<13;i++){const a=Math.PI*i/12,m=box(material(i%2?'#b09371':'#9e886d'),[0,1.76+Math.sin(a)*1.08,Math.cos(a)*1.08],[.77,.24,.23],g);m.rotation.x=-a;}box(material('#807b65'),[0,2.83,0],[.88,.20,2.48],g);box(material(P.iron),[.47,1.39,-.97],[.08,1.0,.08],g);w.mesh('sphere',material('#a3ac70',{emissive:'#6f9548',emissiveIntensity:.5}),[.51,1.84,-.97],[.065,.065,.065],g);}
 tunnelEnd(-16.15);tunnelEnd(17.60);
 // Two articulated cars, painted cream and muted green.
 const train=new T.Group();train.name='Canal line local';root.add(train);
 function car(cz,index){const cg=new T.Group();cg.position.z=cz;train.add(cg);round(material('#bdbfa6',{metalness:.18,roughness:.58}),[0,.88,0],[1.22,1.39,2.97],cg);round(material('#447873'),[0,.48,0],[1.24,.36,3.0],cg);round(material('#c8c4a8'),[0,1.54,0],[1.27,.21,3.0],cg);box(material('#817d69'),[0,1.68,-.10],[.57,.13,.7],cg);for(const side of[-1,1]){for(const zz of[-1.05,-.51,.48,1.03]){round(material('#9baca4'),[side*.623,1.09,zz],[.027,.49,.43],cg);box(material('#738d86'),[side*.643,1.11,zz],[.012,.39,.33],cg);box(material('#e1c493'),[side*.657,.93,zz],[.012,.023,.30],cg);}box(material('#bec4b0'),[side*.626,.92,-.03],[.028,1.04,.40],cg);box(material('#81978c'),[side*.647,1.18,-.03],[.015,.43,.30],cg);box(material('#53726b'),[side*.654,.73,-.03],[.01,.34,.018],cg);for(const zz of[-1.02,1.02]){const wheel=cyl(material('#3f514b'),[side*.47,.24,zz],[.235,.14,.235],cg);wheel.rotation.z=Math.PI/2;}}
 for(const z of[-1.495,1.495]){round(material('#8eaaa0'),[0,1.16,z],[.90,.52,.035],cg);box(material('#496560'),[0,1.14,z*1.004],[.023,.41,.01],cg);for(const xx of[-.4,.4])w.mesh('sphere',material('#eddca8',{emissive:'#c7b479',emissiveIntensity:.28}),[xx,.72,z*1.007],[.08,.06,.025],cg);}
 for(let n=0;n<4;n++)box(material('#8b927d'),[-.21+n*.14,1.756,-.12],[.06,.02,.46],cg);
 for(const side of[-1,1])for(const zz of[-.98,.52]){w.mesh('sphere',material('#c0a380'),[side*.57,1.08,zz],[.058,.065,.058],cg);box(material(index?'#8d7960':'#667d77'),[side*.57,.94,zz],[.085,.14,.08],cg);}}
 car(-1.57,0);car(1.57,1);box(material('#626c60'),[0,.62,0],[.54,.83,.22],train);w.dynamic(train);
 const trainCurve=w.curve([[-12.0,-3.10,12.72],[-4,-3.10,12.72],[6,-3.10,12.72],[13.65,-3.10,12.72]],false);
 w.vehicles.push({g:train,curve:trainCurve,speed:.014,offset:.57,y:0});
 // Every commuter uses the same scale as every other character in the city.
 const palette=['#6c8277','#a8885c','#996e58','#738389','#9d9770'];
 for(let i=0;i<9;i++){const person=w.character(palette[i%palette.length],.68);root.add(person);person.position.set(-13.7+i*3.5,-2.70,10.69+(i%2)*.16);person.rotation.y=i%3===0?1.1:Math.PI;w.dynamics.push({type:'clerk',g:person,phase:i+21});if(i===2||i===6){const bag=new T.Group();root.add(bag);bag.position.set(person.position.x+.33,-2.67,person.position.z);round(material('#867153'),[0,.21,0],[.25,.42,.20],bag);const handle=w.mesh('torus',material('#5b624f'),[0,.46,0],[.08,.08,.08],bag);handle.scale.z=.3;}}
 const platformPath=w.curve([[-14,-2.70,11.27],[-7,-2.70,11.27],[2,-2.70,11.27],[9,-2.70,11.27],[15,-2.70,11.27],[8,-2.70,11.44],[0,-2.70,11.44],[-8,-2.70,11.44]],true);
 for(let i=0;i<4;i++){const person=w.character(palette[(i+2)%palette.length],.68);root.add(person);w.actors.push({g:person,curve:platformPath,offset:i*.251,speed:.008+(i%2)*.003,phase:i+39});}
 // The stair runs continuously from the actual upper street into the platform.
 const stairX=-17.7,stepCount=15,rise=.215,run=.27,startZ=7.70;
 for(let i=0;i<stepCount;i++){const top=.52-i*rise,z=startZ+i*run;box(brick,[stairX,(-3.2+top-.2)/2,z],[2.1,top+3.0,.27]);box(stone,[stairX,top-.13,z],[1.69,.26,.30]);box(material('#c9c1a0'),[stairX,top+.012,z+.115],[1.70,.045,.045]);}
 for(const side of[-1,1]){const x=stairX+side*.92;for(let i=0;i<stepCount;i+=2){const yy=.52-i*rise,z=startZ+i*run;box(material(P.iron),[x,yy+.45,z],[.042,.86,.042]);}tube([[x,1.42,startZ-.12],[x,-1.69,startZ+14*run]],.036,P.iron);}
 box(stone,[-16.49,-2.78,11.61],[2.9,.18,1.06]);
 for(const x of[-18.60,-16.80])box(material(P.iron),[x,1.11,7.68],[.055,1.25,.055]);sign('CANAL ST  ↓',stairX,1.72,7.75,1.92,.36,P.cream,P.teal);planter(-18.7,.55,7.72,.78);planter(-16.7,.54,7.35,.64);
 const stairRoute=w.curve([[-15.7,.56,7.7],[-17.7,.56,7.7],[-17.7,-.52,9.05],[-17.7,-1.64,10.40],[-17.7,-2.47,11.48],[-17.5,-2.70,11.72],[-15.25,-2.70,11.54]],false);
 const stairWalker=w.character('#af9470',.68);root.add(stairWalker);w.dynamics.push({type:'custom',update:t=>{const u=(Math.sin(t*.16)+1)*.5,p=stairRoute.getPoint(u),d=stairRoute.getTangent(u);stairWalker.position.copy(p);stairWalker.rotation.y=Math.atan2(d.x,d.z)+(Math.cos(t*.16)<0?Math.PI:0);w.animatePerson(stairWalker,t,true,.55);}});
 const utility=new T.Group();utility.position.set(18.0,-2.72,10.20);root.add(utility);box(brick,[.40,.9,0],[1.15,1.80,2.10],utility);box(material('#5f776b'),[-.19,.85,.32],[.11,1.70,.84],utility);for(let n=0;n<7;n++)box(material('#8b9480'),[-.253,.41+n*.16,.32],[.024,.05,.62],utility);pipe([[.72,.90,1.0],[.72,1.47,1.0],[.20,1.47,1.0],[.20,1.02,1.0]],.11,'#a7825d',utility);w.mesh('torus',material('#ad7251'),[.20,1.02,1.12],[.20,.20,.20],utility);box(material('#ad7251'),[.20,1.02,1.12],[.34,.035,.025],utility);box(material('#ad7251'),[.20,1.02,1.12],[.035,.34,.025],utility);sign('SERVICE',.15,1.98,1.08,.94,.22,P.cream,P.iron,utility);
 // The canal continues alongside the cutaway with a low towpath and arched bridge.
 const waterY=-3.98;
 box(material('#6f7d72'),[.9,-4.38,15.48],[36.2,.48,2.90]);box(material(P.water,{roughness:.30,metalness:.20,clearcoat:.35}),[.9,waterY,15.48],[36.2,.055,2.42]);
 for(const z of[14.16,16.82]){box(brick,[.9,-3.82,z],[36.3,.82,.37]);box(stone,[.9,-3.39,z],[36.6,.12,.48]);for(let x=-17;x<19;x+=.63)box(material('#b8ab8a'),[x,-3.34,z],[.58,.06,.40]);}
 const ripples=[];for(let n=0;n<30;n++){const x=-16.5+n*1.16,z=14.82+(n%4)*.39;const r=box(material(n%2?'#668785':'#829c91',{roughness:.45}),[x,waterY+.034,z],[.25+(n%3)*.15,.009,.024]);r.rotation.y=(n%3-.9)*.15;r.userData.batch=false;ripples.push({m:r,x,z,phase:n});}
 w.dynamics.push({type:'custom',update:t=>{ripples.forEach(r=>{r.m.position.x=r.x+Math.sin(t*.3+r.phase)*.19;r.m.scale.x=.8+Math.sin(t*.7+r.phase)*.20;});}});
 for(const x of[-15,-10,-5,2,7,12,17]){w.mesh('torus',material('#5c6554',{metalness:.25}),[x,-3.56,14.39],[.15,.15,.15]);box(material('#77735c'),[x,-3.39,14.43],[.13,.10,.15]);}
 const bridgeX=-3.45;
 for(let j=0;j<=16;j++){const z=14.06+j*.186,arch=Math.sin(j/16*Math.PI)*.44,y=-3.22+arch;box(stone,[bridgeX,y,z],[1.28,.14,.19]);for(const side of[-1,1]){box(material('#847b63'),[bridgeX+side*.58,y-.24,z],[.13,.38,.20]);if(j%2===0)box(material(P.iron),[bridgeX+side*.58,y+.29,z],[.035,.64,.035]);}}
 for(const side of[-1,1]){const points=[];for(let j=0;j<=16;j++)points.push([bridgeX+side*.58,-2.53+Math.sin(j/16*Math.PI)*.44,14.06+j*.186]);tube(points,.025,P.iron);}
 // Moored cargo skiff with wooden crates, folded canvas and rope.
 const boat=new T.Group();boat.position.set(8.6,-3.86,15.48);root.add(boat);round(material('#776849'),[0,.04,0],[2.24,.34,.78],boat);round(material('#a39870'),[0,.19,0],[2.12,.16,.72],boat);box(wood,[0,.24,0],[1.97,.10,.60],boat);for(const side of[-1,1])box(material('#5f6958'),[0,.35,side*.33],[2.07,.21,.055],boat);for(const x of[-.85,.87])round(material('#6f785e'),[x,.29,0],[.29,.18,.72],boat);for(let n=0;n<3;n++){box(wood,[-.55+n*.35,.48,.03],[.30,.42,.42],boat);for(const yy of[.32,.60])box(material('#c0aa7e'),[-.55+n*.35,yy,.253],[.32,.035,.023],boat);}round(material('#778874'),[.62,.44,.04],[.46,.25,.43],boat);tube([[-.93,.39,-.26],[-1.10,.24,-.43],[-1.38,.22,-.58]],.019,'#c3af81',boat);w.dynamic(boat);w.dynamics.push({type:'custom',update:t=>{boat.position.y=-3.86+Math.sin(t*.70)*.018;boat.rotation.z=Math.sin(t*.5)*.012;}});
 for(const x of[-14.8,-8.2,1.9,13.8]){const drain=cyl(material('#6c7160'),[x,-3.78,14.41],[.12,.27,.12]);drain.rotation.x=Math.PI/2;for(let n=0;n<5;n++){const leaf=w.mesh('sphere',material(n%2?'#687b50':'#7d8854'),[x+.3+(n%2)*.15,-3.49+n*.037,14.36],[.065,.18,.04]);leaf.rotation.z=(n-2)*.25;}}
 box(stone,[.9,-3.57,17.14],[36.5,.30,.62]);for(const x of[-12.6,3.0,15.7])planter(x,-3.40,17.1,.64);rail(-17.1,16.87,-5.0,16.87,-3.31);rail(-1.6,16.87,18.8,16.87,-3.31);
 w.undercity={root,train,stairWalker,boat,bounds:{min:[-19.3,-4.8,7.30],max:[19.6,2.05,17.45]}};
};
})();
