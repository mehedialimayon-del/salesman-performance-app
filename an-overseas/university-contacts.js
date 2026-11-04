/* Official A&N university contacts, checked against linked institutional admission pages, November 2026.
 * No global guessing: unknown information is not shown. */
(function(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const known={
 upm:{label:'UPM Admission Division / School of Graduate Studies',ug:'akd@upm.edu.my',pg:'sgs.admission@upm.edu.my',phone:'+60397696060',address:'1st Floor, Canselori Putra Building, 43400 UPM Serdang, Selangor, Malaysia',apply:'https://akademik.upm.edu.my/menupelanggan',pgApply:'https://sgs.upm.edu.my/content/admission_and_international_unit-26392',source:'https://akademik.upm.edu.my/menupelanggan'},
 um:{label:'Universiti Malaya Admissions',ug:'application@um.edu.my',pg:'application@um.edu.my',phone:'+60379673596',address:'Block G, Perdanasiswa Complex, Jalan Universiti, 50603 Kuala Lumpur, Malaysia',apply:'https://study.um.edu.my/how-to-apply',source:'https://study.um.edu.my/index'},
 ukm:{label:'UKM Centre for Academic Management',ug:'admission_ppa@ukm.edu.my',pg:'admission_ppa@ukm.edu.my',phone:'+60389118468',address:'Universiti Kebangsaan Malaysia, 43600 Bangi, Selangor, Malaysia',apply:'https://join.ukm.my/program',source:'https://join.ukm.my/daftar'},
 utm:{label:'UTM Student Recruitment & Admission Division',ug:'ugrad@utm.my',pg:'pgrad@utm.my',phone:'+6075333632',address:'Block F54, 2nd Floor, Universiti Teknologi Malaysia, 81310 Johor Bahru, Johor, Malaysia',apply:'https://admission.utm.my/apply-now/',source:'https://admission.utm.my/contact-us/'},
 uum:{label:'UUM International Admissions',ug:'servicedesk@uum.edu.my',pg:'servicedesk@uum.edu.my',phone:'+6049284000',address:'Universiti Utara Malaysia, 06010 Sintok, Kedah, Malaysia',apply:'https://apply.uum.edu.my/onlineapp_ug/app_login.aspx',pgApply:'https://apply.uum.edu.my/onlineapp/',source:'https://www.uum.edu.my/admissions/application-guidelines/undergraduate-international'},
 unikl:{label:'UniKL International Admission',ug:'iro@unikl.edu.my',pg:'ips@unikl.edu.my',phone:'+60321754000',address:'Universiti Kuala Lumpur, 1016 Jalan Sultan Ismail, 50250 Kuala Lumpur, Malaysia',apply:'https://admission.unikl.edu.my/online/frmHome.php',source:'https://www.unikl.edu.my/contact-us/'},
 klust:{label:'KLUST International Marketing & Admissions',ug:'intlmkt@klust.edu.my',pg:'intlmkt@klust.edu.my',wa:'+60145652868',address:'Block 11, Unipark Suria, Jalan Ikram-Uniten, 43000 Kajang, Selangor, Malaysia',apply:'https://klust.edu.my/admissions/international-students/',source:'https://klust.edu.my/get-in-touch/',ielts:{Bachelor:'5.0',Master:'6.0',PhD:'6.0'},englishSource:'https://klust.edu.my/admissions/'},
 uniten:{label:'UNITEN International Admissions',ug:'visa.msa@uniten.edu.my',pg:'pgapps@uniten.edu.my',phone:'+60389212020',address:'Jalan IKRAM-UNITEN, 43000 Kajang, Selangor, Malaysia',apply:'https://apply.uniten.edu.my/myuniten/',source:'https://apply.uniten.edu.my/uniapps/ContactUs.aspx'}
};
const link=(url,label)=>url?'<a class="an-guide-btn alt" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>':'';
function render(u,level){
 const c=known[u?.id];if(!c)return '';
 const email=level==='Bachelor'?c.ug:c.pg||c.ug;
 const portal=level==='Bachelor'?c.apply:c.pgApply||c.apply;
 const mail=email?'<a class="an-guide-btn alt" href="mailto:'+esc(email)+'">✉ '+esc(email)+'</a>':'';
 const phone=c.phone?'<a class="an-guide-btn alt" href="tel:'+esc(c.phone)+'">☎ '+esc(c.phone)+'</a>':'';
 const wa=c.wa?'<a class="an-guide-btn alt" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+esc(c.wa.replace(/[^0-9]/g,''))+'">WhatsApp Admissions ↗</a>':'';
 const english=c.ielts?.[level]?'<p class="an-guide-note"><b>English:</b> Published KLUST minimum IELTS '+esc(c.ielts[level])+' (check programme-specific exceptions). '+link(c.englishSource,'Official English requirements')+'</p>':'';
 return '<section class="an-guide-contact"><h3>Verified university admissions contact · '+esc(level)+'</h3><p>'+esc(c.label)+'</p>'+(c.address?'<p>📍 '+esc(c.address)+'</p>':'')+english+'<div class="an-guide-actions">'+link(portal,'Official application instructions')+mail+phone+wa+link(c.source,'Contact source')+'</div></section>';
}
window.ANUniContacts={render,known};
})();