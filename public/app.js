(() => {
  'use strict';
  const root=document.getElementById('nes-app');
  if(!root)return;
  const $=selector=>root.querySelector(selector), $$=selector=>[...root.querySelectorAll(selector)];
  const api=window.NES_TRANSPORT;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let scene;
  try{
    if(!window.LivingWorld)throw new Error('3D renderer unavailable');
    scene=new window.LivingWorld($('[data-city]'),{reducedMotion:motion.matches});
    root.dataset.renderer='3d';
  }catch{
    // Canvas fallback keeps the experience usable when WebGL is unavailable.
    const canvas=$('[data-city]'),replacement=canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    scene=new window.CityScene(replacement,{reducedMotion:motion.matches});
    root.dataset.renderer='2d';
  }
  // Load the artist-made city once. A new guest cannot launch into half a world.
  let worldReady=!scene.attachArtistScene,artError='';
  root.dataset.art=worldReady?'ready':'loading';
  if(worldReady&&$('[data-world-loading]'))$('[data-world-loading]').hidden=true;
  const artReady=worldReady?Promise.resolve(true):window.NES_LOAD_ART(scene).then(()=>{
    worldReady=true;root.dataset.art='ready';return true;
  }).catch(()=>{
    artError='The city artwork could not load. Reload to try again.';
    root.dataset.art='failed';return false;
  }).then(ready=>{
    const loading=$('[data-world-loading]');
    if(loading){loading.hidden=ready;loading.textContent=ready?'':artError;}
    return ready;
  });
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  const money=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n%1?2:0}).format(n):'At source';
  const dateTime=value=>{const d=new Date(value);if(!Number.isFinite(+d))return {time:'Check source',day:'Time unconfirmed'};return {time:new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}).format(d),day:new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'America/New_York'}).format(d)};};
  let config={mode:'demo',sponsorName:'Your sponsor'},partySize=1,hunt=null,lastState='idle',lastStage=-1,pollTimer,holdTimer,searchStarted=0,requestBusy=false,sound=false,audioCtx;
  let cinemaTimer,cinemaHuntId=null,cinemaStarted=0,returnStarted=0,sessionEpoch=0;
  const TOUR_MS=7800,RETURN_MS=1800;
  const journeySeed=id=>[...String(id||'idle')].reduce((seed,c)=>Math.imul(seed^c.charCodeAt(0),16777619)>>>0,2166136261);
  const journeyData=(data={})=>({huntId:hunt?.id||cinemaHuntId,seed:journeySeed(hunt?.id||cinemaHuntId),tourDuration:TOUR_MS/1000,returnDuration:RETURN_MS/1000,...data});
  function clearCinema(){clearTimeout(cinemaTimer);cinemaTimer=null;cinemaHuntId=null;cinemaStarted=0;returnStarted=0;}
  function beginCinema(id){clearCinema();cinemaHuntId=id;cinemaStarted=Date.now();searchStarted=cinemaStarted;}
  function stageOfTour(){return Math.min(2,Math.floor(Math.max(0,Date.now()-(cinemaStarted||searchStarted))/(TOUR_MS/3)));}
  function updateJourney(){
    if(lastState!=='searching')return;
    const elapsed=Math.max(0,Date.now()-(cinemaStarted||searchStarted));
    const stage=stageOfTour();
    const caption='Looking…';
    $('[data-search-text]').textContent=caption;
    $('[data-elapsed]').textContent=String(Math.floor(elapsed/60000)).padStart(2,'0')+':'+String(Math.floor(elapsed/1000)%60).padStart(2,'0');
    if(stage!==lastStage){if(lastStage>=0)play('tick');lastStage=stage;announce(caption);}
    $$('[data-phase]').forEach((el,i)=>{el.classList.toggle('active',i===stage);el.classList.toggle('done',i<stage);});
    scene.setState('searching',journeyData({stage,elapsed:elapsed/1000}));
  }
  function continueCinema(){
    clearTimeout(cinemaTimer);
    if(!hunt||hunt.id!==cinemaHuntId||hunt.state!=='offer')return;
    const now=Date.now(),expiry=Date.parse(hunt.offer?.expiresAt);
    const remainingCinema=Math.max(0,cinemaStarted+TOUR_MS-now)+(returnStarted?Math.max(0,returnStarted+RETURN_MS-now):RETURN_MS);
    // Never consume a short provider window for choreography. This does not
    // extend the source's deadline or imply that inventory has been held.
    if(motion.matches||(Number.isFinite(expiry)&&expiry-now<=remainingCinema+10000)){
      clearCinema();presentHunt(hunt);return;
    }
    if(now<cinemaStarted+TOUR_MS){
      presentHunt({...hunt,state:'searching',offer:undefined});
      cinemaTimer=setTimeout(continueCinema,cinemaStarted+TOUR_MS-now);return;
    }
    if(!returnStarted){
      returnStarted=now;play('returning');presentHunt({...hunt,state:'returning'});
    }
    const remaining=returnStarted+RETURN_MS-now;
    if(remaining>0){cinemaTimer=setTimeout(continueCinema,remaining);return;}
    clearCinema();presentHunt(hunt);
  }
  motion.addEventListener?.('change',()=>{
    scene.setReducedMotion?.(motion.matches);
    if(motion.matches&&hunt?.state==='offer'&&cinemaHuntId){clearCinema();presentHunt(hunt);}
  });
  const tones={start:[196,261.63,329.63,392],tick:[440,554.37],returning:[261.63,329.63,392,493.88,587.33,659.25],offer:[392,493.88,587.33,783.99],confirmed:[523.25,659.25,783.99,1046.5]};
  function play(kind){if(!sound)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();(tones[kind]||[]).forEach((f,i)=>{const oscillator=audioCtx.createOscillator(),gain=audioCtx.createGain(),t=audioCtx.currentTime+i*.09;oscillator.type='sine';oscillator.frequency.value=f;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.055,t+.013);gain.gain.exponentialRampToValueAtTime(.001,t+.38);oscillator.connect(gain);gain.connect(audioCtx.destination);oscillator.start(t);oscillator.stop(t+.4);});}catch{}}
  function error(message){$('[data-error]').textContent=message||'';$('[data-error]').hidden=!message;}
  function announce(message){$('[data-announcement]').textContent=message;}
  function sceneState(state,data={}){root.dataset.state=state;scene.setState(state,journeyData(data));}
  function setHero(kicker,title,note=''){$('[data-kicker]').textContent=kicker;$('[data-headline]').innerHTML=title;$('[data-hero-note]').textContent=note;$('[data-hero-note]').hidden=!note;}
  function setDock(title,note){$('[data-dock-title]').textContent=title;$('[data-dock-note]').textContent=note;}
  function updateClock(){$('[data-clock]').textContent=new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}).format(new Date());}
  updateClock();setInterval(updateClock,30000);
  setInterval(updateJourney,250);
  $('[data-sound]').addEventListener('click',()=>{sound=!sound;$('[data-sound]').textContent=sound?'Sound on':'Sound off';$('[data-sound]').setAttribute('aria-pressed',String(sound));if(sound)play('tick');});
  if(document.fullscreenEnabled){$('[data-fullscreen]').hidden=false;$('[data-fullscreen]').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}catch{error('Full screen is unavailable here. Use the browser’s full-screen control.');}});document.addEventListener('fullscreenchange',()=>{$('[data-fullscreen]').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});}
  $$('[data-party]').forEach(button=>button.addEventListener('click',()=>{partySize=Number(button.dataset.party);$$('[data-party]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
  $('[data-needs-toggle]').addEventListener('click',()=>{const open=$('[data-needs]').hidden;$('[data-needs]').hidden=!open;$('[data-needs-toggle]').setAttribute('aria-expanded',String(open));$('[data-needs-toggle] span').textContent=open?'−':'+';});
  function idle(){
    clearCinema();clearInterval(holdTimer);lastState='idle';lastStage=-1;sceneState('idle');$('[data-result]').hidden=true;$('[data-result]').replaceChildren();$('[data-hero]').hidden=false;$('[data-scout-caption]').hidden=false;$('[data-search-signal]').hidden=true;$('[data-filmstrip]').hidden=true;
    $('[data-idle-options]').hidden=false;$('[data-deck-caption]').hidden=false;$('[data-launch]').hidden=false;$('[data-search-dock]').hidden=true;$('[data-reset]').hidden=true;$('[data-source-details]').hidden=true;$('[data-source-details]').open=false;
    $('[data-admission]').hidden=!config.admissionRequired;
    $('[data-promise]').textContent=config.mode==='demo'||config.sponsorReady?'On us.':'Book at source.';
    setHero('','No empty seats.');
    $('[data-launch]').disabled=!worldReady||(config.mode==='live'&&!config.discoveryReady);
    if(config.mode==='live'&&!config.discoveryReady)error(config.setupMessage||'Connect Gemini or Ticketmaster in the server environment to begin live discovery.');
  }
  function switchMode(state){
    const searching=state==='searching'||state==='returning',booking=state==='booking';
    $('[data-hero]').hidden=!(searching||booking);$('[data-scout-caption]').hidden=true;$('[data-search-signal]').hidden=!(searching||booking);$('[data-filmstrip]').hidden=!searching;
    $('[data-result]').hidden=searching||booking;$('[data-idle-options]').hidden=true;$('[data-deck-caption]').hidden=true;$('[data-launch]').hidden=true;$('[data-search-dock]').hidden=false;$('[data-needs]').hidden=true;$('[data-admission]').hidden=true;
    $('[data-reset]').hidden=config.mode!=='demo'||searching||booking||state==='offer';
  }
  $('[data-launch]').addEventListener('click',start);
  async function start(){
    if(requestBusy||hunt||!worldReady)return;
    const code=$('[data-code]').value.trim();if(config.admissionRequired&&!code){error('Enter the one-time code from your activation host.');$('[data-code]').focus();return;}
    requestBusy=true;$('[data-launch]').disabled=true;error();play('start');
    try{const r=await api('/api/hunts',{partySize,stepFree:$('[data-step-free]').checked,adultsOnly:$('[data-adults]').checked,admissionCode:code||undefined});beginCinema(r.id);renderHunt({id:r.id,state:'searching',createdAt:new Date(searchStarted).toISOString(),steps:[]});await poll();}
    catch(e){try{const session=await api('/api/session');if(session.huntId){hunt={id:session.huntId};beginCinema(session.huntId);await poll();return;}}catch{}error(e.message);$('[data-launch]').disabled=false;}
    finally{requestBusy=false;}
  }
  async function poll(){
    clearTimeout(pollTimer);if(!hunt?.id)return;
    const id=hunt.id,epoch=sessionEpoch;
    try{const h=await api('/api/hunts/'+encodeURIComponent(id));if(hunt?.id!==id||epoch!==sessionEpoch)return;error();renderHunt(h);if(['searching','booking'].includes(h.state))pollTimer=setTimeout(poll,800);}
    catch(e){if(hunt?.id!==id||epoch!==sessionEpoch)return;error('Reconnecting… Your entry is saved.');pollTimer=setTimeout(poll,3000);}
  }
  function renderHunt(h){
    hunt=h;
    if(h.state==='searching'&&!cinemaHuntId){
      // A reloaded in-progress entry continues its original tour; a ready
      // offer bypasses this branch and is shown immediately.
      cinemaHuntId=h.id;cinemaStarted=Math.min(Date.now(),Date.parse(h.createdAt)||Date.now());searchStarted=cinemaStarted;
    }
    if(h.state==='offer'&&cinemaHuntId===h.id&&!motion.matches){continueCinema();return;}
    if(h.state!=='searching')clearCinema();
    presentHunt(h);
  }
  function presentHunt(h){
    const state=h.state,changed=state!==lastState;lastState=state;
    if(changed){clearInterval(holdTimer);switchMode(state);}
    sceneState(state,{stage:stageOfTour(),category:h.offer?.category,elapsed:Math.max(0,(Date.now()-(cinemaStarted||searchStarted||Date.now()))/1000)});
    if(state==='searching'){
      searchStarted=cinemaStarted||Date.parse(h.createdAt)||searchStarted||Date.now();
      if(changed){setHero('','');setDock('','');announce('Your agent is out looking.');}
      updateJourney();renderSources({...h,offer:undefined});
    }else if(state==='returning'){
      if(changed){setHero('','');setDock('','');$('[data-search-text]').textContent='';announce('Your agent is bringing back one possibility.');}
    }else if(state==='offer'){
      if(changed){play('offer');renderOffer(h.offer);renderSources(h);announce('Your one reveal is ready. Take it or leave it.');}
    }else if(state==='booking'){
      if(changed){setHero('','');$('[data-search-text]').textContent=config.mode==='demo'?'Making it yours…':'Confirming your ticket…';$('[data-elapsed]').textContent='';setDock('','');announce('Confirming your ticket.');}
    }else if(state==='confirmed'){
      if(changed){play('confirmed');renderReceipt(h);renderSources(h);announce(h.receipt?.status==='confirmed'?'Your ticket is confirmed.':h.receipt?.status==='external'?'Listing saved. No ticket was purchased.':'Demo complete. This is a sample ticket.');}
    }else if(changed){
      if(state==='declined'){terminal('','The city’s still yours.','You passed. Your entry has been used.','↗');setDock('','');}
      else if(state==='empty'){terminal('','No seat this time.',h.error||'No suitable opening. No ticket purchased.','—');setDock('','');}
      else{const review=h.receipt?.status==='review_required';terminal('',review?'Checking your booking.':'Ask your host.',h.receipt?.message||h.error||'We couldn’t finish. Your entry is saved. Please ask your activation host for help.','…',h.id);setDock('','');}
      announce(state==='declined'?'Your seat was declined.':state==='empty'?'No suitable opening was found.':'Please ask your activation host for help.');renderSources(h);
    }
  }
  function renderOffer(o){
    if(!o){terminal('OFFER UNAVAILABLE.','Ask your<br>host.','This offer is incomplete. Your entry is saved.','…');return;}
    const external=o.fulfillment==='external',sample=config.mode==='demo',date=dateTime(o.startsAt);
    $('[data-result]').innerHTML='<div class="ticket-reveal-shell"><article class="ticket ticket-offer"><div class="ticket-top"><span class="ticket-tag">YOUR NIGHT?</span><span>'+(sample?'SAMPLE':external?'LISTING':'OFFER')+'</span></div><div class="ticket-main"><p class="ticket-eyebrow">'+esc(o.category||'Something unexpected')+' · NYC</p><h2>'+esc(o.title)+'</h2><p class="venue">'+esc(o.venue)+'</p><div class="ticket-time"><strong>'+esc(date.time)+'</strong><span>'+esc(date.day)+'<br>'+esc(o.quantity||partySize)+' '+((o.quantity||partySize)===1?'seat':'seats')+(o.seatLabel?' · '+esc(o.seatLabel):'')+'</span></div></div><div class="ticket-perf" aria-hidden="true"></div><div class="ticket-bottom"><div class="ticket-value"><div><small>'+(external?'Price at source':'Total value')+'</small><strong>'+ (external?(o.priceIsEstimate?'~ ':'')+money(o.priceTotal):money(o.priceTotal))+'</strong></div>'+(!external?'<div><small>You pay</small><strong class="you-pay">$0</strong></div>':'')+'</div><div class="ticket-actions"><button class="primary-button" data-accept>'+(external?'Choose listing ↗':'Take it')+'</button><button class="secondary-button" data-decline>Leave it</button></div><p class="ticket-note">'+(sample?'Fictional event · simulated sponsor purchase.':external?'Live listing · no ticket held. Check price and availability at source.':'Covered by '+esc(config.sponsorName)+'. Pending confirmation.')+(o.ageRestriction?' '+esc(o.ageRestriction)+'.':'')+'</p><p class="hold-note" data-hold>One reveal. No reshuffle.</p></div></article><div class="ticket-foil" aria-hidden="true"><span class="foil-glint"></span><span class="foil-seat"><i></i></span><span class="foil-perf"></span><span class="foil-star">✦</span></div></div>';
    $('[data-accept]').addEventListener('click',()=>decide('accept'));$('[data-decline]').addEventListener('click',()=>decide('decline'));
    setDock('','');
    if(o.expiresAt){const update=()=>{const left=Math.ceil((new Date(o.expiresAt)-Date.now())/1000),el=$('[data-hold]');if(!el)return;if(!Number.isFinite(left)||left<=0){clearInterval(holdTimer);$('[data-accept]').disabled=true;el.textContent='Offer window ended. No ticket purchased.';return;}el.textContent=(o.availability==='held'?'Provider hold':'Offer window')+' · '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');};holdTimer=setInterval(update,1000);update();}
  }
  async function decide(action){
    if(requestBusy||!hunt||hunt.state!=='offer'||lastState!=='offer')return;requestBusy=true;error();$$('[data-accept],[data-decline]').forEach(b=>b.disabled=true);clearInterval(holdTimer);
    try{const h=await api('/api/hunts/'+encodeURIComponent(hunt.id)+'/'+action,{});renderHunt(h);if(h.state==='booking')await poll();}
    catch(e){await poll();error(e.message);if(hunt?.state==='offer'&&lastState==='offer')renderOffer(hunt.offer);}
    finally{requestBusy=false;}
  }
  function terminal(kicker,title,message,emblem='↗',entry=''){
    $('[data-result]').innerHTML='<article class="ticket terminal-card"><div class="ticket-main"><div class="terminal-emblem" aria-hidden="true">'+esc(emblem)+'</div><p class="ticket-eyebrow">'+esc(kicker)+'</p><h2>'+title+'</h2><p class="terminal-message">'+esc(message)+'</p>'+(entry?'<p class="receipt-code">ENTRY '+esc(entry.slice(0,12))+'</p>':'')+'</div></article>';
  }
  function renderReceipt(h){
    const o=h.offer||{},r=h.receipt||{},sample=r.status==='sample',external=r.status==='external',confirmed=r.status==='confirmed',date=dateTime(o.startsAt),delivery=safeURL(r.deliveryUrl),source=safeURL(o.sourceUrl);
    if(!sample&&!external&&!confirmed){terminal('BOOKING UNDER REVIEW.','Ask your<br>host.',r.message||'The provider has not confirmed this order. Please ask your activation host to check it.','…',h.id);setDock('','');return;}
    $('[data-result]').innerHTML='<article class="ticket"><div class="ticket-top"><span class="ticket-tag">'+(sample?'DEMO COMPLETE':external?'LISTING SAVED':'TICKET CONFIRMED')+'</span><span>NYC</span></div><div class="ticket-main"><div class="terminal-emblem" aria-hidden="true">↗</div><h2>'+(external?'One more step.':sample?'Imagine tonight.':'You’re going.')+'</h2><p class="venue">'+esc(o.title)+'</p><p class="address">'+esc(o.venue)+'<br>'+esc(date.day)+' · '+esc(date.time)+' · '+esc(o.quantity||partySize)+' '+((o.quantity||partySize)===1?'seat':'seats')+'</p></div><div class="ticket-perf" aria-hidden="true"></div><div class="ticket-bottom"><p class="receipt-code">'+(sample?'SAMPLE · ':external?'SAVED · ':'CONFIRMED · ')+esc(r.id||h.id.slice(0,12))+'</p><div class="ticket-actions">'+(external&&source?'<a class="primary-button" href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">Check availability ↗</a>':confirmed&&delivery?'<a class="primary-button" href="'+esc(delivery)+'" target="_blank" rel="noopener noreferrer">Open my tickets ↗</a>':sample?'<button class="secondary-button" data-print>Print sample</button>':'')+(confirmed?'<button class="secondary-button" data-calendar>Calendar +</button>':'')+'</div><p class="ticket-note">'+(sample?'Sample pass. Not valid for entry. No payment was made.':external?'No ticket purchased. Confirm availability and price with the original provider.':esc(r.message||'Paid for by your sponsor. Your ticket is ready.'))+'</p></div></article>';
    $('[data-print]')?.addEventListener('click',()=>window.print());$('[data-calendar]')?.addEventListener('click',()=>downloadCalendar(o));
    setDock('','');
  }
  function renderSources(h){
    const o=h.offer,sources=$('[data-sources]');$('[data-source-details]').hidden=false;
    const links=(o?.citations||[]).filter(c=>safeURL(c.url));
    if(o&&safeURL(o.sourceUrl)&&!links.some(c=>c.url===o.sourceUrl))links.unshift({title:o.source||'Original listing',url:o.sourceUrl});
    if(links.length)sources.innerHTML=links.map(c=>'<a target="_blank" rel="noopener noreferrer" href="'+esc(safeURL(c.url))+'">'+esc(c.title||'Source')+' ↗</a>').join('');
    else sources.innerHTML='<span>'+esc(config.mode==='demo'?'A fictional city rehearsal. Event details and purchases are simulated.':h.steps?.find(s=>s.status==='active')?.detail||h.steps?.filter(s=>s.detail).at(-1)?.detail||'Source checks are in progress.')+'</span>';
    renderGrounding(o);
  }
  function renderGrounding(offer){
    const region=$('[data-grounding]'),host=$('[data-search-suggestions]'),shadow=host.shadowRoot||host.attachShadow({mode:'open'});
    shadow.replaceChildren();region.hidden=true;
    for(const html of (offer?.searchSuggestions||[]).filter(s=>typeof s==='string'&&s.length<150000).slice(0,5)){
      const template=document.createElement('template');template.innerHTML=html;
      const allowed=new Set(['STYLE','DIV','SPAN','P','A','UL','LI','BR','SVG','PATH','G','DEFS','LINEARGRADIENT','STOP','RECT','CIRCLE','TITLE']);
      const unsafe=[...template.content.querySelectorAll('*')].some(n=>!allowed.has(n.tagName.toUpperCase())||[...n.attributes].some(a=>/^on/i.test(a.name)||['src','srcdoc','xlink:href'].includes(a.name.toLowerCase())||(a.name==='href'&&!safeURL(a.value)))||(n.tagName==='STYLE'&&/@import|url\s*\(/i.test(n.textContent)));
      if(!unsafe){shadow.appendChild(template.content.cloneNode(true));region.hidden=false;}
    }
  }
  function downloadCalendar(o){
    const escapeICS=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const start=new Date(o.startsAt),end=new Date(+start+2*3600000);if(!Number.isFinite(+start))return;
    const stamp=d=>d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//No Empty Seats//EN','BEGIN:VEVENT','UID:'+hunt.id+'@noemptyseats','DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(start),'DTEND:'+stamp(end),'SUMMARY:'+escapeICS(o.title),'LOCATION:'+escapeICS(o.venue+' '+o.address),'DESCRIPTION:End time is an estimate. Check your ticket for event details.','END:VEVENT','END:VCALENDAR'];
    const url=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar'})),a=document.createElement('a');a.href=url;a.download='no-empty-seats.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  $('[data-reset]').addEventListener('click',async()=>{
    if(config.mode!=='demo'||requestBusy)return;requestBusy=true;
    try{await api('/api/demo/reset',{});sessionEpoch++;clearTimeout(pollTimer);clearInterval(holdTimer);clearCinema();hunt=null;partySize=1;$$('[data-party]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.party==='1')));$('[data-adults]').checked=false;$('[data-step-free]').checked=false;$('[data-code]').value='';$('[data-needs-toggle]').setAttribute('aria-expanded','false');$('[data-needs-toggle] span').textContent='+';error();idle();}
    catch(e){error(e.message);}finally{requestBusy=false;}
  });
  async function init(){
    try{config=await api('/api/config');const demo=config.mode==='demo';$('[data-mode]').textContent=demo?'DEMO':config.sponsorReady?'LIVE · SPONSORED':'LIVE DISCOVERY';$('[data-world-label]').textContent=demo?'A LITTLE CITY. A LITTLE LUCK.':'AN ILLUSTRATED AGENT JOURNEY';$('[data-disclosure]').textContent=demo?'Simulated search & booking':config.sponsorReady?'Illustrated journey · live sponsor offers':'Illustrated journey · live listings';const session=await api('/api/session');if(session.huntId){hunt={id:session.huntId};await poll();}else{await artReady;idle();}}
    catch(e){error('The server is unavailable. Start the app with npm run dev, then reload.');}
  }
  init();
})();
