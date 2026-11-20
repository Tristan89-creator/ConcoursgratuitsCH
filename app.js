'use strict';
const KEY='concoursch-v1', VAULT='concoursch-profile-vault-v12';let db;let discoveries=[];let unlockedProfile=null;let vaultPassword=null;let legacyProfile=null;
try{db=JSON.parse(localStorage.getItem(KEY))||{profile:{},contests:[]}}catch{db={profile:{},contests:[]}};
if(!db||typeof db!=='object'||!Array.isArray(db.contests)||typeof db.profile!=='object')db={profile:{},contests:[]};
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{db.profile={};localStorage.setItem(KEY,JSON.stringify(db))}catch{toast('Stockage indisponible : données non enregistrées')}}
function toast(s){let e=$('#toast');e.textContent=s;e.style.display='block';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>e.style.display='none',3000)}
function tab(t){document.querySelectorAll('main>section').forEach(e=>e.classList.toggle('hidden',e.id!==t));document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===t));window.scrollTo(0,0);render()}
document.addEventListener('click',e=>{let b=e.target.closest('[data-tab]');if(b)tab(b.dataset.tab)});
function validUrl(s){try{let u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}}
function item(c){let url=validUrl(c.url);let status=c.status==='done'?'Participé':c.status==='manual'?'Action manuelle':'À participer';return `<article class="contest"><div class="row"><h3>${esc(c.name)}</h3><span class="pill">${status}</span></div><p class="muted">${c.end?'Fin : '+esc(c.end)+' · ':''}${esc(c.notes||'')}</p><div class="actions">${url?`<a class="btn secondary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Ouvrir le site ↗</a>`:''}${c.status!=='done'?`<button class="btn" data-status="done" data-id="${esc(c.id)}">J'ai participé</button>`:''}${c.status!=='manual'?`<button class="btn ghost" data-status="manual" data-id="${esc(c.id)}">Action manuelle</button>`:''}${c.status!=='pending'?`<button class="btn ghost" data-status="pending" data-id="${esc(c.id)}">À faire</button>`:''}<button class="btn danger" data-delete="${esc(c.id)}">Supprimer</button></div></article>`}
function render(){let all=db.contests,done=all.filter(x=>x.status==='done'),pending=all.filter(x=>x.status==='pending'),manual=all.filter(x=>x.status==='manual');$('#count-all').textContent=all.length;$('#count-done').textContent=done.length;$('#count-pending').textContent=pending.length;$('#count-manual').textContent=manual.length;$('#home-list').innerHTML=[...pending,...manual].slice(0,5).map(item).join('')||'<div class="empty">Aucun concours en attente.</div>';let f=$('#filter').value;$('#contest-list').innerHTML=all.filter(x=>f==='all'||x.status===f).map(item).join('')||'<div class="empty">Aucun concours dans cette catégorie.</div>';$('#history-list').innerHTML=done.map(item).join('')||'<div class="empty">Aucune participation confirmée.</div>';$('#copy-fields').innerHTML=Object.entries({first:'Prénom',last:'Nom',email:'E-mail',phone:'Téléphone',street:'Adresse',zip:'Code postal',city:'Localité',canton:'Canton'}).filter(([k])=>unlockedProfile&&unlockedProfile[k]).map(([k,v])=>`<button class="btn secondary" data-copy="${k}">Copier ${esc(v)}</button>`).join('')||'<p class="muted">Enregistre ton profil pour afficher les boutons de copie.</p>'}
$('#filter').addEventListener('change',render);
$('#add-form').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target),url=validUrl(f.get('url'));if(!url){toast('Utilise une adresse http ou https valide');return}db.contests.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:String(f.get('name')).trim(),url,end:String(f.get('end')||''),notes:String(f.get('notes')||''),status:'pending',created:new Date().toISOString()});save();e.target.reset();render();toast('Concours enregistré')});
document.addEventListener('click',async e=>{let b=e.target.closest('[data-status],[data-delete],[data-copy]');if(!b)return;if(b.dataset.status){let c=db.contests.find(x=>x.id===b.dataset.id);if(c){c.status=b.dataset.status;if(c.status==='done')c.completed=new Date().toISOString();save();render()}}else if(b.dataset.delete){if(confirm('Supprimer ce concours ?')){db.contests=db.contests.filter(x=>x.id!==b.dataset.delete);save();render()}}else if(b.dataset.copy){let value=unlockedProfile?.[b.dataset.copy];if(!value)return;try{await navigator.clipboard.writeText(value);toast('Copié !')}catch{toast('Copie indisponible dans ce navigateur')}}});
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
$('#export').addEventListener('click',()=>{const backup={format:'ConcoursgratuitsCH-v1.2',contests:db.contests,encryptedProfile:vault()};let blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='concoursch-sauvegarde-chiffree.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Sauvegarde exportée : garde ton mot de passe')});
$('#import').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1e6)throw Error('Fichier trop volumineux');let v=JSON.parse(await file.text());if(!v||!Array.isArray(v.contests)||v.contests.length>5000)throw Error('Format invalide');if(v.profile&&Object.values(v.profile).some(Boolean))throw Error('Ancienne sauvegarde non chiffrée refusée : utilise la migration du profil dans la version précédente');if(v.encryptedProfile&&(!v.encryptedProfile.ciphertext||v.encryptedProfile.version!==1))throw Error('Coffre invalide');const contests=v.contests.map(c=>({id:String(c.id||crypto.randomUUID()),name:String(c.name||'Sans titre').slice(0,120),url:validUrl(c.url)||'',end:String(c.end||'').slice(0,30),notes:String(c.notes||'').slice(0,500),status:['pending','manual','done'].includes(c.status)?c.status:'pending'}));if(!confirm('Remplacer les concours et le coffre chiffré actuels par cette sauvegarde ?'))return;db={profile:{},contests};save();if(v.encryptedProfile)localStorage.setItem(VAULT,JSON.stringify(v.encryptedProfile));else localStorage.removeItem(VAULT);unlockedProfile=null;vaultPassword=null;legacyProfile=null;fillProfile();render();updateVaultUI();toast('Sauvegarde importée')}catch(err){toast('Import impossible : '+err.message)}e.target.value=''});
updateVaultUI();render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});render();

// Public, static discovery catalog. No personal data is sent to the discovery source.
function renderDiscoveries(){
 const q=($('#discovery-query').value||'').toLocaleLowerCase(),lang=$('#discovery-lang').value;
 const matches=discoveries.filter(x=>(lang==='all'||x.language===lang)&&((x.name||'')+' '+(x.source||'')).toLocaleLowerCase().includes(q));
 $('#discovery-list').innerHTML=matches.length?matches.slice(0,80).map(x=>{
 const url=validUrl(x.url);if(!url)return '';
 const saved=db.contests.some(c=>c.url===url);
 return `<article class="contest"><h3>${esc(x.name)}</h3><p class="muted">${esc(x.source||'Source non précisée')} · ${esc(x.language.toUpperCase())} · Publié le ${esc(x.published||'date inconnue')}<br><strong>Concours non vérifié</strong></p><div class="actions"><a class="btn secondary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Consulter ↗</a><button class="btn" data-discover="${esc(x.id)}" ${saved?'disabled':''}>${saved?'Déjà enregistré':'+ Ajouter à mes concours'}</button></div></article>`;
 }).join(''):'<div class="empty">Aucun résultat. Le catalogue peut être vide si la collecte n’est pas encore activée sur GitHub.</div>';
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
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-discover]');if(!b)return;
 const x=discoveries.find(x=>x.id===b.dataset.discover);if(!x)return;
 const url=validUrl(x.url);if(!url||db.contests.some(c=>c.url===url)){toast('Déjà enregistré');return}
 db.contests.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:x.name.slice(0,120),url,end:'',notes:'Découverte automatique non vérifiée · '+(x.source||''),status:'pending',created:new Date().toISOString()});
 save();render();renderDiscoveries();toast('Ajouté à mes concours');
});
loadDiscoveries();
