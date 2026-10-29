(function(){
"use strict";
const get=()=>window.ANLive, db=()=>get().db, esc=s=>get().ed(s), pretty=s=>get().dt(s);
const sections=["Overview","Students","Applications","Documents","Enquiries","Messages","Invoices","Latest Updates","Website","Management","Services","Countries","Universities","Success Stories","Media"];
let section="Overview", selectedStudent="",saved={};
const panel=s=>'<section class="live-panel">'+s+'</section>';
const field=(label,key,value="",type="text")=>'<label>'+esc(label)+(type==="textarea"?'<textarea name="'+key+'">'+esc(value)+'</textarea>':'<input name="'+key+'" type="'+type+'" value="'+esc(value)+'">')+'</label>';
const dropdown=(label,key,values,value)=>'<label>'+esc(label)+'<select name="'+key+'">'+values.map(v=>'<option'+(String(v)===String(value)?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>';
const rows=(items,mapper)=>items.length?items.map(mapper).join(""):'<p class="live-mini">No records.</p>';
const showMsg=err=>{const e=document.getElementById("an-admin-note");if(e)e.textContent=err?.message||String(err);};
async function all(table){const{data,error}=await db().from(table).select("*").limit(500);if(error)throw error;return data||[];}
async function content(key){const{data,error}=await db().from("an_site_content").select("value").eq("key",key).maybeSingle();if(error)throw error;return data?.value;}
async function adminUploadImage(file,prefix){
 const mime={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
 if(!(file instanceof File)||!mime[file.type]||file.size===0||file.size>8388608)throw Error("Only JPG, PNG or WebP images under 8 MB are accepted.");
 const name=prefix+"-"+crypto.randomUUID()+"."+mime[file.type];
 const bucket=db().storage.from("an-public-media");
 const{error}=await bucket.upload(name,file,{contentType:file.type,upsert:false,cacheControl:"3600"});
 if(error)throw error;
 return bucket.getPublicUrl(name).data.publicUrl;
}
async function publish(key,value){const{error}=await db().from("an_site_content").upsert({key,value,updated_by:get().user.id,updated_at:new Date().toISOString()},{onConflict:"key"});if(error)throw error;await get().refreshPublic();}
function renderAdmin(){
 document.body.classList.remove("home-view");
 if(!get().ready)app.innerHTML=title("Admin Panel","Connecting to secure services")+panel("Connecting...");
 else if(!get().user)app.innerHTML=title("Admin Login","Please sign in first")+'<div class="wrap content">'+panel('<a href="#/login" class="btn">Secure Login</a>')+'</div>';
 else if(!get().isAdmin)app.innerHTML=title("Restricted","Admin permission required")+'<div class="wrap content">'+panel("You do not have administrator access.")+'</div>';
 else{
 const tabs=sections.map(s=>'<button data-admin-tab="'+esc(s)+'" class="'+(section===s?"active":"")+'">'+esc(s)+'</button>').join("");
 app.innerHTML=title("Admin Control Panel","Manage the A&N website, students and applications")+'<div class="wrap content page-scroll"><div class="live-controls"><a href="#/home">Website</a><button id="admin-reload">Refresh</button><button id="an-logout">Sign Out</button></div><div class="live-controls mt">'+tabs+'</div><p class="live-form-msg" id="an-admin-note"></p><div id="admin-body"></div></div>';
 void draw();
 }
 document.title="A&N Admin Panel";return true;
}
window.ANRenderAdmin=renderAdmin;
async function draw(){
 const root=document.getElementById("admin-body");if(!root)return;
 root.innerHTML=panel("Loading "+esc(section)+"...");
 try{
 let html="";
 if(section==="Overview"){
  const names=["an_students","an_applications","an_documents","an_enquiries","an_invoices"];
  const counts=await Promise.all(names.map(t=>db().from(t).select("*",{count:"exact",head:true})));
  html='<div class="grid">'+names.map((t,i)=>panel('<p>'+esc(t.slice(3).replace(/_/g," ").toUpperCase())+'</p><h2>'+((counts[i].count??"—"))+'</h2>')).join("")+'</div>';
 }
 if(section==="Students"){
  const people=await all("an_students"),approval=await all("an_student_access"),ids=new Set(approval.map(a=>a.user_id));
  html=panel('<h2>Student Account Approvals</h2>'+rows(people,p=>'<div class="live-msg"><b>'+esc(p.full_name)+'</b><p>'+esc(p.email||"")+' · '+(ids.has(p.user_id)?"Approved":"Pending")+'</p><button data-admin-student="'+esc(p.user_id)+'" data-revoke="'+(ids.has(p.user_id)?"1":"0")+'">'+(ids.has(p.user_id)?"Revoke":"Approve")+'</button></div>'));
 }
 if(section==="Applications"){
  saved.apps=await all("an_applications");
  html=panel('<h2>Applications & Verified EMGS Status</h2>'+rows(saved.apps,a=>'<div class="live-msg"><b>'+esc(a.applicant_name)+' · '+esc(a.university_id)+'</b><p>'+esc(a.programme)+' · '+esc(a.status)+' · '+Number(a.emgs_percent||0)+'%</p><button data-admin-app="'+esc(a.id)+'">Manage</button></div>')+'<div id="admin-app-form"></div>');
 }
 if(section==="Documents"){
  const docs=await all("an_documents");
  html=panel('<h2>Private Student Documents</h2><p>Each file link expires after 90 seconds.</p>'+rows(docs,d=>'<div class="live-msg"><b>'+esc(d.display_name)+'</b><p>'+esc(d.category)+' · '+pretty(d.created_at)+'</p><button data-admin-file="'+esc(d.storage_path)+'">Open Secure File</button></div>'));
 }
 if(section==="Enquiries"){
  const enquiries=await all("an_enquiries");
  html=panel('<h2>New Enquiries</h2>'+rows(enquiries,e=>'<div class="live-msg"><b>'+esc(e.full_name)+'</b><p>'+esc(e.email)+' · '+esc(e.phone||"")+'</p><p>'+esc(e.message)+'</p><button data-admin-enquiry="'+esc(e.id)+'" data-enquiry-state="contacted">Contacted</button> <button data-admin-enquiry="'+esc(e.id)+'" data-enquiry-state="closed">Closed</button></div>'));
 }
 if(section==="Messages"){
  const students=await all("an_students");selectedStudent=selectedStudent||students[0]?.user_id||"";
  const opts=students.map(p=>'<option value="'+esc(p.user_id)+'"'+(selectedStudent===p.user_id?" selected":"")+'>'+esc(p.full_name||p.email)+'</option>').join("");
  html=panel('<h2>Student Messages</h2><select id="admin-student-select">'+opts+'</select><div id="admin-chat-history" class="live-msg-list mt"></div><form id="admin-message-form" class="mt">'+field("New Message","body","","textarea")+'<button class="btn mt" type="submit">Send Message</button></form>');
 }
 if(section==="Invoices"){
  const people=await all("an_students"),items=await all("an_invoices");
  const opts=people.map(p=>'<option value="'+esc(p.user_id)+'">'+esc(p.full_name||p.email)+'</option>').join("");
  html=panel('<h2>Issue an Invoice</h2><form id="admin-invoice-form"><label>Student<select name="user_id">'+opts+'</select></label><div class="live-fieldgrid">'+field("Invoice Title","title")+field("Amount (MYR)","amount","","number")+dropdown("Status","status",["pending","paid","cancelled"],"pending")+field("Note","note","","textarea")+'</div><button class="btn mt" type="submit">Create Invoice</button></form>')+panel('<h2>Invoice History</h2>'+rows(items,i=>'<div class="live-msg"><b>'+esc(i.title)+'</b><p>'+esc(i.currency)+' '+Number(i.amount).toFixed(2)+' · '+esc(i.status)+'</p></div>'));
 }
 if(section==="Latest Updates"){
  saved.latest=await content("latest_updates")||[];
  if(!Array.isArray(saved.latest)||!saved.latest.length){
    const settings=await content("settings")||{};
    saved.latest=String(settings.ticker||"Study in Malaysia with A&N Overseas").split(/\\s*[•|]\\s*/).filter(Boolean).map((text,i)=>({text,color:i%2?"white":"orange"}));
  }
  html=panel('<h2>Latest Updates — Moving Ticker</h2><p>Set one or more scrolling messages for every page. Choose Orange or Pure White separately for each message.</p><form id="admin-latest-form"><div class="an-latest-list" id="an-latest-list">'
   +saved.latest.map((item,i)=>latestRow(i,item)).join("")
   +'</div><div class="live-controls"><button type="button" data-add-latest>+ Add Announcement</button><button class="btn" type="submit">Publish Live Updates</button></div></form>');
 }
 if(section==="Website"){
  saved.settings=await content("settings")||{};
  html=panel('<h2>Edit Website Settings</h2><form id="admin-settings-form"><div class="live-fieldgrid">'+["ticker","motto","heroLead","heroAccent","heroDescription","heroImage","about","work","malaysiaOffice","bangladeshOffice","phone","whatsapp","email"].map(k=>field(k,k,saved.settings[k]||"",/ticker|about|work/.test(k)?"textarea":"text")).join("")+'</div><button class="btn mt" type="submit">Publish Settings</button></form><div class="mt"><h3>Homepage Image Upload</h3><p>Upload your preferred student/graduate photo. It will automatically replace the homepage background.</p><form id="admin-home-image-form"><input type="file" name="image" required accept="image/jpeg,image/png,image/webp"><button type="submit" class="btn mt">Upload & Set Home Image</button></form></div>');
 }
 if(section==="Management"){
  saved.management=await content("management")||[];
  html=panel('<h2>Management & Team Profiles</h2><p>Add approved public details and images, then publish directly.</p><form id="admin-management-form"><div id="an-team-list">'
  +rows(saved.management,(m,i)=>teamRow(i,m))+'</div><div class="live-controls mt"><button type="button" data-add-admin-row="team">+ Add Person</button><button type="submit" class="btn">Publish Team</button></div></form>');
 }
 if(section==="Services"){
  saved.services=await content("services")||serviceList;
  html=panel('<h2>Services Editor</h2><form id="admin-services-form"><div id="an-services-list">'
  +rows(saved.services,(v,i)=>serviceRow(i,v))+'</div><div class="live-controls mt"><button type="button" data-add-admin-row="service">+ Add Service</button><button class="btn" type="submit">Publish Services</button></div></form>');
 }
 if(section==="Countries"){
  saved.countries=await content("countries")||countries;
  html=panel('<h2>Study Destinations Editor</h2><p>Campus images currently use Unsplash image identifiers.</p><form id="admin-countries-form"><div id="an-countries-list">'
  +rows(saved.countries,(v,i)=>countryRow(i,v))+'</div><div class="live-controls mt"><button type="button" data-add-admin-row="country">+ Add Country</button><button class="btn" type="submit">Publish Destinations</button></div></form>');
 }
 if(section==="Universities"){
  saved.universities=await content("university_overrides")||[];
  const options=U.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.short)+' — '+esc(u.name)+'</option>').join('');
  const form='<label style="display:block;margin-bottom:12px;color:#ffa440">Select Existing University<select id="admin-university-choice"><option value="">+ Create new institution</option>'+options+'</select></label>'
   +'<form id="admin-university-form"><div class="live-fieldgrid">'
   +field("University ID (lowercase)","id")+field("Official Name","name")+field("Short Name","short")
   +field("Country","country","Malaysia")+field("Campus / City","city")+dropdown("Type","kind",["Public","Private"],"Public")
   +field("Official Website","site","https://")+field("Programmes (comma-separated)","programs","","textarea")
   +'</div><h3 style="margin:16px 0 8px;color:#ff9b28">University Photos & Logo</h3>'
   +'<p style="font-size:12px">Images are added to the current university catalogue and portfolio after Publish. Existing official photos remain until you choose replacements.</p>'
   +'<div class="live-fieldgrid">'
   +field("Card / Cover Photo URL","cardImageUrl")+field("University Logo URL","logoImageUrl")
   +field("Gallery Photo URLs (one per line)","galleryImages","","textarea")
   +'<label>Upload New Card Photo<input type="file" name="card_file" accept="image/jpeg,image/png,image/webp"></label>'
   +'<label>Upload New University Logo<input type="file" name="logo_file" accept="image/jpeg,image/png,image/webp"></label>'
   +'<label class="full">Add Multiple Campus/Gallery Photos<input type="file" name="gallery_files" multiple accept="image/jpeg,image/png,image/webp"></label>'
   +'</div><p style="font-size:11px;color:#ffbe70">Maximum 8 MB per photo, 12 gallery images. Upload only photos you own or have permission to publish.</p>'
   +'<p id="an-university-upload-status" role="status" style="font-size:12px;color:#ffba5c"></p>'
   +'<button class="btn mt" type="submit">Save & Publish University</button></form>';
  html=panel('<h2>University Catalogue Editor</h2><p>Enter official institution details.</p>'+form)+panel('<h2>Edited Listings</h2>'+rows(saved.universities,u=>'<div class="live-msg"><b>'+esc(u.name)+'</b><p>'+esc(u.city||"")+'</p><button data-admin-uni="'+esc(u.id)+'">Edit</button></div>'));
 }
 if(section==="Success Stories"){
  saved.stories=await content("success_stories")||[];
  const form='<form id="admin-story-form"><div class="live-fieldgrid">'+field("Title","title")+'<label>Upload Photo or Video<input name="story_file" type="file" required accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"></label>'+field("Caption / Graduation Details","description","","textarea")+'</div><p class="an-upload-help">Select an image (up to 8 MB) or video (up to 40 MB). No media URL required. New posts are private drafts until you choose Publish.</p><label><input type="checkbox" name="consent" style="width:auto" required> I confirm the student has consented to publication</label><button class="btn mt" type="submit">Upload as Draft</button><div id="an-story-upload-status" class="an-upload-progress" role="status"></div></form>';
  html=panel('<h2>Student Success Gallery</h2>'+form)+panel('<h2>Published Items</h2>'+rows(saved.stories,(s,i)=>'<div class="live-msg"><b>'+esc(s.title)+'</b> · '+(s.approved?"Published":"Draft")+'<div style="margin:8px 0">'+(s.type==="video"?'<video controls playsinline preload="metadata" style="width:min(320px,100%);max-height:175px" src="'+esc(s.media_url)+'"></video>':'<img src="'+esc(s.media_url)+'" alt="'+esc(s.title)+'" style="width:min(250px,100%);max-height:150px;object-fit:contain">')+'</div><button data-admin-story="'+i+'" data-action="toggle">'+(s.approved?"Unpublish":"Publish")+'</button> <button data-admin-story="'+i+'" data-action="delete">Remove</button></div>'));
 }
 if(section==="Media"){
  const {data,error}=await db().storage.from("an-public-media").list("",{limit:100});if(error)throw error;
  html=panel('<h2>Public Image Upload</h2><p>For approved marketing and success-story imagery only. Maximum 4MB.</p><form id="admin-media-form"><input name="image" type="file" accept="image/jpeg,image/png,image/webp" required><button type="submit" class="btn mt">Upload</button></form>')
  +panel('<h2>Media Library</h2><div class="grid">'+rows(data||[],f=>{const u=db().storage.from("an-public-media").getPublicUrl(f.name).data.publicUrl;return '<div class="live-msg"><img src="'+esc(u)+'" alt="" loading="lazy" style="width:100%;height:120px;object-fit:contain"><p>'+esc(f.name)+'</p><button data-media-copy="'+esc(u)+'">Copy URL</button></div>';})+'</div>');
 }
 root.innerHTML=html;
 if(section==="Messages")await loadMessages();
 }catch(e){root.innerHTML=panel('<h2>Unable to load</h2><p>'+esc(e.message||String(e))+'</p>');}
}
async function loadMessages(){
 let el=document.getElementById("admin-chat-history");if(!el||!selectedStudent)return;
 const {data,error}=await db().from("an_messages").select("body,sender_id,created_at").eq("user_id",selectedStudent).order("created_at",{ascending:true});
 el.innerHTML=error?esc(error.message):rows(data||[],m=>'<div class="live-msg"><small>'+pretty(m.created_at)+' · '+(m.sender_id===selectedStudent?"Student":"Admin")+'</small>'+esc(m.body)+'</div>');
}
function latestRow(i,item){
 return '<div class="an-latest-row" data-latest-index="'+i+'"><label>Scrolling Message<textarea name="an-latest-text-'+i+'" required maxlength="400">'+esc(item.text||"")+'</textarea></label>'
 +'<label>Text Colour<select name="an-latest-colour-'+i+'"><option value="orange"'+(item.color!=="white"?" selected":"")+'>Orange</option><option value="white"'+(item.color==="white"?" selected":"")+'>Pure White</option></select></label>'
 +'<button type="button" data-remove-latest aria-label="Remove announcement">×</button></div>';
}
function teamRow(i,v){
 return '<div class="live-msg" data-team-index="'+i+'"><h3>Team Member '+(i+1)+'</h3><div class="live-fieldgrid">'
 +field("Name","team-name-"+i,v.name||"")+field("Designation","team-designation-"+i,v.designation||v.role||"")
 +field("Department","team-department-"+i,v.department||"")+field("Public Photo URL","team-photo-"+i,v.photo||"")
 +field("Bio","team-bio-"+i,v.bio||"","textarea")+'</div><button type="button" data-remove-admin-row="team">Remove</button></div>';
}
function serviceRow(i,v){
 return '<div class="live-msg" data-service-index="'+i+'"><h3>Service '+(i+1)+'</h3><div class="live-fieldgrid">'
 +field("Icon / Emoji","service-icon-"+i,v[0]||"")+field("Title","service-title-"+i,v[1]||"")
 +field("Description","service-desc-"+i,v[2]||"","textarea")+'</div><button type="button" data-remove-admin-row="service">Remove</button></div>';
}
function countryRow(i,v){
 return '<div class="live-msg" data-country-index="'+i+'"><h3>Country '+(i+1)+'</h3><div class="live-fieldgrid">'
 +field("Country Name","country-name-"+i,v[0]||"")+field("Flag Emoji","country-flag-"+i,v[1]||"")
 +field("Image ID","country-photo-"+i,v[2]||"")+'</div><button type="button" data-remove-admin-row="country">Remove</button></div>';
}
document.addEventListener("change",e=>{if(e.target.id==="admin-student-select"){selectedStudent=e.target.value;void loadMessages();}
if(e.target.id==="admin-university-choice"){const id=e.target.value,form=document.getElementById("admin-university-form");if(!form)return;
const u=saved.universities?.find(z=>z.id===id)||U.find(z=>z.id===id);
if(!u){form.reset();return;}
const source=UNIVERSITY_PROFILES[id];
const vals={...u,cardImageUrl:u.cardImageUrl||u.cardPhoto||source?.images?.[0]?.url||"",logoImageUrl:u.logoImageUrl||u.logoImage||source?.logo||"",galleryImages:u.galleryImages||[]};
for(const k of ["id","name","short","country","city","kind","site","programs","cardImageUrl","logoImageUrl","galleryImages"]){
let el=form.elements[k];if(el)el.value=k==="programs"?(vals.programs||[]).join(", "):k==="galleryImages"?(vals.galleryImages||[]).join("\n"):(vals[k]||"");
}}});
document.addEventListener("click",async e=>{
 if(!get()?.isAdmin||!location.hash.startsWith("#/admin"))return;
 const t=e.target;
 try{
 if(t.hasAttribute("data-add-latest")){
  const list=document.getElementById("an-latest-list");if(list){
    const used=[...list.querySelectorAll("[data-latest-index]")].map(el=>Number(el.dataset.latestIndex));
    const index=Math.max(-1,...used)+1;list.insertAdjacentHTML("beforeend",latestRow(index,{text:"",color:"orange"}));
  }
 }
 if(t.hasAttribute("data-remove-latest")){t.closest("[data-latest-index]")?.remove();}
 if(t.dataset.addAdminRow){
  const typ=t.dataset.addAdminRow,selector=typ==="team"?"#an-team-list":typ==="service"?"#an-services-list":"#an-countries-list";
  const list=document.querySelector(selector);if(list){
    const i=list.children.length;
    list.insertAdjacentHTML("beforeend",typ==="team"?teamRow(i,{}):typ==="service"?serviceRow(i,["","",""]):countryRow(i,["","",""]));
  }
 }
 if(t.dataset.removeAdminRow){t.closest(".live-msg")?.remove();}
 if(t.dataset.adminTab){section=t.dataset.adminTab;document.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===section));await draw();}
 if(t.id==="admin-reload")await draw();
 if(t.dataset.adminApp){const a=saved.apps.find(v=>v.id===t.dataset.adminApp);if(!a)return;const f='<form id="admin-case-form" data-id="'+esc(a.id)+'"><div class="live-fieldgrid">'+dropdown("Case Status","status",["submitted","under_review","documents_required","university_submitted","offer_received","emgs_submitted","visa_processing","approved","completed","rejected"],a.status)+dropdown("Verified EMGS %","emgs_percent",[0,5,15,32,35,70,80,90,95,100],a.emgs_percent)+'</div><button class="btn mt" type="submit">Save Case</button></form>';document.getElementById("admin-app-form").innerHTML=panel('<h3>Update '+esc(a.applicant_name)+'</h3>'+f+'<form id="admin-update-form" data-id="'+esc(a.id)+'" class="mt">'+field("Update Title","title")+field("Message","body","","textarea")+'<button class="btn mt" type="submit">Notify Student</button></form>');}
 if(t.dataset.adminStudent){const id=t.dataset.adminStudent;const op=t.dataset.revoke==="1"?db().from("an_student_access").delete().eq("user_id",id):db().from("an_student_access").insert({user_id:id,approved_by:get().user.id});const{error}=await op;if(error)throw error;await draw();}
 if(t.dataset.adminFile){const{data,error}=await db().storage.from("an-student-files").createSignedUrl(t.dataset.adminFile,90);if(error)throw error;window.open(data.signedUrl,"_blank","noopener");}
 if(t.dataset.adminEnquiry){const{error}=await db().from("an_enquiries").update({status:t.dataset.enquiryState}).eq("id",t.dataset.adminEnquiry);if(error)throw error;await draw();}
 if(t.dataset.adminUni){let u=saved.universities.find(z=>z.id===t.dataset.adminUni)||U.find(z=>z.id===t.dataset.adminUni),f=document.getElementById("admin-university-form");if(u&&f){for(const key of ["id","name","short","country","city","kind","site","programs","cardImageUrl","logoImageUrl","galleryImages"]){let el=f.elements[key];if(el)el.value=key==="programs"?(u.programs||[]).join(", "):key==="galleryImages"?(u.galleryImages||[]).join("\n"):(u[key]||"");}document.getElementById('admin-university-choice').value=u.id;f.scrollIntoView({behavior:'smooth',block:'start'});}}
 if(t.dataset.adminStory!==undefined){let a=saved.stories.slice(),i=Number(t.dataset.adminStory);if(t.dataset.action==="toggle")a[i].approved=!a[i].approved;else if(confirm("Remove this story?"))a.splice(i,1);else return;await publish("success_stories",a);await draw();}
 if(t.dataset.mediaCopy){try{await navigator.clipboard.writeText(t.dataset.mediaCopy);showMsg("Image URL copied");}catch(_){showMsg(t.dataset.mediaCopy);}}
 }catch(e2){showMsg(e2);}
},true);
document.addEventListener("submit",async e=>{
 if(!get()?.isAdmin||!location.hash.startsWith("#/admin"))return;
 const f=e.target,id=f.id,allowed=["admin-case-form","admin-update-form","admin-message-form","admin-invoice-form","admin-settings-form","admin-latest-form","admin-management-form","admin-services-form","admin-countries-form","admin-university-form","admin-story-form","admin-media-form","admin-home-image-form"];
 if(!allowed.includes(id))return;
 e.preventDefault();e.stopImmediatePropagation();
 const b=f.querySelector("[type=submit]");if(b)b.disabled=true;
 const form=new FormData(f),v=k=>String(form.get(k)||"").trim();
 try{
 if(id==="admin-case-form"){const pct=Number(v("emgs_percent"));if(![0,5,15,32,35,70,80,90,95,100].includes(pct))throw Error("Choose a valid progress step");const{error}=await db().from("an_applications").update({status:v("status"),emgs_percent:pct}).eq("id",f.dataset.id);if(error)throw error;}
 if(id==="admin-update-form"){const{error}=await db().from("an_application_updates").insert({application_id:f.dataset.id,title:v("title"),body:v("body")});if(error)throw error;}
 if(id==="admin-message-form"){if(!selectedStudent)throw Error("Choose student");const{error}=await db().from("an_messages").insert({user_id:selectedStudent,sender_id:get().user.id,body:v("body")});if(error)throw error;}
 if(id==="admin-invoice-form"){if(!(Number(v("amount"))>0))throw Error("Invalid amount");const{error}=await db().from("an_invoices").insert({user_id:v("user_id"),title:v("title"),amount:Number(v("amount")),currency:"MYR",status:v("status"),note:v("note")});if(error)throw error;}
 if(id==="admin-latest-form"){
   const items=[...f.querySelectorAll("[data-latest-index]")].map(el=>{
     const i=el.dataset.latestIndex;return {text:v("an-latest-text-"+i),color:v("an-latest-colour-"+i)==="white"?"white":"orange"};
   }).filter(x=>x.text);
   if(!items.length)throw Error("Add at least one announcement.");
   if(items.length>30)throw Error("Maximum 30 announcements are supported.");
   await publish("latest_updates",items);get().latestUpdates=items;
   window.ANUpdateTicker?.(items);showMsg("Published scrolling updates across the website.");
 }
 if(id==="admin-settings-form"){const s={...saved.settings};for(const k of ["ticker","motto","heroLead","heroAccent","heroDescription","heroImage","about","work","malaysiaOffice","bangladeshOffice","phone","whatsapp","email"])s[k]=v(k);await publish("settings",s);}
 if(id==="admin-management-form"){
  const members=[...document.querySelectorAll("[data-team-index]")].map(el=>{
    const i=el.dataset.teamIndex;return {name:v("team-name-"+i),designation:v("team-designation-"+i),department:v("team-department-"+i),photo:v("team-photo-"+i),bio:v("team-bio-"+i)};
  }).filter(m=>m.name);await publish("management",members);
 }
 if(id==="admin-services-form"){
  const services=[...document.querySelectorAll("[data-service-index]")].map(el=>{
   const i=el.dataset.serviceIndex;return [v("service-icon-"+i),v("service-title-"+i),v("service-desc-"+i)];
  }).filter(a=>a[1]);if(!services.length)throw Error("Keep at least one service");await publish("services",services);
 }
 if(id==="admin-countries-form"){
  const destinations=[...document.querySelectorAll("[data-country-index]")].map(el=>{
   const i=el.dataset.countryIndex;return [v("country-name-"+i),v("country-flag-"+i),v("country-photo-"+i)];
  }).filter(a=>a[0]);if(!destinations.length)throw Error("Keep at least one country");await publish("countries",destinations);
 }
 if(id==="admin-university-form"){
 const id=v("id"),current=(saved.universities||[]).find(z=>z.id===id)||{};
 const row={...current,id,name:v("name"),short:v("short"),country:v("country"),city:v("city"),kind:v("kind"),site:v("site"),programs:v("programs").split(",").map(q=>q.trim()).filter(Boolean),
 cardImageUrl:v("cardImageUrl"),logoImageUrl:v("logoImageUrl"),galleryImages:v("galleryImages").split(/\r?\n/).map(q=>q.trim()).filter(Boolean)};
 if(!/^[a-z0-9-]{2,60}$/.test(row.id)||!row.name||!/^https:\/\//.test(row.site))throw Error("Valid university ID, name and official website URL are required");
 const status=document.getElementById("an-university-upload-status");
 const cover=form.get("card_file"),logo=form.get("logo_file"),photos=f.querySelector('[name="gallery_files"]')?.files;
 if(cover instanceof File&&cover.size){if(status)status.textContent="Uploading card photo...";row.cardImageUrl=await adminUploadImage(cover,"university-cover");}
 if(logo instanceof File&&logo.size){if(status)status.textContent="Uploading university logo...";row.logoImageUrl=await adminUploadImage(logo,"university-logo");}
 if(photos&&photos.length){if(photos.length>12)throw Error("Maximum 12 gallery photos per upload.");for(let i=0;i<photos.length;i++){if(status)status.textContent="Uploading gallery "+(i+1)+" / "+photos.length+" ...";row.galleryImages.push(await adminUploadImage(photos[i],"university-gallery"));}}
 row.galleryImages=[...new Set(row.galleryImages)].slice(0,15);
 if(row.galleryImages.some(u=>!/^https:\/\//i.test(u)))throw Error("Gallery image URLs must begin with https://");
 const a=(saved.universities||[]).filter(q=>q.id!==row.id);a.push(row);
 await publish("university_overrides",a);
}
 if(id==="admin-story-form"){
   if(!form.has("consent"))throw Error("Consent confirmation is required.");
   const file=form.get("story_file");
   const images=["image/jpeg","image/png","image/webp"];
   const videos=["video/mp4","video/webm","video/quicktime"];
   if(!(file instanceof File)||!file.size)throw Error("Select a photo or video to upload.");
   if(!images.includes(file.type)&&!videos.includes(file.type))throw Error("Please use JPG, PNG, WebP, MP4, WebM or MOV.");
   const video=videos.includes(file.type),max=video?41943040:8388608;
   if(file.size>max)throw Error(video?"Video must be 40 MB or smaller.":"Image must be 8 MB or smaller.");
   if(!v("title"))throw Error("Enter the story title.");
   const status=document.getElementById("an-story-upload-status");
   if(status)status.textContent="Uploading media securely...";
   const ext=({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","video/mp4":"mp4","video/webm":"webm","video/quicktime":"mov"})[file.type];
   const name="success-story-"+crypto.randomUUID()+"."+ext;
   const bucket=db().storage.from("an-public-media");
   const{error:uploadError}=await bucket.upload(name,file,{upsert:false,contentType:file.type,cacheControl:"3600"});
   if(uploadError)throw uploadError;
   if(status)status.textContent="Media uploaded. Saving the story as draft...";
   const media_url=bucket.getPublicUrl(name).data.publicUrl;
   const a=saved.stories.slice();
   a.unshift({title:v("title"),description:v("description"),media_url,type:video?"video":"image",approved:false,created_at:new Date().toISOString()});
   await publish("success_stories",a);
   showMsg("Uploaded as draft. Press Publish to make this story visible to visitors.");
 }
 if(id==="admin-home-image-form"){
  const img=form.get("image");
  if(!(img instanceof File)||!["image/jpeg","image/png","image/webp"].includes(img.type)||img.size>4194304)throw Error("Use JPG/PNG/WebP smaller than 4MB");
  const ext=img.type==="image/png"?"png":img.type==="image/webp"?"webp":"jpg";
  const filename="hero-"+crypto.randomUUID()+"."+ext;
  const bucket=db().storage.from("an-public-media");
  const {error}=await bucket.upload(filename,img,{contentType:img.type,upsert:false});if(error)throw error;
  const image=bucket.getPublicUrl(filename).data.publicUrl;
  const settings=await content("settings")||{};
  settings.heroImage=image;
  await publish("settings",settings);
 }
 if(id==="admin-media-form"){const img=form.get("image");if(!(img instanceof File)||!["image/jpeg","image/png","image/webp"].includes(img.type)||img.size>4194304)throw Error("Use a JPG, PNG or WEBP under 4MB");const ext=img.type==="image/png"?"png":img.type==="image/webp"?"webp":"jpg";const{error}=await db().storage.from("an-public-media").upload(crypto.randomUUID()+"."+ext,img,{contentType:img.type,upsert:false});if(error)throw error;}
 showMsg("Saved.");await draw();
 }catch(err){showMsg(err);}
 finally{if(b?.isConnected)b.disabled=false;}
},true);
})();