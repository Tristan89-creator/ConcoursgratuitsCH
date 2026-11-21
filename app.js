'use strict';
const KEY='concoursch-v1', VAULT='concoursch-profile-vault-v12';let db;let discoveries=[];let unlockedProfile=null;let vaultPassword=null;let legacyProfile=null;let pendingReturnCheck=false;let lastOpenedId=null;
try{db=JSON.parse(localStorage.getItem(KEY))||{profile:{},contests:[]}}catch{db={profile:{},contests:[]}};
if(!db||typeof db!=='object'||!Array.isArray(db.contests)||typeof db.profile!=='object')db={profile:{},contests:[]};
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{db.profile={};localStorage.setItem(KEY,JSON.stringify(db))}catch{toast('Stockage indisponible : données non enregistrées')}}
function toast(s){let e=$('#toast');e.textContent=s;e.style.display='block';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>e.style.display='none',3000)}
function tab(t){document.querySelectorAll('main>section').forEach(e=>e.classList.toggle('hidden',e.id!==t));document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===t));window.scrollTo(0,0);render()}
document.addEventListener('click',e=>{let b=e.target.closest('[data-tab]');if(b)tab(b.dataset.tab)});
function validUrl(s){try{let u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}}
function statusText(c){return c.status==='done'?'Participé':c.status==='review'?'À confirmer':c.status==='manual'?'Action manuelle':'À participer'}
function newId(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2)}
// Les données locales restent sur l'appareil. Les évaluations sont des indices, pas des garanties.
const PREFKEY='concoursch-preferences-v17';
let prefs;try{prefs=JSON.parse(localStorage.getItem(PREFKEY))||{}}catch{prefs={}}
function savePrefs(){localStorage.setItem(PREFKEY,JSON.stringify(prefs))}
function isoToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function isExpired(c){return !!(c.end&&/^\d{4}-\d{2}-\d{2}$/.test(c.end)&&c.end<isoToday())}
function isDailyDue(c){return !!(c.daily&&c.status==='done'&&c.completed&&new Date(c.completed).toLocaleDateString('sv-SE')!==isoToday())}
function candidateHints(x){
 const t=(x.name||'').toLowerCase();
 const flags=[];
 if(/\b(suisse|schweiz|svizzera|switzerland|ch)\b/i.test(t))flags.push('Suisse mentionnée');
 if(/gratuit|gratis|kostenlos|gratuito/i.test(t))flags.push('Gratuité mentionnée');
 if(/\b(gagnez|gagner|gewinnspiel|verlosung|concorso|vinci|wettbewerb)\b/i.test(t))flags.push('Concours mentionné');
 return flags;
}
function scoreCandidate(x){let n=candidateHints(x).length*2;const cat=categoryFor(x);if(prefs.favorite&&prefs.favorite===cat)n+=5;if(prefs.language&&prefs.language===x.language)n+=2;return n}
function findOrCreateDiscovery(x){
 const url=validUrl(x.url);if(!url)return null;
 let c=db.contests.find(c=>validUrl(c.url)===url);
 if(!c){c={id:newId(),name:String(x.name||'Concours').slice(0,120),url,end:'',notes:'Découverte automatique non vérifiée · '+String(x.source||'').slice(0,200),status:'pending',created:new Date().toISOString()};db.contests.unshift(c)}
 return c;
}
function openForReview(c){
 if(!c||c.status==='done')return;
 c.status='review';c.lastOpened=new Date().toISOString();delete c.reviewPrompted;
 lastOpenedId=c.id;pendingReturnCheck=true;save();render();renderDiscoveries();
}
function confirmReview(id,participated){
 const c=db.contests.find(c=>c.id===id);if(!c)return;
 c.status=participated?'done':'pending';if(participated){c.completed=new Date().toISOString();c.entries=Array.isArray(c.entries)?c.entries:[];c.entries.push(c.completed)}
 delete c.reviewPrompted;save();render();renderDiscoveries();showReview();
}
function showReview(){
 const panel=$('#review-panel');if(!panel)return;
 const c=db.contests.find(c=>c.status==='review'&&!c.reviewPrompted);
 if(!c){panel.classList.add('hidden');return}
 c.reviewPrompted=true; // only suppress repeated prompts in the current running page; status remains review
 panel.classList.remove('hidden');tab('home');$('#review-name').textContent=c.name;
 panel.dataset.id=c.id;
}
function checkReturn(){
 if(!pendingReturnCheck)return;
 pendingReturnCheck=false;showReview();
}
window.addEventListener('focus',checkReturn);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkReturn()});
$('#review-yes').addEventListener('click',()=>confirmReview($('#review-panel').dataset.id,true));
$('#review-no').addEventListener('click',()=>confirmReview($('#review-panel').dataset.id,false));
function item(c){
 let url=validUrl(c.url),status=statusText(c),due=isDailyDue(c),expired=isExpired(c);
 const badges=[expired?'⏳ Date dépassée (selon date enregistrée)':'',c.daily?'🔁 Participation quotidienne (déclarée)':'',due?'🟢 À refaire aujourd’hui':'',c.checked?'✓ Conditions vérifiées par toi':'⚠️ Conditions non vérifiées',c.won?'🏆 Gain enregistré':''].filter(Boolean).join(' · ');
 return `<article class="contest"><div class="row"><h3>${esc(c.name)}</h3><span class="pill">${esc(status)}</span></div><p class="muted">${c.end?'Fin : '+esc(c.end)+' · ':''}${esc(c.notes||'')}</p><p class="muted">${esc(badges)}</p><div class="actions">${url?`<button class="btn" type="button" data-fast-id="${esc(c.id)}">⚡ Mode rapide</button><a class="btn secondary" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-open-id="${esc(c.id)}">Ouvrir ↗</a>`:''}${(c.status!=='done'||due)?`<button class="btn" data-status="done" data-id="${esc(c.id)}">${due?'J’ai rejoué':'J’ai participé'}</button>`:''}<button class="btn ghost" data-daily="${esc(c.id)}">${c.daily?'Désactiver quotidien':'🔁 Quotidien'}</button><button class="btn ghost" data-checked="${esc(c.id)}">${c.checked?'Annuler vérification':'✓ Conditions vérifiées'}</button><button class="btn ghost" data-win="${esc(c.id)}">${c.won?'Modifier le gain':'🏆 J’ai gagné'}</button>${c.status!=='manual'?`<button class="btn ghost" data-status="manual" data-id="${esc(c.id)}">Action manuelle</button>`:''}${c.status!=='pending'?`<button class="btn ghost" data-status="pending" data-id="${esc(c.id)}">À faire</button>`:''}<button class="btn danger" data-delete="${esc(c.id)}">Supprimer</button></div></article>`
}
function render(){let all=db.contests,done=all.filter(x=>x.status==='done'),pending=all.filter(x=>x.status==='pending'),manual=all.filter(x=>x.status==='manual'),review=all.filter(x=>x.status==='review');$('#count-all').textContent=all.length;$('#count-done').textContent=done.length;$('#count-pending').textContent=pending.length;$('#count-manual').textContent=manual.length;$('#count-review').textContent=review.length;$('#home-list').innerHTML=[...review,...pending,...manual].slice(0,5).map(item).join('')||'<div class="empty">Aucun concours en attente.</div>';let f=$('#filter').value;$('#contest-list').innerHTML=all.filter(x=>f==='all'||x.status===f).map(item).join('')||'<div class="empty">Aucun concours dans cette catégorie.</div>';$('#history-list').innerHTML=done.map(item).join('')||'<div class="empty">Aucune participation confirmée.</div>';renderStats(done);renderInsights();renderQuickCopy();$('#copy-fields').innerHTML=Object.entries({first:'Prénom',last:'Nom',email:'E-mail',phone:'Téléphone',street:'Adresse',zip:'Code postal',city:'Localité',canton:'Canton'}).filter(([k])=>unlockedProfile&&unlockedProfile[k]).map(([k,v])=>`<button class="btn secondary" data-copy="${k}">Copier ${esc(v)}</button>`).join('')||'<p class="muted">Enregistre ton profil pour afficher les boutons de copie.</p>'}
// Statistiques basées sur les dates réelles de confirmation, sans inventer de dates anciennes.
function localDay(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function renderStats(done){
 const now=new Date(), today=localDay(now), monday=new Date(today);monday.setDate(today.getDate()-(today.getDay()+6)%7);
 const monthStart=new Date(now.getFullYear(),now.getMonth(),1), nextMonth=new Date(now.getFullYear(),now.getMonth()+1,1);
 const dated=done.map(c=>({c,d:new Date(c.completed)})).filter(x=>x.c.completed&&!Number.isNaN(x.d.getTime()));
 $('#stats-week').textContent=dated.filter(x=>x.d>=monday&&x.d<=now).length;
 $('#stats-month').textContent=dated.filter(x=>x.d>=monthStart&&x.d<nextMonth).length;
 $('#stats-total').textContent=done.length;
 $('#stats-unknown').textContent=done.length-dated.length;
 const months=new Map();for(const {d} of dated){const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;months.set(k,(months.get(k)||0)+1)}
 $('#stats-monthly').innerHTML='<h3>Par mois</h3>'+(months.size?[...months].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12).map(([m,n])=>`<p class="row"><span>${esc(m)}</span><strong>${n}</strong></p>`).join(''):'<p class="muted">Aucune participation datée pour le moment.</p>');
}
function renderQuickCopy(){
 const el=$('#quick-copy');if(!el)return;
 if(!unlockedProfile){el.innerHTML='<span class="pill">🔒 Profil verrouillé</span>';return}
 const fields=[['first','Prénom'],['last','Nom'],['email','E-mail'],['phone','Téléphone'],['street','Rue'],['zip','NPA'],['city','Ville']];
 el.innerHTML='<button class="btn secondary" id="quick-name" type="button">Copier nom complet</button>'+fields.filter(([k])=>unlockedProfile[k]).map(([k,label])=>`<button class="btn secondary" data-copy="${k}" type="button">Copier ${label}</button>`).join('');
}
document.addEventListener('click',e=>{if(e.target.closest('#quick-name'))copyProfileText([unlockedProfile?.first,unlockedProfile?.last].filter(Boolean).join(' '))});
// Dashboard counters are navigational buttons. Keep all data local.
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-dashboard-filter]');
 if(!button)return;
 const filter=button.dataset.dashboardFilter;
 if(!['review','all','done','pending','manual'].includes(filter))return;
 if(filter==='done'){
  tab('history');
 }else{
  $('#filter').value=filter;
  tab('search');
  // Move the filtered personal contest list into view (below discoveries).
  $('#contest-list').closest('.panel').scrollIntoView({block:'start',behavior:'auto'});
 }
});
$('#filter').addEventListener('change',render);
$('#add-form').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target),url=validUrl(f.get('url'));if(!url){toast('Utilise une adresse http ou https valide');return}db.contests.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:String(f.get('name')).trim(),url,end:String(f.get('end')||''),notes:String(f.get('notes')||''),status:'pending',created:new Date().toISOString()});save();e.target.reset();render();toast('Concours enregistré')});
document.addEventListener('click',async e=>{let b=e.target.closest('[data-status],[data-delete],[data-copy]');if(!b)return;if(b.hasAttribute('data-daily')){const c=db.contests.find(x=>x.id===b.dataset.daily);if(c){c.daily=!c.daily;save();render()}}else if(b.hasAttribute('data-checked')){const c=db.contests.find(x=>x.id===b.dataset.checked);if(c){c.checked=!c.checked;save();render()}}else if(b.hasAttribute('data-win')){const c=db.contests.find(x=>x.id===b.dataset.win);if(c){const lot=prompt('Lot gagné (laisser vide pour annuler le gain)',c.won?.lot||'');if(lot!==null){if(lot.trim()){const amount=prompt('Valeur estimée en CHF (facultatif)',String(c.won?.value||''));const v=Number(String(amount||'').replace(',','.'));c.won={lot:lot.trim().slice(0,150),value:Number.isFinite(v)&&v>=0?Math.min(v,1e8):0,date:c.won?.date||new Date().toISOString()}}else delete c.won;save();render()}}}else if(b.dataset.status){let c=db.contests.find(x=>x.id===b.dataset.id);if(c){c.status=b.dataset.status;if(c.status==='done'){c.completed=new Date().toISOString();c.entries=Array.isArray(c.entries)?c.entries:[];c.entries.push(c.completed)}delete c.reviewPrompted;save();render();renderDiscoveries();showReview()}}else if(b.dataset.delete){if(confirm('Supprimer ce concours ?')){db.contests=db.contests.filter(x=>x.id!==b.dataset.delete);save();render();renderDiscoveries();showReview()}}else if(b.dataset.copy){let value=unlockedProfile?.[b.dataset.copy];if(!value)return;try{await navigator.clipboard.writeText(value);toast('Copié !')}catch{toast('Copie indisponible dans ce navigateur')}}});
const profileKeys=['first','last','email','phone','street','zip','city','canton'];
const encoder=new TextEncoder(),decoder=new TextDecoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function vault(){try{return JSON.parse(localStorage.getItem(VAULT))}catch{return null}}
function profileData(){return Object.fromEntries(profileKeys.map(k=>[k,unlockedProfile?.[k]||'']))}
async function keyFor(password,salt){const base=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function encryptProfile(profile,password){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await keyFor(password,salt);const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(profile)));return {version:1,kdf:'PBKDF2-SHA256',iterations:310000,algorithm:'AES-256-GCM',salt:b64(salt),iv:b64(iv),ciphertext:b64(cipher)}}
async function decryptProfile(record,password){if(!record||record.version!==1||record.algorithm!=='AES-256-GCM'||record.iterations!==310000)throw Error('Format du coffre non reconnu');const key=await keyFor(password,unb64(record.salt));return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(record.iv)},key,unb64(record.ciphertext))))}
function fillProfile(){profileKeys.forEach(k=>{$(`#profile-form [name="${k}"]`).value=unlockedProfile?.[k]||''})}
function lockProfile(){unlockedProfile=null;vaultPassword=null;fillProfile();render();updateVaultUI();toast('Profil verrouillé')}
function updateVaultUI(){const open=!!unlockedProfile,existing=!!vault();$('#profile-form').classList.toggle('hidden',!open);$('#copy-panel').classList.toggle('hidden',!open);$('#vault-locked').classList.toggle('hidden',open);$('#vault-unlock').classList.toggle('hidden',!existing);$('#vault-create').classList.toggle('hidden',existing);$('#vault-legacy').classList.toggle('hidden',!legacyProfile);$('#vault-state').textContent=open?'🔓 Profil déverrouillé (en mémoire temporaire)':existing?'🔒 Profil chiffré et verrouillé':'🔒 Aucun profil chiffré';}
async function storeVault(profile,password){const record=await encryptProfile(profile,password);localStorage.setItem(VAULT,JSON.stringify(record));unlockedProfile=profile;vaultPassword=password;db.profile={};save();legacyProfile=null;fillProfile();updateVaultUI();render()}
// Migration: never erase the original unencrypted profile until encrypted storage succeeds.
if(db.profile&&Object.values(db.profile).some(Boolean))legacyProfile={...db.profile};
$('#vault-create-form').addEventListener('submit',async e=>{e.preventDefault();const pass=$('#vault-new-password').value,confirmPass=$('#vault-confirm-password').value;if(pass.length<12){toast('Utilise au moins 12 caractères');return}if(pass!==confirmPass){toast('Les mots de passe sont différents');return}try{await storeVault(legacyProfile||{},pass);$('#vault-new-password').value='';$('#vault-confirm-password').value='';toast('Profil chiffré et enregistré')}catch(err){toast('Erreur de chiffrement : '+err.message)}});
$('#vault-unlock-form').addEventListener('submit',async e=>{e.preventDefault();const pass=$('#vault-password').value;try{unlockedProfile=await decryptProfile(vault(),pass);vaultPassword=pass;$('#vault-password').value='';fillProfile();updateVaultUI();render();toast('Profil déverrouillé')}catch{toast('Mot de passe incorrect ou coffre endommagé')}});
$('#profile-form').addEventListener('submit',async e=>{e.preventDefault();if(!unlockedProfile||!vaultPassword)return;const f=new FormData(e.target);const next=Object.fromEntries(profileKeys.map(k=>[k,String(f.get(k)||'').trim().slice(0,300)]));try{await storeVault(next,vaultPassword);toast('Profil chiffré et enregistré')}catch{toast('Impossible d’enregistrer le profil')}});
$('#lock-profile').addEventListener('click',lockProfile);
$('#clear-profile').addEventListener('click',()=>{if(!confirm('Supprimer définitivement le profil chiffré et les éventuelles anciennes données en clair ?'))return;localStorage.removeItem(VAULT);unlockedProfile=null;vaultPassword=null;legacyProfile=null;db.profile={};save();fillProfile();render();updateVaultUI();toast('Profil supprimé')});
$('#export').addEventListener('click',()=>{const backup={format:'ConcoursgratuitsCH-v1.2',contests:db.contests,encryptedProfile:vault(),preferences:prefs};let blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='concoursch-sauvegarde-chiffree.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Sauvegarde exportée : garde ton mot de passe')});
$('#import').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1e6)throw Error('Fichier trop volumineux');let v=JSON.parse(await file.text());if(!v||!Array.isArray(v.contests)||v.contests.length>5000)throw Error('Format invalide');if(v.profile&&Object.values(v.profile).some(Boolean))throw Error('Ancienne sauvegarde non chiffrée refusée : utilise la migration du profil dans la version précédente');if(v.encryptedProfile&&(!v.encryptedProfile.ciphertext||v.encryptedProfile.version!==1))throw Error('Coffre invalide');const contests=v.contests.map(c=>({id:String(c.id||crypto.randomUUID()),name:String(c.name||'Sans titre').slice(0,120),url:validUrl(c.url)||'',end:String(c.end||'').slice(0,30),notes:String(c.notes||'').slice(0,500),status:['pending','manual','done','review'].includes(c.status)?c.status:'pending',lastOpened:String(c.lastOpened||'').slice(0,40),completed:String(c.completed||'').slice(0,40),created:String(c.created||'').slice(0,40),daily:!!c.daily,checked:!!c.checked,entries:Array.isArray(c.entries)?c.entries.filter(x=>typeof x==='string').slice(-1000):[],won:c.won&&typeof c.won.lot==='string'?{lot:c.won.lot.slice(0,150),value:Number(c.won.value)||0,date:String(c.won.date||'').slice(0,40)}:null}));if(!confirm('Remplacer les concours et le coffre chiffré actuels par cette sauvegarde ?'))return;db={profile:{},contests};save();if(v.preferences&&typeof v.preferences==='object'&&!Array.isArray(v.preferences)){prefs={favorite:String(v.preferences.favorite||''),language:String(v.preferences.language||'')};savePrefs()}if(v.encryptedProfile)localStorage.setItem(VAULT,JSON.stringify(v.encryptedProfile));else localStorage.removeItem(VAULT);unlockedProfile=null;vaultPassword=null;legacyProfile=null;fillProfile();render();updateVaultUI();toast('Sauvegarde importée')}catch(err){toast('Import impossible : '+err.message)}e.target.value=''});
updateVaultUI();render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});render();

// Public, static discovery catalog. No personal data is sent to the discovery source.
function categoryFor(x){
 const title=(x.name||'').toLocaleLowerCase();
 if(/voyage|vacance|séjour|hotel|hôtel|reise|ferien|flug|vols?|trip|urlaub|viaggio/.test(title))return 'voyage';
 if(/bon d.achat|gutschein|cadeau|argent|cash|francs|chf|voucher|geschenkkarte/.test(title))return 'argent';
 if(/iphone|smartphone|ordinateur|laptop|tv|télévision|tablet|console|playstation|elektronik/.test(title))return 'tech';
 if(/chocolat|repas|restaurant|food|cuisine|essen|aliment|dîner|dinner/.test(title))return 'food';
 if(/concert|ticket|billet|festival|cinéma|cinema|spectacle|match|event|événement/.test(title))return 'events';
 return 'other';
}
function renderDiscoveries(){
 const q=($('#discovery-query').value||'').toLocaleLowerCase().trim(),lang=$('#discovery-lang').value,cat=$('#discovery-category').value,age=$('#discovery-age').value;
 const matches=discoveries.filter(x=>{
  if(lang!=='all'&&x.language!==lang)return false;
  if(cat!=='all'&&categoryFor(x)!==cat)return false;
  if(q&&!((x.name||'')+' '+(x.source||'')).toLocaleLowerCase().includes(q))return false;
  if(age!=='all'){const date=Date.parse((x.published||'')+'T00:00:00Z');if(!Number.isFinite(date)||Date.now()-date>Number(age)*86400000)return false;}
  return true;
 });
 matches.sort((a,b)=>scoreCandidate(b)-scoreCandidate(a)||String(b.published||'').localeCompare(String(a.published||'')));
 $('#discovery-count').textContent=matches.length+' résultat(s) sur '+discoveries.length+' liens candidats — gratuité et éligibilité non vérifiées';
 $('#discovery-list').innerHTML=matches.length?matches.slice(0,100).map(x=>{
 const url=validUrl(x.url);if(!url)return '';
 const existing=db.contests.find(c=>validUrl(c.url)===url);const saved=!!existing;const hints=candidateHints(x);
 return `<article class="contest"><h3>${esc(x.name)}</h3><p class="muted">${esc(x.source||'Source non précisée')} · ${esc((x.language||'?').toUpperCase())} · ${esc(x.published||'Date inconnue')} · ${esc(categoryFor(x))}<br>Indices dans le titre : ${esc(hints.join(' · ')||'aucun')}<br><strong>⚠️ Non vérifié : gratuité, éligibilité et date limite à contrôler</strong></p><div class="actions"><button class="btn" type="button" data-fast-discovery="${esc(x.id)}">⚡ Mode rapide</button><a class="btn secondary" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-open-discovery="${esc(x.id)}">Consulter ↗</a><button class="btn" data-discover="${esc(x.id)}" ${saved?'disabled':''}>${saved?'Déjà enregistré':'+ Ajouter à mes concours'}</button>${existing?`<span class="pill">${esc(statusText(existing))}</span>`:''}</div></article>`;
 }).join(''):'<div class="empty">Aucun résultat avec ces filtres. Essaie « Toutes les dates » et « Toutes les catégories ».</div>';
}
async function loadDiscoveries(){
 $('#discovery-date').textContent='Chargement…';
 try{
  const r=await fetch('./discoveries.json?t='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw Error('Catalogue indisponible');
  const data=await r.json();if(!Array.isArray(data.items))throw Error('Format invalide');
  discoveries=data.items.filter(x=>x&&typeof x.name==='string'&&validUrl(x.url)).slice(0,200);
  $('#discovery-date').textContent=data.updated?'Mis à jour : '+new Date(data.updated).toLocaleString('fr-CH'):'Collecte pas encore exécutée';
 }catch(err){discoveries=[];$('#discovery-date').textContent='Impossible de charger le catalogue';toast(err.message)}
 renderDiscoveries();
}
$('#refresh-discoveries').addEventListener('click',loadDiscoveries);
$('#discovery-query').addEventListener('input',renderDiscoveries);
$('#discovery-lang').addEventListener('change',renderDiscoveries);
$('#discovery-category').addEventListener('change',renderDiscoveries);
$('#discovery-age').addEventListener('change',renderDiscoveries);
$('#favorite-category').value=prefs.favorite||'all';$('#favorite-language').value=prefs.language||'all';
$('#favorite-category').addEventListener('change',e=>{prefs.favorite=e.target.value;savePrefs();renderDiscoveries()});
$('#favorite-language').addEventListener('change',e=>{prefs.language=e.target.value;savePrefs();renderDiscoveries()});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-discover]');if(!b)return;
 const x=discoveries.find(x=>x.id===b.dataset.discover);if(!x)return;
 const url=validUrl(x.url);if(!url||db.contests.some(c=>c.url===url)){toast('Déjà enregistré');return}
 findOrCreateDiscovery(x);
 save();render();renderDiscoveries();toast('Ajouté à mes concours');
});
loadDiscoveries();

// Assisted copy only. Never send private profile data to external sites automatically.
async function copyProfileText(value){if(!unlockedProfile){toast('Déverrouille ton profil');return}if(!value.trim()){toast('Information manquante');return}try{await navigator.clipboard.writeText(value);toast('Copié — colle dans le formulaire officiel')}catch{toast('Copie impossible sur cet appareil')}}
$('#copy-fullname').addEventListener('click',()=>copyProfileText([unlockedProfile?.first,unlockedProfile?.last].filter(Boolean).join(' ')));
$('#copy-address').addEventListener('click',()=>copyProfileText([unlockedProfile?.street,[unlockedProfile?.zip,unlockedProfile?.city].filter(Boolean).join(' '),unlockedProfile?.canton].filter(Boolean).join('\n')));

// Opening a candidate only records a visit; the actual submission is never assumed.
document.addEventListener('click',e=>{
 const link=e.target.closest('a[data-open-id],a[data-open-discovery]');if(!link)return;
 let c=null;
 if(link.dataset.openId)c=db.contests.find(x=>x.id===link.dataset.openId);
 else{const x=discoveries.find(x=>x.id===link.dataset.openDiscovery);if(x)c=findOrCreateDiscovery(x)}
 if(c&&c.status!=='done')openForReview(c);
});
// If the app was reloaded after leaving a site, offer the same confirmation.
if(db.contests.some(c=>c.status==='review'))showReview();

// v1.6 — Assistant de participation rapide : aucune interaction avec les formulaires externes.
let fastContestId=null;
function showFastMode(c){
 if(!c)return;
 fastContestId=c.id;
 tab('home');
 const panel=$('#fast-panel');
 $('#fast-title').textContent=c.name;
 const fields=[['first','Prénom'],['last','Nom'],['email','E-mail'],['phone','Téléphone'],['street','Rue'],['zip','Code postal'],['city','Localité'],['canton','Canton']];
 $('#fast-fields').innerHTML=unlockedProfile?fields.filter(([k])=>unlockedProfile[k]).map(([k,label])=>`<button class="btn secondary" type="button" data-copy="${k}">📋 ${label}</button>`).join('')+'<button class="btn secondary" type="button" id="fast-fullname">📋 Nom complet</button>':'<p class="muted">🔒 Profil verrouillé. Google peut remplir tes coordonnées dans Chrome. Pour les champs manquants, déverrouille ton profil depuis l’onglet Profil.</p>';
 $('#fast-open').href=validUrl(c.url)||'#';
 $('#fast-open').dataset.openId=c.id;
 panel.classList.remove('hidden');
 panel.scrollIntoView({block:'start',behavior:'smooth'});
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-fast-id],[data-fast-discovery]');if(!b)return;
 let c=null;
 if(b.dataset.fastId)c=db.contests.find(x=>x.id===b.dataset.fastId);
 else {const x=discoveries.find(x=>x.id===b.dataset.fastDiscovery);if(x){c=findOrCreateDiscovery(x);save();render();renderDiscoveries();}}
 showFastMode(c);
});
$('#fast-close').addEventListener('click',()=>{$('#fast-panel').classList.add('hidden');fastContestId=null});
document.addEventListener('click',e=>{if(e.target.closest('#fast-fullname'))copyProfileText([unlockedProfile?.first,unlockedProfile?.last].filter(Boolean).join(' '))});
$('#fast-open').addEventListener('click',()=>{$('#fast-panel').classList.add('hidden')});

// v1.7 : statistiques locales, gains et participations quotidiennes (sans requête externe).
function renderInsights(){
 const entries=[];for(const c of db.contests){const list=Array.isArray(c.entries)&&c.entries.length?c.entries:(c.completed?[c.completed]:[]);for(const stamp of list){const d=new Date(stamp);if(!Number.isNaN(d.getTime()))entries.push(d)}}
 const weeks=new Map(),months=new Map();
 for(const d of entries){const mon=localDay(d);mon.setDate(mon.getDate()-(mon.getDay()+6)%7);const w=mon.toLocaleDateString('fr-CH');const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;weeks.set(w,(weeks.get(w)||0)+1);months.set(m,(months.get(m)||0)+1)}
 function bars(map){return [...map].slice(-8).reverse().map(([key,n])=>`<div style="display:flex;gap:8px;align-items:center;margin:7px 0"><span style="width:100px;font-size:12px">${esc(key)}</span><div style="background:#eee6fa;border-radius:6px;flex:1;height:15px;overflow:hidden"><div style="height:100%;width:${Math.round(100*n/Math.max(...map.values(),1))}%;background:#6630a0"></div></div><strong>${n}</strong></div>`).join('')||'<p class="muted">Pas encore de participations datées.</p>'}
 $('#stats-weekly-bars').innerHTML=bars(new Map([...weeks].sort((a,b)=>b[0].localeCompare(a[0])).reverse()));
 $('#stats-monthly-bars').innerHTML=bars(new Map([...months].sort((a,b)=>a[0].localeCompare(b[0]))));
 const wins=db.contests.filter(c=>c.won&&c.won.lot);$('#wins-count').textContent=wins.length;$('#wins-value').textContent=wins.reduce((sum,c)=>sum+(Number(c.won.value)||0),0).toLocaleString('fr-CH',{maximumFractionDigits:2})+' CHF';
 $('#wins-list').innerHTML=wins.map(c=>`<p class="muted">🏆 ${esc(c.won.lot)} — ${esc(c.name)} (${Number(c.won.value||0).toLocaleString('fr-CH')} CHF)</p>`).join('')||'<p class="muted">Aucun gain enregistré.</p>';
 const due=db.contests.filter(isDailyDue);$('#daily-due-count').textContent=due.length;$('#daily-due-list').innerHTML=due.map(item).join('')||'<p class="muted">Aucun concours quotidien à refaire aujourd’hui. Marque un concours comme « Quotidien » uniquement si son règlement le permet.</p>';
}
