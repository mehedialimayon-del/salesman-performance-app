/* A&N Overseas: universal colour-only theme normalizer.
 * Rewrites ONLY CSS colour declarations in first-party stylesheets.
 * Never rewrites layout, sizing, imagery, text, content, or animations.
 * Preserves brand photographs and colour-coded warning semantics.
 */
(function(){
  'use strict';
  const observed=new WeakSet();
  const isOwn=sheet=>{try{
    return !sheet.href || new URL(sheet.href,location.href).origin===location.origin;
  }catch(e){return false}};
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const hex=(n)=>Math.round(clamp(n,0,255)).toString(16).padStart(2,'0');
  const rgbaRE=/rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*(?:,|\/)\s*([\d.]+%?))?\s*\)/gi;
  const hexRE=/#(?:[a-f\d]{8}|[a-f\d]{6}|[a-f\d]{4}|[a-f\d]{3})(?![a-f\d])/gi;
  function decode(token){
    if(token[0]==='#'){
      const v=token.slice(1);
      if(v.length===3||v.length===4){
        const nums=v.split('').map(c=>parseInt(c+c,16));
        return [nums[0],nums[1],nums[2],v.length===4?nums[3]/255:1];
      }
      return [parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16),v.length===8?parseInt(v.slice(6,8),16)/255:1];
    }
    const m=token.match(/^rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*(?:,|\/)\s*([\d.]+%?))?\s*\)$/i);
    if(!m)return null;
    const alpha=m[4]?(m[4].endsWith('%')?parseFloat(m[4])/100:parseFloat(m[4])):1;
    return [parseFloat(m[1]),parseFloat(m[2]),parseFloat(m[3]),clamp(alpha,0,1)];
  }
  function hsl(r,g,b){
    r/=255;g/=255;b/=255;
    const hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;
    let h=0,s=0,l=(hi+lo)/2;
    if(d){
      s=d/(1-Math.abs(2*l-1));
      switch(hi){case r:h=((g-b)/d)%6;break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}
      h=(h*60+360)%360;
    }
    return [h,s,l];
  }
  function fromHsl(h,s,l){
    const a=s*Math.min(l,1-l);
    const f=n=>{const k=(n+h/30)%12;return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))};
    return [f(0),f(8),f(4)];
  }
  function mapped(token,prop){
    const c=decode(token);if(!c)return token;
    let [r,g,b,a]=c;const mn=Math.min(r,g,b),mx=Math.max(r,g,b);
    const range=mx-mn;
    const [h,s,l]=hsl(r,g,b);
    let next=null;
    if(mn>=211 && range<=48){
      next=[255,255,255]; // pure, not warm grey or off-white
    }else if(mn>=153 && range<=25){
      next=[255,255,255]; // muted light greys become white
    }else if(s>=.30 && l>=.20){
      if((h>=5&&h<35) || (h>=35&&h<=59)){
        const isGold=h>=35;
        // Keep orange and gold distinct but give both saturated deep tones.
        // Dark border/gradient stops keep their existing shade hierarchy.
        const targetL=l>=.68?(isGold?.52:.50):l>=.43?(isGold?.49:.47):clamp(l*1.07,.21,.43);
        next=fromHsl(isGold?41:26,1,targetL);
        if((prop==='color'||prop==='fill'||prop==='stroke') && a<.84)a=Math.max(a,.94);
        else if((prop.includes('border')||prop.includes('outline'))&&a>=.14&&a<.55)a=.66;
      }else if(h<5||h>=346){
        next=fromHsl(355,.94,clamp(l,.32,.52));
      }else if(h>=60&&h<177){
        next=fromHsl(clamp(h,104,158),.91,clamp(l,.27,.44));
      }else if(h>=177&&h<258){
        next=fromHsl(clamp(h,198,235),.92,clamp(l,.28,.48));
      }else if(h>=258&&h<346){
        next=fromHsl(clamp(h,265,325),.9,clamp(l,.3,.48));
      }
    }
    if(!next)return token;
    if(a>=.999)return '#'+next.map(hex).join('');
    return 'rgba('+next.map(v=>Math.round(v)).join(',')+','+Number(a.toFixed(3))+')';
  }
  const colourProperty=/(^|-)color$|^background$|^background-image$|^background-color$|^border(?:-(?:top|right|bottom|left|block|inline))?(?:-color)?$|^outline(?:-color)?$|^box-shadow$|^text-shadow$|^fill$|^stroke$|^caret-color$|^text-decoration-color$|^column-rule(?:-color)?$|^--/i;
  function normalize(value,prop){
    if(!value || !colourProperty.test(prop))return value;
    // Do not modify URLs/images, hex fragments inside URLs, or quoted text.
    const segments=value.split(/(url\(\s*(?:[^)]*)\)|"[^"]*"|'[^']*')/gi);
    return segments.map(piece=>{
      if(/^url\(|^["']/.test(piece.trim()))return piece;
      return piece.replace(rgbaRE,m=>mapped(m,prop)).replace(hexRE,m=>mapped(m,prop));
    }).join('');
  }
  let changed=0;
  function walk(rules){
    for(const rule of rules){
      if(rule.style){
        const style=rule.style;
        for(let i=0,props=[...style];i<props.length;i++){
          const p=props[i];if(!colourProperty.test(p))continue;
          const value=style.getPropertyValue(p);
          const result=normalize(value,p);
          if(result!==value){style.setProperty(p,result,style.getPropertyPriority(p));changed++}
        }
      }
      try{if(rule.cssRules)walk(rule.cssRules)}catch(_){}
    }
  }
  function processSheet(sheet){
    if(observed.has(sheet) || !isOwn(sheet))return;
    try{walk(sheet.cssRules);observed.add(sheet)}catch(_){}
  }
  function apply(){
    for(const sheet of document.styleSheets)processSheet(sheet);
    const root=document.documentElement.style;
    root.setProperty('--orange','#ff7900');
    root.setProperty('--gold','#ffae00');
    root.setProperty('--ink','#ffffff');
    root.setProperty('--an-orange','#ff7900');
    root.setProperty('--an-gold','#ffae00');
    root.setProperty('--an-white','#ffffff');
    root.setProperty('--an-ink','#ffffff');
    document.documentElement.dataset.anDeepPalette='active';
    document.documentElement.dataset.anDeepChanges=String(changed);
  }
  // Styles added by route-specific modules use the same palette.
  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
  for(const link of document.querySelectorAll('link[rel="stylesheet"]'))link.addEventListener('load',queue,{once:true});
  new MutationObserver(queue).observe(document.head,{childList:true});
  window.addEventListener('load',queue,{once:true});
  window.addEventListener('hashchange',queue);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
})();