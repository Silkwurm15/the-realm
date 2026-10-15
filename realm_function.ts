// @ts-nocheck
// ============================================================================
// THE REALM: authoritative game server (Supabase Edge Function "realm")
// All rolls, XP, loot, claims, potions, quest rewards and Tempt Fate happen HERE.
// The game rules below are copied verbatim from the client, so both sides agree.
// ============================================================================

// ---------------------------------------------------------------- free photo checks (no AI, no cost)
// Starting values: tune them from the `metrics` column of real submissions. Borderline photos are FLAGGED for review, not rejected.
const PHOTO={minLong:480,minShort:320,minMean:20,maxMean:240,minStd:14,blurReject:6,blurFlag:20,dupBits:6,dailyMax:12};
function analyzeImg(img){const W=img.width,H=img.height,d=img.data,sc=Math.max(1,Math.floor(W/320)),w=Math.floor(W/sc),h=Math.floor(H/sc),g=new Float32Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,c=0;for(let j=0;j<sc;j++)for(let i=0;i<sc;i++){const o=((y*sc+j)*W+(x*sc+i))*4;s+=.299*d[o]+.587*d[o+1]+.114*d[o+2];c++}g[y*w+x]=s/c}
 let m=0;for(const v of g)m+=v;m/=g.length;let sd=0;for(const v of g)sd+=(v-m)*(v-m);sd=Math.sqrt(sd/g.length);
 let lm=0,l2=0,n=0;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const L=4*g[y*w+x]-g[y*w+x-1]-g[y*w+x+1]-g[(y-1)*w+x]-g[(y+1)*w+x];lm+=L;l2+=L*L;n++}lm/=n;const lap=l2/n-lm*lm;   // variance of the Laplacian = sharpness
 let bits='';for(let y=0;y<8;y++){const y0=Math.floor(y*h/8),y1=Math.max(y0+1,Math.floor((y+1)*h/8)),row=[];
  for(let x=0;x<9;x++){const x0=Math.floor(x*w/9),x1=Math.max(x0+1,Math.floor((x+1)*w/9));let s=0,c=0;for(let j=y0;j<y1;j++)for(let i=x0;i<x1;i++){s+=g[j*w+i];c++}row.push(s/c)}
  for(let x=0;x<8;x++)bits+=row[x]>row[x+1]?'1':'0'}   // dHash: a 64-bit fingerprint that survives resizing and recompression
 let hex='';for(let i=0;i<64;i+=4)hex+=parseInt(bits.slice(i,i+4),2).toString(16);
 return{w:W,h:H,mean:m,std:sd,lap,hash:hex}}
function judgePhoto(m){const flags=[];
 if(Math.max(m.w,m.h)<PHOTO.minLong||Math.min(m.w,m.h)<PHOTO.minShort)return{reject:'That photo is too small. Use the full camera and move closer.'};
 if(m.mean<PHOTO.minMean)return{reject:'That photo is too dark.'};
 if(m.mean>PHOTO.maxMean)return{reject:'That photo is washed out.'};
 if(m.std<PHOTO.minStd)return{reject:'That photo looks blank. Point the camera at the scene.'};
 if(m.lap<PHOTO.blurReject)return{reject:'That photo is too blurry. Hold steady and retake it.'};
 if(m.lap<PHOTO.blurFlag)flags.push('soft');if(m.std<30)flags.push('low_contrast');return{flags}}
const ham=(a,b)=>{let x=BigInt('0x'+a)^BigInt('0x'+b),n=0;while(x){n+=Number(x&1n);x>>=1n}return n};
const E=m=>Object.assign(new Error(m),{user:true});
// ---------------------------------------------------------------- player profile (name + look)
const LOOKS=['red','green','blue','orange','pink','purple','black','brown','yellow'];
const BLOCKED=['fuck','shit','cunt','nigg','nazi','hitler','whore','bitch'],RESERVED=/^(admin|moderator|support|staff|realm|system|official|anthropic)/;   // starter list: swap in a maintained one before launch
function cleanName(n){n=String(n==null?'':n).normalize('NFKC').trim().replace(/\s+/g,' ');
 if(!/^[A-Za-z0-9][A-Za-z0-9 _'-]{1,14}[A-Za-z0-9]$/.test(n))throw E("Names are 3 to 16 characters: letters, numbers, spaces, _ - and '.");
 const flat=n.toLowerCase().replace(/0/g,'o').replace(/1/g,'i').replace(/3/g,'e').replace(/4/g,'a').replace(/5/g,'s').replace(/7/g,'t').replace(/[^a-z]/g,'');
 if(BLOCKED.some(w=>flat.includes(w))||RESERVED.test(flat))throw E('That name is not available. Try another.');return n}
const CORE_KEYS=['xpv','xp','need','lvl','cls','hero','loot','chaos','enc','k','daily','weekly','monthly','claimed','rnd','lairs','rift','shards','sq','name','look','onboarded'];
function makeEngine(S,now,deps){
const msgs=[];const toast=m=>msgs.push(String(m)),save=()=>{},hud=()=>{},render=()=>{};let C=null;
const Date=Object.assign(function(...a){return new globalThis.Date(...a)},{now:()=>now});
// ---------------------------------------------------------------- rules (verbatim from the game)
const R=6371000,rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
function dist([lng1,lat1],[lng2,lat2]){const dLa=rad(lat2-lat1),dLo=rad(lng2-lng1);const a=Math.sin(dLa/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
const RANGE=150;
const MULT={daily:1,weekly:1.5,monthly:2},SCALE={daily:1,weekly:5,monthly:15};
const mi=m=>(Math.round(m/1609.344*100)/100)+' mi',ft=m=>Math.round(m*3.28084).toLocaleString()+' ft';
const POOL_BASE=[
 {id:'chest',kind:'chest',goal:1,xp:6,title:n=>`Open ${n} treasure chest${n>1?'s':''}`},
 {id:'quest',kind:'quest',goal:1,xp:8,title:n=>`Complete ${n} quest marker${n>1?'s':''}`},
 {id:'nature',kind:'nature',goal:2,xp:6,title:n=>`Gather ${n} nature discoveries`},
 {id:'walk1',kind:'walk',goal:402.336,xp:5,title:n=>`Walk ${mi(n)}`},
 {id:'walk2',kind:'walk',goal:1609.344,xp:8,title:n=>`Journey ${mi(n)} on foot`},
 {id:'walk3',kind:'walk',goal:3218.688,xp:10,title:n=>`Trek ${mi(n)} across the realm`},
 {id:'chaos',kind:'chaos',goal:1,xp:6,title:n=>`Tempt Fate ${n} time${n>1?'s':''}`}];
const PHOTO_POOL=[
 {id:'photo1',kind:'photo',goal:1,xp:10,title:n=>`Photograph ${n} nature scene${n>1?'s':''}`},
 {id:'photo2',kind:'photo',goal:1,xp:10,title:n=>`Photograph ${n} public landmark${n>1?'s':''}`}];
const PHOTO_ON=false;   // photo quests are PAUSED until real verification exists. The photo code is all still here: set true to bring them back.
const POOL=[...POOL_BASE,...(PHOTO_ON?PHOTO_POOL:[])];
const MS={daily:'Complete Dailies!',weekly:'Daily Dailies',monthly:'Weekly Weeklies'},MSXP=15;
const pad=n=>String(n).padStart(2,'0');
function mkTier(t){const T={q:[...POOL].sort(()=>Math.random()-.5).slice(0,7).map(q=>({id:q.id,kind:q.kind,goal:q.goal*SCALE[t],p:0,xp:q.xp,done:false,title:q.title(q.goal*SCALE[t])})),ms:{p:0,done:false,xp:MSXP}};return T}
function needFor(L){return 50+(L-1)*10}   // XP to go from level L to L+1
// Encounter XP (mimics, chest bonus, nature, bosses, story quests) has NO daily cap and grows with level, the same curve as quests (see lvlScale).
function addXp(x){x=Math.round(x*(1+(clsMod().xpPct+fxList().reduce((a,f)=>a+(f.k==='xp'?f.pct:0),0))/100));if(S.lvl>=100)return hud();S.xp+=x;let up=0;while(S.xp>=S.need&&S.lvl<100){S.xp-=S.need;S.lvl++;S.need=needFor(S.lvl);up=1;toast('Level up! Level '+S.lvl)}if(S.lvl>=100)S.xp=0;if(up&&S.hero){S.hero.hp=stats().hp;S.hero.downed=false}hud()}
function addEnc(x){const g=Math.max(1,Math.round(x*lvlScale()));addXp(g);return g}   // returns the level-scaled amount so the reward text can show it
function lvlScale(){return 1+(S.lvl-1)*.02}   // quest + milestone XP grows ~3x by level 100 (tune the .02)
function award(tier,id,base){const c=`${tier}|${S.k[tier]}|${id}`;if(S.claimed[c])return false;S.claimed[c]=1;const x=Math.round(base*MULT[tier]*lvlScale());addXp(x);toast(`+${x} XP`);return true}
function tick(tier){const m=S[tier].ms;if(m.done)return;m.p=Math.min(5,m.p+1);if(m.p>=5)m.ready=true}
const MSPOT={daily:{h35:1,full:1,res:0},weekly:{h35:2,full:2,res:2},monthly:{h35:3,full:3,res:3}},PN={h35:'Small HP',full:'Full Health',res:'Resurrect'};   // potions granted per milestone (earned stack caps at 20); Resurrect only from weekly + monthly
function claimMs(tier){const m=S[tier].ms;if(!m.ready||m.done)return;m.done=true;m.ready=false;award(tier,'ms',m.xp);const got=Object.keys(MSPOT[tier]).filter(k=>MSPOT[tier][k]).map(k=>'+'+givePot(k,MSPOT[tier][k])+' '+PN[k]);toast('Rewards: '+got.join(' · '));if(tier==='daily')tick('weekly');else if(tier==='weekly')tick('monthly');save();render()}
function claim(tier,q){if(!q.ready||q.done)return;finish(tier,q);save();render()}
function finish(tier,q){if(q.done)return;q.done=true;q.ready=false;q.p=q.goal;award(tier,q.id,q.xp);
 if(tier==='daily'){const n=S.daily.q.filter(x=>x.done).length,m=S.daily.ms;m.p=Math.min(5,n);if(n>=5&&!m.done)m.ready=true}
}
function ev(kind,a=1){let ch=false;['daily','weekly','monthly'].forEach(t=>S[t].q.forEach(q=>{if(q.done||q.kind!==kind)return;ch=true;q.p=Math.min(q.goal,q.p+a);if(q.p>=q.goal){if(q.kind==='photo')finish(t,q);else if(!q.ready){q.ready=true;toast('Quest ready: '+q.title)}}}));if(ch){save();render()}}
/* ================= LOOT (single authoritative catalog + tables) ================= */
const RAR=['common','uncommon','rare','mythic','legendary'],RC={common:'#cfc9b8',uncommon:'#6fdc7a',rare:'#5ab4ff',mythic:'#c98aff',legendary:'#ffb23e'},cap=s=>s[0].toUpperCase()+s.slice(1);
const SLOTS=['helm','chest','feet','hands','main','off','amulet','ring1','ring2','cloak'],SN={helm:'Helm',chest:'Chest',feet:'Feet',hands:'Gloves',main:'Main Hand',off:'Off Hand',amulet:'Amulet',ring1:'Ring 1',ring2:'Ring 2',cloak:'Cloak'};
const TYPE_SLOT={helm:['helm'],chest:['chest'],feet:['feet'],hands:['hands'],main:['main'],off:['off'],amulet:['amulet'],ring:['ring1','ring2'],cloak:['cloak']},TN={...SN,ring:'Ring'};
const BUDGET={common:2,uncommon:4,rare:6,mythic:9,legendary:14};   // stat points per item; HP counts x3 (1 point = 1 ATK, 1 DEF or 3 HP)
const WT={helm:[0,.6,.4],chest:[0,.4,.6],feet:[.2,.4,.4],hands:[.5,.5,0],main:[1,0,0],off:[.4,.6,0],amulet:[.4,0,.6],ring:[.5,.25,.25],cloak:[.2,.4,.4]};   // share of budget as [ATK, DEF, HP]
const NAMES={helm:['Worn Cap',"Ranger's Hood","Knight's Helm",'Dragonscale Helm','Crown of Dawn'],chest:['Padded Tunic','Studded Jerkin','Steel Cuirass','Wyrmhide Plate','Aegis of the Sunforge'],feet:['Travel Boots','Trail Boots','Greaves of Stride','Stormwalkers','Boots of the Endless Road'],hands:['Cloth Wraps','Leather Gloves','Steel Gauntlets','Voidgrip Gauntlets','Fists of the Titan'],main:['Rusty Sword','Iron Blade','Silverwood Blade','Nightfang','Realmbreaker'],off:['Wooden Buckler','Iron Shield',"Warden's Shield",'Mythril Bulwark','Bulwark of Ages'],amulet:['Bone Charm','Copper Pendant','Moonstone Amulet','Heart of Embers','Eye of the Realm'],ring:['Tin Band','Silver Band','Sapphire Ring','Ring of Eclipse','Ring of the First King'],cloak:['Frayed Cloak','Wool Cloak',"Ranger's Mantle",'Shadow Veil','Mantle of Stars']};
const CAT={};RAR.forEach((r,i)=>Object.keys(NAMES).forEach(t=>{const w=WT[t],B=BUDGET[r];CAT[t+'_'+r]=Object.freeze({id:t+'_'+r,name:NAMES[t][i],type:t,rarity:r,atk:Math.round(B*w[0]),def:Math.round(B*w[1]),hp:Math.round(B*w[2]*3)})}));Object.freeze(CAT);
const POTS={h35:{name:'Small HP Potion',icon:'🧪',heal:.35},full:{name:'Full Health Potion',icon:'⚗️',heal:1},res:{name:'Resurrect Potion',icon:'✨',heal:.5}};   // Resurrect: revives at 50% max HP
const BONUS_XP={chest:25,boss:100},EXTRA_PCT=.25;   // bonus-20 extra stat = 25% of the item's rarity budget
const MIMIC={mimic:{name:'Mimic',xp:10,loot:'common'},smimic:{name:'Strong Mimic',xp:20,loot:'uncommon'}};   // real fights now; win = XP + item, lose = chest forfeited
// ONE table set, used by chests AND bosses. Ranges are [lo,hi,result]; validated below.
const TABLES={
 chest:[[1,2,'smimic'],[3,4,'mimic'],[5,6,'h35'],[7,10,'common'],[11,13,'uncommon'],[14,16,'rare'],[17,19,'mythic'],[20,20,'mythic+']],
 boss:[[1,4,'common'],[5,8,'uncommon'],[9,11,'rare'],[12,15,'mythic'],[16,19,'legendary'],[20,20,'legendary+']],
 bonus:[[1,10,'xp'],[11,15,'full'],[16,19,'res'],[20,20,'extra']],
 rift:[[1,8,'buff'],[9,15,'loot'],[16,19,'loot+'],[20,20,'jackpot']],
 chaos:[[1,2,'cfail'],[3,5,'omen'],[6,9,'shrug'],[10,12,'blessing'],[13,15,'explore'],[16,17,'potion'],[18,18,'surge'],[19,20,'cwin']]};
for(const k in TABLES){let n=1;TABLES[k].forEach(([a,b])=>{if(a!==n||b<a)throw new Error('Loot table "'+k+'" overlaps or has a gap at '+a);n=b+1});if(n!==21)throw new Error('Loot table "'+k+'" must cover 1-20')}
const ri=n=>{const a=new Uint32Array(1),lim=4294967296-4294967296%n;let x;do{crypto.getRandomValues(a);x=a[0]}while(x>=lim);return x%n},d20=()=>ri(20)+1,look=(t,r)=>TABLES[t].find(e=>r>=e[0]&&r<=e[1])[2];
const H=()=>S.hero,iStat=it=>{const c=CAT[it.cid],o={atk:c.atk,def:c.def,hp:c.hp};if(it.extra&&o[it.extra.stat]!==undefined)o[it.extra.stat]+=it.extra.val;return o};   // always recomputed from the catalog
const fmtS=o=>[o.atk&&'+'+o.atk+' ATK',o.def&&'+'+o.def+' DEF',o.hp&&'+'+o.hp+' HP'].filter(Boolean).join('  '),fmtI=it=>{const c=CAT[it.cid];return`${cap(c.rarity)} ${c.name} (${TN[c.type]})  ${fmtS(iStat(it))}${it.extra?'  [extra +'+it.extra.val+' '+it.extra.stat.toUpperCase()+']':''}`};
function grantItem(src,rarity){if(rarity==='legendary'&&src!=='boss'&&src!=='event')rarity='mythic';   // hard guard: chests can never give Legendary
 const types=Object.keys(NAMES),it={uid:Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join(''),cid:types[ri(types.length)]+'_'+rarity};
 if(H().inv.some(i=>i.uid===it.uid))return grantItem(src,rarity);H().inv.push(it);return it}
/* ================= CLASSES + COMBAT ================= */
// Class modifiers are FLAT and applied AFTER level + equipment are summed (additive only, so nothing multiplies or stacks).
const sg=v=>(v>0?'+':'')+v;
const CLASSES={
 warrior:{n:'Warrior',d:'Front-line fighter.',atk:1,exp:-1},
 paladin:{n:'Paladin',d:'Holy champion.',atk:2,chaosBonus:-1},
 antipaladin:{n:'Anti-Paladin',d:'Dark knight who thrives on chaos.',chaosReq:-1,holy:1},
 druid:{n:'Druid',d:'Nature specialist. Parks and wild places favor you.',exp:1,herb:1,def:-1},
 archer:{n:'Archer',d:'Opens every fight with a deadly shot.',first:50,hp:-5},
 assassin:{n:'Assassin',d:'Hits hard but fragile.',atk:2,hp:-5},
 barbarian:{n:'Barbarian',d:'Huge health pool, lightly armored.',hp:10,def:-1},
 monk:{n:'Monk',d:'Disciplined and hard to hurt.',def:2,atk:-1},
 scout:{n:'Scout',d:'Born explorer.',exp:2,atk:-1},
 bard:{n:'Bard',d:'Songs that speed progression.',xpPct:10,def:-1},
 healer:{n:'Healer',d:'Recovers faster than anyone.',heal:15,regen:2,atk:-1},
 wizard:{n:'Wizard',d:'Arcane bolts slip past armor.',pierce:2,hp:-5}};
function chaosFx(){const f=S.chaos&&S.chaos.fx;return f&&f.until>Date.now()?f:null}
function riftFx(){const f=S.rift&&S.rift.fx;return f&&f.until>Date.now()?f:null}
const fxList=()=>[chaosFx(),riftFx()].filter(Boolean);   // two slots (Tempt Fate + Arcane Rift) that stack
const clsMod=()=>{const c={atk:0,def:0,hp:0,exp:0,chaosBonus:0,chaosReq:0,holy:0,pierce:0,first:0,xpPct:0,heal:0,regen:1,herb:0,...(CLASSES[S.cls]||{})};for(const f of fxList())if(f.k==='exp')c.exp+=f.v;return c};
const lvlBase=L=>({atk:2+Math.floor(L/10),def:Math.floor(L/10),hp:10+5*(L-1)});   // Start 10 HP, +5 per level, level cap 100
function parts(){const b=lvlBase(S.lvl),g={atk:0,def:0,hp:0},cm=clsMod();for(const k in H().eq){const it=H().eq[k];if(!it||!CAT[it.cid])continue;const o=iStat(it);g.atk+=o.atk;g.def+=o.def;g.hp+=o.hp}
 const s={atk:Math.max(1,b.atk+g.atk+cm.atk),def:Math.max(0,b.def+g.def+cm.def),hp:Math.max(5,b.hp+g.hp+cm.hp)};
 for(const f of fxList())if(f.k==='stat'){const v=s[f.stat];s[f.stat]=Math.max(f.stat==='atk'?1:0,v+Math.sign(f.pct)*Math.max(1,Math.round(v*Math.abs(f.pct)/100)))}   // chaos buff/debuff applied last, min 1 point
 return{b,g,cm,s}}
function stats(){return parts().s}
// Enemies scale off a "par" hero: level base + half of a full set of level-appropriate gear. Naked heroes lose; at-par gear wins; better gear wins easier.
const ENEMY={mimic:{n:'Mimic',m:[.6,.7,.5]},smimic:{n:'Strong Mimic',m:[.9,.9,.8]},boss:{n:'Dark Lair Boss',m:[2.5,.9,.8]},rift:{n:'Rift Beast',m:[.8,.85,.7]}};
function enemy(k,L){const b=lvlBase(L),r=L<10?0:L<30?1:L<55?2:L<80?3:4,g={atk:0,def:0,hp:0};['helm','chest','feet','hands','main','off','amulet','ring','ring','cloak'].forEach(t=>{const c=CAT[t+'_'+RAR[r]];g.atk+=c.atk;g.def+=c.def;g.hp+=c.hp});
 const m=ENEMY[k].m;let hp=(b.hp+.5*g.hp)*m[0];if(k==='boss')hp*=1+.1*clsMod().chaosReq;
 return{n:ENEMY[k].n,hp:Math.max(1,Math.round(hp)),atk:Math.max(1,Math.round((b.atk+.5*g.atk)*m[1])),def:Math.round((b.def+.5*g.def)*m[2])}}
// Damage = ceil(ATK x 10 / (10 + DEF)): DEF has diminishing returns (10 DEF halves damage). Min 1 per hit, max 50% of the target's max HP per hit. No randomness.
const hitDmg=(a,d)=>Math.max(1,Math.ceil(a*10/(10+Math.max(0,d))));
function fight(k){const s=stats(),e=enemy(k,S.lvl),cm=clsMod(),boss=k==='boss',st=Math.floor(H().hp);let ph=st,eh=e.hp,r=0,first=true;
 while(r<300){r++;let d=hitDmg(s.atk,e.def-cm.pierce);if(first&&cm.first)d=Math.ceil(d*(1+cm.first/100));first=false;if(boss)d+=cm.holy;eh-=Math.min(d,Math.ceil(e.hp*.5));if(eh<=0)break;
  ph-=Math.min(hitDmg(e.atk,s.def),Math.ceil(s.hp*.5));if(ph<=0)break}
 return{win:eh<=0,hp:Math.max(0,ph),dmg:st-Math.max(0,ph),rounds:r,e}}
function heal(f){const h=H(),mx=stats().hp;h.hp=Math.min(mx,h.hp+Math.round(mx*Math.min(1,f)))}
function revive(){const h=H();h.hp=Math.max(1,Math.round(stats().hp*POTS.res.heal));h.downed=false}
const POT_CAP=20,potN=k=>(H().pot[k]||0)+(H().buy[k]||0);
function givePot(k,n){const h=H(),a=Math.max(0,Math.min(n,POT_CAP-(h.pot[k]||0)));h.pot[k]=(h.pot[k]||0)+a;return a}   // earned potions stop at the cap: no potion, no XP substitute
function takePot(k){const h=H();if(h.pot[k]>0)h.pot[k]--;else if(h.buy[k]>0)h.buy[k]--;else return false;return true}   // earned stack is used first
function useRes(){if(!H().downed||!takePot('res'))return false;revive();save();hud();return true}
function down(){const h=H();h.hp=0;h.downed=true;return'You are downed. No chests or lairs until you recover to 25% HP. Rest, gather Nature Discoveries (+5% HP each), or use a Resurrect Potion.'}   // Resurrect is always the player's choice
function upDown(){const h=H(),mx=stats().hp;if(h.downed&&h.hp>=mx*.25){h.downed=false;toast('You have recovered enough to fight again.')}}
function recover(){const h=H(),now=Date.now(),mx=stats().hp,dt=Math.max(0,(now-(h.t||now))/6e4);h.t=now;if(C)return;if(h.hp<=0)h.downed=true;   // rest regenerates 2% max HP/min, even while downed
 h.hp=Math.min(mx,h.hp+mx*.02*clsMod().regen*dt);upDown();save()}
const GRID={cell:.0025,radius:600,max:30, // cell size in degrees (~900 ft); spawn radius around player (m); max markers on screen
 types:{chest:{n:2,p:.40,life:60},nature:{n:2,p:.45,life:60},quest:{n:1,p:.30,life:120},rift:{n:1,p:.15,life:30}}}; // n = sites per cell, p = chance a site is active, life = minutes
function h32(t){let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const rnd=t=>h32(t)/4294967296;
const LAIR={max:3,minGap:152.4,life:20*6e4,rMin:150,rMax:600}; // max per window; min spacing (m); lifetime (ms); spawn ring around player (m)
// ---------------------------------------------------------------- server-only logic
const CHAOS_CD=36e5,CHAOS_DUR=36e5;
const TIERS=['daily','weekly','monthly'],MAXV=70,CT=CHAOS_CD;
const okLL=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
function tzOk(z){try{new Intl.DateTimeFormat('en-US',{timeZone:z});return true}catch(e){return false}}
function parts_(t,tz){return Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new globalThis.Date(t)).map(x=>[x.type,x.value]))}
function keysTz(){const p=parts_(now,S.tz),Y=+p.year,M=+p.month,D=+p.day,wd=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(p.weekday),m=new globalThis.Date(globalThis.Date.UTC(Y,M-1,D-wd));
 return{daily:`${Y}-${pad(M)}-${pad(D)}`,weekly:`${m.getUTCFullYear()}-${pad(m.getUTCMonth()+1)}-${pad(m.getUTCDate())}`,monthly:`${Y}-${pad(M)}`}}
function rollover(){const k=keysTz();let ch=false;
 if(k.daily>S.k.daily){S.daily=mkTier('daily');S.rnd={n:0,done:[]};ch=true}
 if(k.weekly>S.k.weekly){S.weekly=mkTier('weekly');ch=true}
 if(k.monthly>S.k.monthly){S.monthly=mkTier('monthly');ch=true}
 if(ch){S.k=k;Object.keys(S.claimed).forEach(c=>{const[t,p]=c.split('|');if(TIERS.includes(t)&&k[t]!==p)delete S.claimed[c]})}}
function lairWin(){const p=parts_(now,S.tz),h=+p.hour;if(h%2)return null;const st=now-((+p.minute)*60+(+p.second))*1000-(now%1000);return{id:`${p.year}-${p.month}-${p.day}-${h}`,end:st+LAIR.life}}
// a marker is real only if the deterministic grid says it exists right now, and the player is standing near it
function site(key,exp,ll,type){const m=/^(-?\d+),(-?\d+),(chest|nature|quest|rift),(\d+)\|(-?\d+)$/.exec(String(key));if(!m)throw E('Unknown marker.');
 const cx=+m[1],cy=+m[2],t=m[3],j=+m[4],n=+m[5],T=GRID.types[t];if(!T||t!==type||j>=T.n)throw E('Unknown marker.');
 const sk=`${cx},${cy},${t},${j}`,life=T.life*6e4,ph=rnd(sk+'p')*life,cur=Math.floor((now+ph)/life),e=(n+1)*life-ph;
 if(n!==cur&&!(n===cur-1&&now-e<3e4))throw E('That marker has vanished.');
 if(Math.abs(e-exp)>1)throw E('Marker mismatch.');
 if(rnd(sk+'|'+n)>=Math.min(1,T.p*4))throw E('No marker there.');
 const pos=[(cx+.1+.8*rnd(sk+'x'))*GRID.cell,(cy+.1+.8*rnd(sk+'y'))*GRID.cell];
 if(dist(pos,ll)>RANGE+30)throw E('Too far away.');return{key:String(key),exp:Math.round(e)}}
function takeClaim(key,exp){const Cc=S.loot.claimed,ck=key+'|'+exp;Object.keys(Cc).forEach(k=>{if(Cc[k]<now)delete Cc[k]});if(Cc[ck])throw E('Already claimed.');Cc[ck]=exp;return ck}
function seen(ll){if(!okLL(ll))throw E('Location unavailable.');const p=S.pos;if(p){const d=dist(p.ll,ll),dt=Math.max(1,(now-p.t)/1000);if(d>200&&d/dt>MAXV)throw E('Location jump detected. Try again in a moment.')}S.pos={ll,t:now}}
const clampHp=()=>{const h=H();h.hp=Math.min(h.hp,stats().hp);if(h.hp<=0)h.downed=true};
const view=(F,phase,title)=>{const e=enemy(F.k,S.lvl),h=H();return{phase,title,log:F.log.slice(-4),eh:Math.max(0,F.eh),e:{n:e.n,hp:e.hp},m:{name:MIMIC[F.k].name,xp:MIMIC[F.k].xp},hp:Math.floor(h.hp),mhp:stats().hp,res:potN('res'),strong:F.k==='smimic'}};
const A={};
A.sync=()=>({});
A.loot=a=>{const boss=a.t==='boss',src=boss?'boss':'chest',h=H(),Ls=[];seen(a.ll);
 if(h.downed)throw E('You are downed. Recover to 25% HP first.');
 let key,exp;
 if(boss){const lr=S.lairs;if(!lr||lr.end<=now||a.exp!==lr.end)throw E('That lair has vanished.');const p=lr.list.find(l=>'lair'+l[0]===a.key);if(!p)throw E('No such lair.');if(dist(p,a.ll)>RANGE+30)throw E('Too far away.');key=String(a.key);exp=lr.end}
 else{const s=site(a.key,a.exp,a.ll,'chest');key=s.key;exp=s.exp}
 const Cc=S.loot.claimed,ck=key+'|'+exp;if(Cc[ck])throw E('Already claimed.');
 const claimIt=()=>{Object.keys(Cc).forEach(k=>{if(Cc[k]<now)delete Cc[k]});Cc[ck]=exp};
 const out=(icon,title)=>({icon,title,lines:Ls,res:!!(h.downed&&potN('res')>0)});
 ev(a.t);sqEv(boss?'lair':'chest');
 if(boss){const f=fight('boss'),e=f.e;Ls.push('⚔ '+e.n+'  HP '+e.hp+' · ATK '+e.atk+' · DEF '+e.def,f.win?'Victory in '+f.rounds+' rounds. You lost '+f.dmg+' HP ('+f.hp+'/'+stats().hp+').':'Defeat after '+f.rounds+' rounds.');h.hp=f.hp;
  if(!f.win){Ls.push(down());return out('💀','Defeated')}
  claimIt();const xp=addEnc(Math.round(250*(1+.1*clsMod().chaosBonus)));Ls.push('Reward: +'+xp+' XP')}
 const roll=d20(),res=look(src,roll);let item=null,bonus=false;if(boss)Ls.push('🎲 D20 roll: '+roll);
 if(MIMIC[res]){claimIt();const e=enemy(res,S.lvl);S.fight={k:res,eh:e.hp,first:true,log:[],t:now};return{fight:view(S.fight,'intro','Oh no! The chest was a '+MIMIC[res].name+'!')}}
 if(!boss)claimIt();
 if(POTS[res]){Ls.push(givePot(res,1)?'Reward: '+POTS[res].name+' (restores '+POTS[res].heal*100+'% max HP)':'Your potion bag is already full.')}
 else{bonus=res.endsWith('+');item=grantItem(src,res.replace('+',''));Ls.push('Reward: '+cap(CAT[item.cid].rarity)+' loot','★ '+fmtI(item))}
 if(bonus){const b=d20(),br=look('bonus',b);if(boss)Ls.push('','🎲 Bonus D20 roll: '+b);
  if(br==='xp'){const g=addEnc(BONUS_XP[src]);Ls.push('Bonus: +'+g+' XP')}
  else if(br==='full'||br==='res'){Ls.push(givePot(br,1)?'Bonus: '+POTS[br].name:'Bonus: your potion bag is already full')}
  else{const st=['atk','def','hp'][ri(3)],r=CAT[item.cid].rarity,v=Math.round(BUDGET[r]*EXTRA_PCT)*(st==='hp'?3:1);item.extra={stat:st,val:v};Ls.push('Bonus: extra stat on your '+cap(r)+' item (+'+v+' '+st.toUpperCase()+')')}}
 return out(boss?'💀':'🧰',boss?'Dark Lair Conquered':'Chest Opened')};
A.fight=a=>{const F=S.fight,h=H();if(!F||now-F.t>6e5){S.fight=null;throw E('There is no fight in progress.')}
 const m=MIMIC[F.k],e=enemy(F.k,S.lvl),op=a.op;
 const foe=()=>{const s=stats(),d=Math.min(hitDmg(e.atk,s.def),Math.ceil(s.hp*.5));h.hp=Math.max(0,Math.floor(h.hp)-d);F.log.push('The '+m.name+' bites you for '+d+'.');return h.hp<=0};
 const me=()=>{const s=stats(),cm=clsMod();let d=hitDmg(s.atk,e.def-cm.pierce);if(F.first&&cm.first)d=Math.ceil(d*(1+cm.first/100));F.first=false;d=Math.min(d,Math.ceil(e.hp*.5));F.eh-=d;F.log.push('You strike the '+m.name+' for '+d+'.');return F.eh<=0};
 const fin=(title,lines)=>{F.log=lines;const v=view(F,'end',title);S.fight=null;return{fight:v}};
 const lose=()=>{if(potN('res')>0){F.log.push('You have fallen!');return{fight:view(F,'fallen','You have fallen!')}}return defeat()};
 const defeat=()=>fin('Defeated!',['The '+m.name+' overwhelms you.','The chest is lost.',down()]);
 const choice=()=>({fight:view(F,'choice','Your move!')});
 if(F.dead)throw E('The fight is over.');
 if(op==='start'){if(F.started)throw E('Already started.');F.started=true;F.log.push('The '+m.name+' lunges first!');return foe()?lose():choice()}
 if(!F.started)throw E('Start the fight first.');
 if(op==='attack'){if(h.hp<=0)throw E('You are down.');if(me()){const item=grantItem('chest',m.loot),g=addEnc(m.xp);return fin('Victory!',['The '+m.name+' falls!','Reward: +'+g+' XP','★ '+fmtI(item)])}return foe()?lose():choice()}
 if(op==='flee'){if(h.hp<=0)return defeat();return fin('You Fled!',['You escape, but your wounds remain ('+Math.floor(h.hp)+' / '+stats().hp+' HP).','The chest is lost.'])}
 if(op==='res'){if(h.hp>0||!takePot('res'))throw E('No Resurrect Potion to use.');revive();F.log.push('✨ A Resurrect Potion lifts you to '+Math.floor(h.hp)+' HP. The fight goes on!');return choice()}
 if(op==='giveup')return defeat();
 throw E('Unknown fight action.')};
A.nature=a=>{seen(a.ll);const s=site(a.key,a.exp,a.ll,'nature');takeClaim(s.key,s.exp);ev('nature');sqEv('nature');
 const cm=clsMod(),x=addEnc(Math.max(1,Math.round(3*(1+.15*cm.exp)))),m=['Nature gathered! +'+x+' XP'];
 if(H().downed){const mx=stats().hp,g=Math.max(1,Math.round(mx*.05));H().hp=Math.min(mx,H().hp+g);m.push('+'+g+' HP (resting in nature)');upDown()}
 if(cm.herb&&ri(100)<(a.green?50:25)){if(givePot('h35',1))m.push('+Small HP Potion')}
 return{lines:m}};
A.marker=a=>{throw E('The game has been updated. Please refresh the page.')};   // quest and rift markers now use A.quest and A.rift
A.claim=a=>{if(!TIERS.includes(a.tier))throw E('Bad quest.');const q=S[a.tier].q[a.i|0];if(!q)throw E('No such quest.');if(!q.ready||q.done)throw E('That quest is not ready.');claim(a.tier,q);return{}};
A.claimms=a=>{if(!TIERS.includes(a.tier))throw E('Bad quest.');const m=S[a.tier].ms;if(!m.ready||m.done)throw E('That reward is not ready.');claimMs(a.tier);return{}};
A.walk=a=>{const m=Math.max(0,Math.min(+a.m||0,3000)),t=(S.walk&&S.walk.t)||now-6e4,cap=Math.max(1,(now-t)/1000)*3.5+40,use=Math.min(m,cap);S.walk={t:now};if(use>=1)ev('walk',use*Math.max(.1,1+.15*clsMod().exp));return{}};
A.photo=async a=>{if(!PHOTO_ON)throw E('Photo quests are paused for now.');seen(a.ll);const p=String(a.path||''),m=/^([0-9a-f-]{36})\/(\d{10,})\.jpg$/.exec(p);if(!m||m[1]!==deps.uid)throw E('Bad photo.');
 if(Math.abs(now-(+m[2]))>6e5)throw E('That photo is too old. Take a new one.');S.photos=S.photos||{};if(S.photos[p])throw E('Photo already used.');
 const pc=S.pc&&S.pc.k===S.k.daily?S.pc:(S.pc={k:S.k.daily,n:0});if(pc.n>=PHOTO.dailyMax)throw E('Daily photo limit reached.');
 const im=await deps.analyze(p);if(!im)throw E('Photo upload not found or unreadable.');
 const row={path:p,lat:a.ll[1],lng:a.ll[0],taken_at:new globalThis.Date(+m[2]).toISOString(),phash:im.hash,metrics:{w:im.w,h:im.h,mean:Math.round(im.mean),std:Math.round(im.std),lap:Math.round(im.lap*10)/10}};
 const reject=async why=>{await deps.logPhoto({...row,status:'rejected',reason:why});await deps.removePhoto(p);throw E(why)};
 const v=judgePhoto(im);if(v.reject)await reject(v.reject);
 if((await deps.ownHashes()).some(h=>ham(h,im.hash)<=PHOTO.dupBits))await reject('That looks like a photo you already used. Take a new one.');
 if(await deps.hashSeen(im.hash))await reject('That photo was already submitted. Take your own.');
 Object.keys(S.photos).forEach(k=>{if(S.photos[k]<now-864e5)delete S.photos[k]});S.photos[p]=now;pc.n++;
 await deps.logPhoto({...row,status:'pending',flags:v.flags});ev('photo');return{}};
A.tempt=()=>{const Ch=S.chaos,t=now;if(t<Ch.last+CHAOS_CD)throw E('Fate is quiet. Return in '+Math.ceil((Ch.last+CHAOS_CD-t)/6e4)+' min.');
 const cm=clsMod(),h=H(),roll=d20(),eff=Math.min(20,Math.max(1,roll-cm.chaosReq)),res=look('chaos',eff),pb=cm.chaosBonus,st=()=>ri(2)?'atk':'def';let fx=null,extra='';
 if(res==='cfail')fx={k:'stat',stat:st(),pct:-10};else if(res==='omen')fx={k:'xp',pct:-10};else if(res==='blessing')fx={k:'xp',pct:10+pb};else if(res==='explore')fx={k:'exp',v:1};else if(res==='cwin')fx={k:'stat',stat:st(),pct:10+pb};
 else if(res==='potion'||(res==='surge'&&h.downed)){extra=givePot('h35',1)?'+1 Small HP Potion':'Your potion bag is already full.'}else if(res==='surge'){h.hp=stats().hp;extra='HP restored: '+h.hp}
 if(fx)fx.until=t+CHAOS_DUR;Ch.last=t;Ch.fx=fx;ev('chaos');return{roll,eff,res,fx,extra}};
/* ================= ARCANE RIFTS: one room, one choice. Win = all-positive reward roll + Rift Shards. Fail = short debuff. ================= */
const RIFT_BUFF_MS=36e5,RIFT_DEBUFF_MS=18e5,RIFT_RUN_MS=6e5;
const TAGS={finesse:['assassin','archer','scout','bard'],might:['warrior','barbarian','paladin','antipaladin','monk'],arcane:['wizard','druid','healer']};
const CHOICE={disarm:{label:'Disarm it',tag:'finesse'},smash:{label:'Smash through',tag:'might'},runes:{label:'Read the runes',tag:'arcane'},
 sneak:{label:'Slip past it',tag:'finesse'},fight:{label:'Fight it',tag:'might',fight:1},calm:{label:'Calm it',tag:'arcane'},
 grab:{label:'Grab the prize',risky:1,sub:'Risky, but richer'},leave:{label:'Walk away',safe:1,sub:'Safe, small reward'},
 bold:{label:'Step in boldly',tag:'might'},slip:{label:'Slip through',tag:'finesse'},weave:{label:'Weave the magic',tag:'arcane'}};
const ROOMS={
 trap:{name:'Trap Room',icon:'🪤',dc:10,pick:['disarm','smash','runes'],text:'Glowing runes crawl across the floor. One wrong step and the room bites back.'},
 beast:{name:'Creature Room',icon:'🐺',dc:11,pick:['fight','sneak','calm'],text:'Something shaped from raw magic uncoils in the dark and turns its eyes on you.'},
 temptation:{name:'Temptation Room',icon:'💎',dc:13,pick:['grab','leave'],text:'A glittering prize floats in the middle of the room. Nothing else is here. That is what worries you.'},
 wild:{name:'Wild Room',icon:'🌀',dc:10,pick:['bold','slip','weave'],text:'The room will not hold still. Colors fold in on themselves.'}};
const WILD={calm:{name:'Calm Weave',text:'The rift is oddly gentle. Easier to cross.',dcMod:-3,lift:0,shards:0},
 unstable:{name:'Unstable Weave',text:'The rift crackles. Harder to cross, but richer.',dcMod:3,lift:4,shards:1},
 echo:{name:'Echoing Weave',text:'The rift echoes. A win pays out twice.',dcMod:0,lift:0,shards:0,twice:1}};
const riftMod=()=>Math.min(4,Math.floor(S.lvl/25));
const riftOdds=dc=>Math.max(.05,Math.min(.95,(21-dc)/20));
function riftDc(r,id){const rm=ROOMS[r.room];return rm.dc+(r.room==='wild'?WILD[r.wild].dcMod:0)}
function riftBuff(scale){const p=[{k:'xp',pct:Math.round(20*scale)},{k:'stat',stat:'atk',pct:Math.round(15*scale)},{k:'stat',stat:'def',pct:Math.round(15*scale)},{k:'exp',v:scale<1?1:2}];return{...p[ri(p.length)],until:now+RIFT_BUFF_MS}}
const RIFT_DEBUFFS=[{k:'xp',pct:-10},{k:'stat',stat:'atk',pct:-10},{k:'stat',stat:'def',pct:-10}];
function riftReward(lift,xs,Ls,allowBuff){
 const nat=d20(),eff=nat===20?20:Math.min(19,nat+lift),kind=look('rift',eff);let fx=null,item=null;
 const sub=d20(),base=sub<=10?'uncommon':sub<=18?'rare':'mythic';
 if(kind==='buff'){if(allowBuff){fx=riftBuff(1)}}
 else if(kind==='loot'){item=grantItem('chest',base)}
 else if(kind==='loot+'){item=grantItem('chest',base==='uncommon'?'rare':base);fx=allowBuff?riftBuff(.5):null}
 else{item=grantItem('chest','mythic');H().hp=stats().hp;H().downed=false}
 const sh=1+(eff>=16?1:0)+(nat===20?2:0)+xs;S.shards=Math.min(9999,(S.shards||0)+sh);
 Ls.push('🎲 Reward roll: '+nat+(eff!==nat?' (counts as '+eff+')':''));
 if(kind==='buff'&&!fx){S.shards+=1;Ls.push('Your rift buff is already strong. +1 bonus Rift Shard.')}
 if(fx)Ls.push('✨ Buff: '+fxLabel(fx)+' for 60 minutes');
 if(item)Ls.push('★ '+fmtI(item));
 if(kind==='jackpot')Ls.push('💫 JACKPOT! You are fully healed.');
 Ls.push('💠 +'+sh+' Rift Shard'+(sh>1?'s':''));
 return{fx,kind,sh}}
const fxLabel=f=>f.k==='stat'?sg(f.pct)+'% '+f.stat.toUpperCase():f.k==='xp'?sg(f.pct)+'% XP':'+'+f.v+' Exploration';
A.rift=a=>{const R=S.rift,h=H(),op=String(a.op||'');if(R.run&&R.run.until<=now)R.run=null;
 const view=()=>{const r=R.run,rm=ROOMS[r.room],cm=riftMod(),dc0=rm.dc+(r.room==='wild'?WILD[r.wild].dcMod:0);
  return{rift:{phase:'room',room:{id:r.room,name:rm.name,icon:rm.icon,text:rm.text,wild:r.wild?{name:WILD[r.wild].name,text:WILD[r.wild].text}:null,
   choices:rm.pick.map(id=>{const c=CHOICE[id],fit=!!(c.tag&&TAGS[c.tag].includes(S.cls));let odds=null,note=c.sub||'';
    if(c.fight)odds=fight('rift').win?1:0;else if(!c.safe){odds=riftOdds(id==='grab'?13:dc0-cm-(fit?3:0))}else odds=1;
    return{id,label:c.label,odds,fit,note,fight:!!c.fight}})}}}};
 if(op==='resume'){if(!R.run)throw E('There is no rift to resume.');return view()}
 if(op==='enter'){
  if(R.run){if(R.run.key===String(a.key))return view();throw E('You are already inside a rift. Finish it first.')}
  seen(a.ll);if(h.downed)throw E('You are downed. Recover to 25% HP first.');
  const s=site(a.key,a.exp,a.ll,'rift');takeClaim(s.key,s.exp);
  const ids=Object.keys(ROOMS),room=ids[ri(ids.length)];R.run={key:s.key,room,wild:room==='wild'?Object.keys(WILD)[ri(3)]:null,until:now+RIFT_RUN_MS};return view()}
 if(op==='pick'){
  const r=R.run;if(!r)throw E('This rift has closed.');const rm=ROOMS[r.room],id=String(a.pick||'');if(!rm.pick.includes(id))throw E('Unknown choice.');
  const c=CHOICE[id],wd=r.wild?WILD[r.wild]:null,fit=!!(c.tag&&TAGS[c.tag].includes(S.cls)),mod=riftMod()+(fit?3:0),Ls=[];
  let dc=rm.dc,lift=0,xs=0,ok,roll=null,reward=null;
  if(wd){dc+=wd.dcMod;lift+=wd.lift;xs+=wd.shards}
  if(id==='grab'){dc=13;lift=3;xs=1}
  R.run=null;
  if(id==='leave'){ok=true;S.shards=Math.min(9999,(S.shards||0)+1);addXp(Math.round(5*lvlScale()));Ls.push('You leave the prize where it floats.','💠 +1 Rift Shard')}
  else if(c.fight){const f=fight('rift'),e=f.e;Ls.push('⚔ '+e.n+'  HP '+e.hp+' · ATK '+e.atk+' · DEF '+e.def);ok=f.win;
   if(ok){h.hp=Math.max(1,f.hp);Ls.push('Victory in '+f.rounds+' rounds. You lost '+f.dmg+' HP.')}else{h.hp=Math.max(1,Math.floor(h.hp*.5));Ls.push('The beast overwhelms you and the rift throws you out. You lose half your HP.')}}
  else{roll=d20();ok=roll===20||(roll!==1&&roll+mod>=dc);Ls.push('🎲 D20 roll: '+roll+(mod?' (+'+mod+')':'')+' vs DC '+dc+(fit?'  · your class helps':''))}
  if(ok&&id!=='leave'){reward=riftReward(lift,xs,Ls,true);if(reward.fx)R.fx=reward.fx;
   if(wd&&wd.twice){const second=riftReward(lift,0,Ls,!reward.fx);if(second.fx)R.fx=second.fx}
   ev('rift')}
  if(!ok){const d={...RIFT_DEBUFFS[ri(3)],until:now+RIFT_DEBUFF_MS};R.fx=d;Ls.push('The rift snaps shut.','☠ Debuff: '+fxLabel(d)+' for 30 minutes')}
  sqEv('rift');return{rift:{phase:'result',ok,room:rm.name,lines:Ls,shards:S.shards,fx:R.fx||null}}}
 throw E('Unknown rift action.')};


/* ================= STORY QUESTS: the four quest markers are now mini-series ================= */
const SQ_IDS=['lights','door','satchel','traveler'];   // same order as the client's four quest names (the hash picks the same one on both sides)
const SQ={lights:{name:'Investigate the Strange Lights',ms:36e5},door:{name:'The Whispering Door',ms:6e5},satchel:{name:'The Lost Satchel',ms:36e5},traveler:{name:"A Traveler's Request",ms:108e5}};
const OWNERS=['Marla the Baker','Old Tobin','Wren the Courier','Sister Aldith','Brant the Smith','Pip the Lamplighter'];
const TASKS=[{k:'nature',n:5,text:'Gather 5 nature discoveries',xp:70},{k:'chest',n:3,text:'Open 3 treasure chests',xp:80},{k:'rift',n:2,text:'Step into 2 arcane rifts',xp:90},{k:'lair',n:1,text:'Challenge 1 dark lair',xp:100}];
const RIDDLES=[   // first answer is always the correct one; the server shuffles the order and never sends the answer to the client
 ['I speak without a mouth and hear without ears. I have no body, but I come alive with wind.','An echo','A ghost','A bell'],
 ['The more you take, the more you leave behind.','Footsteps','Coins','Memories'],
 ['I have cities but no houses, mountains but no trees, and water but no fish.','A map','A dream','A painting'],
 ['I have keys but open no locks, and space but no room. You can enter, but never go outside.','A keyboard','A treasure chest','A castle gate'],
 ['I am not alive, but I grow. I have no lungs, but I need air. Water is my death.','Fire','Moss','A mushroom'],
 ['What runs but never walks, has a mouth but never talks, and has a bed but never sleeps?','A river','A horse','A dragon'],
 ['The more of me there is, the less you can see.','Darkness','Gold','Time'],
 ['I have hands, but I cannot clap.','A clock','A mountain','A river'],
 ['What gets wetter the more it dries?','A towel','A candle','A stone'],
 ['I can be cracked, made, told, and played.','A joke','A bell','A sword'],
 ['What has a head and a tail, but no body?','A coin','A snake','A crown'],
 ['What breaks the moment you say its name?','Silence','A mirror','A bridge'],
 ['Forward I am heavy, but backward I am not.','The word "ton"','A boulder','An anvil'],
 ['What belongs to you, but others use it more than you do?','Your name','Your sword','Your shadow'],
 ['I fly without wings and cry without eyes. Wherever I go, darkness follows.','A cloud','A raven','A candle'],
 ['What has one eye, but cannot see?','A needle','A lantern','A goblin'],
 ['What can travel around the world while staying in a corner?','A stamp','A shadow','A ship'],
 ['I shave every day, but my beard stays the same. Who am I?','A barber','A wizard','A knight'],
 ['What building has the most stories?','A library','A castle','A smithy'],
 ['What is always in front of you, but can never be seen?','The future','A wall','A road']];
function shuf(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=ri(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function storyLoot(Ls,th){const sub=d20(),r=sub<=th[0]?'uncommon':sub<=th[1]?'rare':'mythic',it=grantItem('chest',r);Ls.push('★ '+fmtI(it))}
function sqFinish(Ls,xp,th){const g=addEnc(xp);Ls.push('Reward: +'+g+' XP');storyLoot(Ls,th);S.sq.active=null;S.sq.n=(S.sq.n||0)+1;ev('quest')}
function sqEv(k){const q=S.sq&&S.sq.active;if(!q||q.id!=='traveler'||q.task.k!==k)return;q.have++;
 if(q.have>=q.task.n){const Ls=[];sqFinish(Ls,q.task.xp,[12,19]);toast("A Traveler's Request complete! "+Ls.join(' · '))}else toast("A Traveler's Request: "+q.have+' / '+q.task.n)}
function sqTick(){const Q=S.sq;if(Q&&Q.active&&Q.active.until<=now){Q.active=null;toast('Your quest ran out of time.')}}
A.quest=a=>{const Q=S.sq,op=String(a.op||''),nm=()=>SQ[Q.active.id].name;
 const riddle=()=>{const q=Q.active,R=RIDDLES[q.rid];return{q:R[0],opts:q.order.map(i=>R[1+i])}};
 if(op==='abandon'){Q.active=null;return{sq:{phase:'none'}}}
 if(op==='resume'){const q=Q.active;if(!q||q.id!=='door')throw E('There is no riddle waiting.');return{sq:{phase:'riddle',id:q.id,name:nm(),riddle:riddle()}}}
 if(op==='start'){
  seen(a.ll);if(Q.active)throw E('Finish or abandon your current quest first.');
  const s=site(a.key,a.exp,a.ll,'quest'),m=/^(-?\d+),(-?\d+),quest,(\d+)\|(-?\d+)$/.exec(s.key),id=SQ_IDS[Math.floor(rnd(m[1]+','+m[2]+',quest,'+m[3]+'n'+m[4])*SQ_IDS.length)];
  const c=(Array.isArray(a.cands)?a.cands:[]).slice(0,24).filter(okLL),inBand=lo=>shuf(c.filter(p=>{const d=dist(p,a.ll);return d>=lo&&d<=520}));
  const spread=(arr,n)=>{const out=[];for(const p of arr){if(out.length>=n)break;if(out.every(q=>dist(p,q)>=LAIR.minGap-1))out.push(p)}return out};
  const act={id,until:now+SQ[id].ms,t0:now};const Ls=[];
  if(id==='lights'){const pts=spread(inBand(180),3+ri(3));if(pts.length<3)throw E('Could not find safe spots nearby for this quest. Try again from a more open area.');
   act.pts=pts.map(ll=>({ll,v:0}));Ls.push('Strange lights flicker at the edge of sight.','Visit all '+pts.length+' lights before they fade. You have 60 minutes.')}
  else if(id==='satchel'){const pts=spread(inBand(180),1);if(!pts.length)throw E('Could not find a safe place for the owner nearby. Try again from a more open area.');
   const who=OWNERS[ri(OWNERS.length)];act.pts=[{ll:pts[0],v:0}];act.who=who;Ls.push('You find a worn satchel. A tag inside reads: "'+who+'".','Carry it to the marked spot and return it. You have 60 minutes.')}
  else if(id==='door'){act.rid=ri(RIDDLES.length);act.order=shuf([0,1,2])}
  else{act.task=TASKS[ri(TASKS.length)];act.have=0;Ls.push('A hooded traveler presses a favor on you:',act.task.text+'.','You have 3 hours.')}
  takeClaim(s.key,s.exp);Q.active=act;
  return id==='door'?{sq:{phase:'riddle',id,name:SQ[id].name,riddle:riddle()}}:{sq:{phase:'start',id,name:SQ[id].name,lines:Ls}}}
 if(op==='visit'){const q=Q.active;if(!q||!q.pts)throw E('There is no quest point to visit.');seen(a.ll);const p=q.pts[a.i|0];if(!p||p.v)throw E('Nothing to find here.');if(dist(p.ll,a.ll)>RANGE+30)throw E('Too far away.');p.v=1;const Ls=[];
  if(q.id==='satchel'){Ls.push('You hand the satchel back to '+q.who+'.',q.who+' presses a reward into your hands.');sqFinish(Ls,60,[12,19]);return{sq:{phase:'done',ok:true,name:SQ.satchel.name,lines:Ls}}}
  const left=q.pts.filter(x=>!x.v).length;
  if(left)return{sq:{phase:'progress',name:SQ.lights.name,lines:['A light flares, then fades.',left+' more '+(left>1?'lights remain.':'light remains.')]}};
  Ls.push('The last light flares and the lights gather into one bright shape, then settle at your feet.');sqFinish(Ls,30+20*q.pts.length,[8,18]);return{sq:{phase:'done',ok:true,name:SQ.lights.name,lines:Ls}}}
 if(op==='answer'){const q=Q.active;if(!q||q.id!=='door')throw E('There is no riddle to answer.');const pick=+a.pick;if(!(pick>=0&&pick<3))throw E('Pick an answer.');const R=RIDDLES[q.rid],ok=q.order[pick]===0,Ls=[];
  if(ok){Ls.push('"Correct." The door swings wide.');sqFinish(Ls,50,[12,19])}
  else{Ls.push('"Wrong." The door cracks open only a little. The answer was: '+R[1]+'.');const g=addEnc(10);Ls.push('Reward: +'+g+' XP',givePot('h35',1)?'+1 Small HP Potion':'Your potion bag is already full.');Q.active=null;Q.n=(Q.n||0)+1;ev('quest')}
  return{sq:{phase:'done',ok,name:SQ.door.name,lines:Ls}}}
 throw E('Unknown quest action.')};
A.equip=a=>{const h=H(),ix=h.inv.findIndex(x=>x.uid===a.uid);if(ix<0)throw E('Item not found.');const it=h.inv[ix],sl=TYPE_SLOT[CAT[it.cid].type],s=sl.find(k=>!h.eq[k])||sl[0],old=h.eq[s];h.inv.splice(ix,1);h.eq[s]=it;if(old)h.inv.push(old);return{}};
A.unequip=a=>{const h=H();if(!SLOTS.includes(a.slot)||!h.eq[a.slot])throw E('Nothing equipped there.');h.inv.push(h.eq[a.slot]);h.eq[a.slot]=null;return{}};
A.usepot=a=>{const h=H(),i=a.k,mx=stats().hp;if(!POTS[i]||!potN(i))throw E('You have none of those.');
 if(i==='res'){if(!h.downed)throw E('Resurrect Potions only work when you are downed.');takePot('res');revive()}
 else{if(h.downed)throw E('You are downed. Rest, gather nature, or use a Resurrect Potion.');if(h.hp>=mx)throw E('Already at full health.');takePot(i);heal(POTS[i].heal+clsMod().heal/100)}return{}};
A.profile=async a=>{if(S.onboarded)throw E('Your profile is already set.');const name=cleanName(a.name);if(!S.cls&&!CLASSES[a.cls])throw E('Choose a class.');if(!LOOKS.includes(a.look))throw E('Choose a look.');
 await deps.claimName(name);S.name=name;if(!S.cls)S.cls=a.cls;S.look=a.look;S.onboarded=true;clampHp();return{}};   // an existing class is never changed here
A.setclass=a=>{if(!CLASSES[a.cls])throw E('Unknown class.');S.cls=a.cls;return{}};
A.lairs=a=>{const w=lairWin();if(!w||now>=w.end)throw E('No lair window is open.');seen(a.ll);if(S.lairs&&S.lairs.end===w.end)return{};
 const ok=[];for(const p of(Array.isArray(a.list)?a.list:[]).slice(0,LAIR.max)){if(!okLL(p))continue;const d=dist(p,a.ll);if(d<LAIR.rMin-25||d>LAIR.rMax+25)continue;if(ok.some(q=>dist(p,q)<LAIR.minGap-1))continue;ok.push(p)}
 S.lairs={id:w.id,end:w.end,list:ok};return{}};
const mkQ=(q,t)=>({id:q.id,kind:q.kind,goal:q.goal*SCALE[t],p:0,xp:q.xp,done:false,title:q.title(q.goal*SCALE[t])});
function fixTiers(){for(const t of TIERS){const T=S[t];if(!T||!Array.isArray(T.q))continue;const used=new Set(T.q.map(x=>x.id));   // swap paused quest types (photos) that are not finished for active ones
 T.q=T.q.map(q=>{if(q.done||POOL.some(p=>p.id===q.id))return q;const o=POOL.find(p=>!used.has(p.id));if(!o)return null;used.add(o.id);return mkQ(o,t)}).filter(Boolean)}}
function importState(st){const n=(v,lo,hi,d)=>{v=Math.floor(+v);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d};
 S.lvl=n(st.lvl,1,100,1);S.need=needFor(S.lvl);S.xp=S.lvl>=100?0:n(st.xp,0,S.need-1,0);if(CLASSES[st.cls])S.cls=st.cls;
 const sh=st.hero||{},h=S.hero,used=new Set();
 const take=it=>{if(!it||typeof it.uid!=='string'||!CAT[it.cid])return null;const uid=it.uid.slice(0,32);if(used.has(uid))return null;used.add(uid);const o={uid,cid:it.cid},x=it.extra;
  if(x&&['atk','def','hp'].includes(x.stat)){const c=Math.round(BUDGET[CAT[it.cid].rarity]*EXTRA_PCT)*(x.stat==='hp'?3:1);o.extra={stat:x.stat,val:Math.max(0,Math.min(c,Math.floor(+x.val)||0))}}return o};
 for(const s of SLOTS){const o=take(sh.eq&&sh.eq[s]);if(!o)continue;if(TYPE_SLOT[CAT[o.cid].type].includes(s))h.eq[s]=o;else h.inv.push(o)}
 (Array.isArray(sh.inv)?sh.inv:[]).slice(0,500).forEach(it=>{const o=take(it);if(o)h.inv.push(o)});
 for(const k of Object.keys(POTS)){h.pot[k]=n(sh.pot&&sh.pot[k],0,POT_CAP,0);h.buy[k]=n(sh.buy&&sh.buy[k],0,1000,0)}
 h.hp=Number.isFinite(+sh.hp)?+sh.hp:100;h.downed=!!sh.downed;h.t=now;
 const k=st.k;if(k&&k.daily&&k.weekly&&k.monthly){S.k={daily:String(k.daily),weekly:String(k.weekly),monthly:String(k.monthly)};
  for(const t of TIERS){const T=st[t];if(!T||!Array.isArray(T.q))continue;
   const q=T.q.map(x=>{const o=POOL.find(p=>p.id===(x&&x.id));if(!o)return null;const g=o.goal*SCALE[t];return{id:o.id,kind:o.kind,goal:g,p:Math.max(0,Math.min(g,+x.p||0)),xp:o.xp,done:!!x.done,ready:!!x.ready&&!x.done,title:o.title(g)}}).filter(Boolean).slice(0,7);
   if(q.length===7){const m=T.ms||{};S[t]={q,ms:{p:n(m.p,0,5,0),done:!!m.done,ready:!!m.ready&&!m.done,xp:MSXP}}}}
  const cl={};if(st.claimed&&typeof st.claimed==='object')Object.keys(st.claimed).slice(0,500).forEach(c=>{if(/^(daily|weekly|monthly)\|[\d-]+\|[\w:.-]+$/.test(c))cl[c]=1});S.claimed=cl}
 const cc={};if(st.loot&&st.loot.claimed&&typeof st.loot.claimed==='object')Object.keys(st.loot.claimed).slice(0,2000).forEach(c=>{const v=+st.loot.claimed[c];if(Number.isFinite(v))cc[String(c).slice(0,120)]=v});S.loot.claimed=cc;
 if(st.chaos)S.chaos.last=Math.min(now,Math.max(0,+st.chaos.last||0))}
function fresh(st){Object.assign(S,{xpv:2,xp:0,need:50,lvl:1,cls:null,hero:{hp:100,eq:{},inv:[],pot:{h35:0,full:0,res:0},buy:{h35:0,full:0,res:0}},loot:{claimed:{}},chaos:{last:0,fx:null},rift:{fx:null,run:null},shards:0,sq:{active:null,n:0},enc:null,name:null,look:null,onboarded:false,
  k:{daily:'',weekly:'',monthly:''},daily:mkTier('daily'),weekly:mkTier('weekly'),monthly:mkTier('monthly'),rnd:{n:0,done:[]},claimed:{},lairs:null,pos:null,tz:'UTC'});
 if(st&&typeof st==='object')try{importState(st)}catch(e){}clampHp()}
return{fixTiers,sqTick,S,msgs,A,fresh,GRID,rnd,dist,LAIR,RANGE,ENEMY,rollover,recover,clampHp,tzOk,keysTz,stats,potN,H,CLASSES,CAT,SLOTS,TYPE_SLOT,POOL,mkTier,needFor,POT_CAP,BUDGET,EXTRA_PCT,RAR,MIMIC,POTS,SCALE}}

// ---------------------------------------------------------------- request handling
async function handle(core,body,deps,now){
 const S=core?JSON.parse(JSON.stringify(core)):{},eng=makeEngine(S,now,deps),a=body||{},action=String(a.action||'');
 if(!core)eng.fresh(a.importState);
 if(!S.rift)S.rift={fx:null,run:null};if(!S.sq)S.sq={active:null,n:0};if(!Number.isFinite(S.shards))S.shards=0;
 if(typeof a.tz==='string'&&a.tz.length<64&&eng.tzOk(a.tz))S.tz=a.tz;else if(!S.tz)S.tz='UTC';
 const rl=S.rl&&now-S.rl.t<6e4?S.rl:(S.rl={t:now,n:0});if(++rl.n>180)throw E('Too many actions. Slow down.');
 if(!Object.prototype.hasOwnProperty.call(eng.A,action))throw E('Unknown action.');
 eng.rollover();eng.fixTiers();eng.sqTick();if(action==='fight'&&S.fight)S.hero.t=now;else eng.recover();eng.clampHp();   // no regeneration mid-fight (same as the game's own rule)
 const result=await eng.A[action](a);eng.clampHp();
 const pub={};CORE_KEYS.forEach(k=>pub[k]=S[k]);pub.hero=S.hero;pub.sq=S.sq?{n:S.sq.n,active:S.sq.active?{...S.sq.active,rid:undefined,order:undefined}:null}:null;   // the riddle answer order never leaves the server
 return{core:S,pub,result:result||{},msgs:eng.msgs}}
// ---------------------------------------------------------------- Supabase glue (runs only inside Supabase)
async function main(){
 const{createClient}=await import('npm:@supabase/supabase-js@2');
 const admin=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
 const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
 const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...CORS,'Content-Type':'application/json'}});
 Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  try{
   const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
   const{data:{user},error:ue}=await admin.auth.getUser(jwt);if(ue||!user)return json({error:'Please sign in again.'},401);
   const uid=user.id;let body;try{body=await req.json()}catch(e){return json({error:'Bad request.'},400)}
   if(body.action==='save'){const st=body.state&&typeof body.state==='object'?{...body.state}:{};CORE_KEYS.concat(['fight']).forEach(k=>delete st[k]);
    if(JSON.stringify(st).length>2e5)return json({error:'Save too large.'});
    const{error}=await admin.from('players').upsert({id:uid,state:st},{onConflict:'id'});if(error)throw error;return json({ok:true})}
   const jpegP=import('npm:jpeg-js@0.4.4');
   const deps={uid,
    analyze:async p=>{const{data,error}=await admin.storage.from('quest-photos').download(p);if(error||!data)return null;const buf=new Uint8Array(await data.arrayBuffer());if(buf.length>6e6)return null;
     try{const mod=await jpegP,jpeg=mod.default||mod,img=jpeg.decode(buf,{useTArray:true,maxMemoryUsageInMB:96});return analyzeImg(img)}catch(e){console.error('decode',e);return null}},
    removePhoto:async p=>{await admin.storage.from('quest-photos').remove([p])},
    ownHashes:async()=>{const{data}=await admin.from('photo_submissions').select('phash').eq('player_id',uid).not('phash','is',null).neq('status','rejected').order('id',{ascending:false}).limit(300);return(data||[]).map(r=>r.phash)},
    hashSeen:async h=>{const{data}=await admin.from('photo_submissions').select('id').eq('phash',h).neq('status','rejected').limit(1);return!!(data&&data.length)},
    claimName:async n=>{const{error}=await admin.from('players').upsert({id:uid,display_name:n},{onConflict:'id'});if(error){if(error.code==='23505')throw E('That name is taken. Try another.');throw error}},
    logPhoto:async r=>{const{error}=await admin.from('photo_submissions').insert({player_id:uid,...r});if(error)console.error('logPhoto',error.message)}};
   for(let attempt=0;attempt<5;attempt++){
    const{data:row,error:le}=await admin.from('player_core').select('core,version').eq('id',uid).maybeSingle();if(le)throw le;
    let st=null;if(!row){const{data:p}=await admin.from('players').select('state').eq('id',uid).maybeSingle();st=p&&p.state}
    const r=await handle(row&&row.core,{...body,importState:st},deps,Date.now());
    if(!row){const{error}=await admin.from('player_core').insert({id:uid,core:r.core,version:1});if(error){if(error.code==='23505')continue;throw error}}
    else{const{data:up,error}=await admin.from('player_core').update({core:r.core,version:row.version+1,updated_at:new Date().toISOString()}).eq('id',uid).eq('version',row.version).select('version');if(error)throw error;if(!up||!up.length)continue}
    if(!row||row.core.lvl!==r.core.lvl||row.core.xp!==r.core.xp){const L=r.core.lvl,xp=Math.floor(r.core.xp);await admin.from('players').upsert({id:uid,lvl:L,xp,total_xp:50*(L-1)+5*(L-1)*(L-2)+xp},{onConflict:'id'})}
    return json({ok:true,core:r.pub,result:r.result,msgs:r.msgs})}
   return json({error:'Busy. Try again.'},409)
  }catch(e){if(e&&e.user)return json({error:e.message});console.error(e);return json({error:'Server error.'},500)}})}
if(typeof Deno!=='undefined')main();
if(typeof module!=='undefined')module.exports={handle,makeEngine,CORE_KEYS,analyzeImg,judgePhoto,ham,PHOTO,cleanName,LOOKS};
