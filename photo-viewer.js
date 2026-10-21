/* Shared overlay history and image gestures. Loaded before app.js. */
(() => {
  const layers = [];
  let serial = 0, pendingBack = 0;
  window.FFH_OVERLAY = (element, dispose = () => element.remove(), options = {}) => {
    const id = 'photo-' + (++serial);
    history.pushState({...history.state, ffhOverlay: id}, '', location.href);
    const entry = {id, element, dispose, options, state: {...history.state}};
    layers.push(entry);
    return () => {
      const index = layers.indexOf(entry);
      if (index < 0) return;
      layers.splice(index, 1);
      dispose();
      if (history.state?.ffhOverlay === id) { pendingBack++; history.back(); }
    };
  };
  window.addEventListener('popstate', event => {
    if (pendingBack) { pendingBack--; event.stopImmediatePropagation(); return; }
    const top = layers.at(-1);
    if (top && event.state?.ffhOverlay !== top.id) {
      if(top.options.closeOnly&&top.element.isConnected){history.pushState(top.state,'',location.href);top.options.onBack?.();}else{layers.pop();top.dispose();}event.stopImmediatePropagation();
    }
  }, true);
  window.FFH_OPEN_IMAGE = source => {
    const overlay = document.createElement('div');
    overlay.className = 'ffPhotoViewer';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Photo viewer');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = '<div class="ffPhotoToolbar"><button type="button" data-action="close" aria-label="Close photo">×</button><button type="button" data-action="out" aria-label="Zoom out">−</button><output>100%</output><button type="button" data-action="in" aria-label="Zoom in">+</button><button type="button" data-action="reset">Reset</button></div><div class="ffPhotoStage"><img draggable="false" alt="Enlarged photo"></div><p class="ffPhotoHint">Pinch to zoom · Drag to move · Double tap to zoom</p>';
    const image = overlay.querySelector('img'), stage = overlay.querySelector('.ffPhotoStage');
    image.src = source;
    document.body.appendChild(overlay);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = window.FFH_OVERLAY(overlay, () => { overlay.remove(); document.body.style.overflow = previousOverflow; });
    let scale = 1, x = 0, y = 0, gesture = null, lastTap = 0;
    const points = new Map();
    const center = () => { const r = stage.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; };
    const render = () => {
      const limitX = Math.max(0, (image.clientWidth * scale - stage.clientWidth) / 2);
      const limitY = Math.max(0, (image.clientHeight * scale - stage.clientHeight) / 2);
      x = Math.max(-limitX, Math.min(limitX, x)); y = Math.max(-limitY, Math.min(limitY, y));
      image.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
      overlay.querySelector('output').value = Math.round(scale * 100) + '%';
    };
    const zoom = (value, anchor = center()) => {
      const next = Math.max(1, Math.min(6, value)), c = center(), ratio = next / scale;
      x = (x - anchor.x + c.x) * ratio + anchor.x - c.x;
      y = (y - anchor.y + c.y) * ratio + anchor.y - c.y;
      scale = next; render();
    };
    const snapshot = () => {
      const p = [...points.values()];
      gesture = p.length >= 2 ? {distance:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),scale,x,y,mid:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}} : p.length ? {point:p[0],x,y} : null;
    };
    stage.onpointerdown = e => {e.preventDefault();stage.setPointerCapture?.(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});snapshot();};
    stage.onpointermove = e => {
      if (!points.has(e.pointerId)) return;
      e.preventDefault(); points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      const p = [...points.values()];
      if (p.length >= 2 && gesture?.distance) {
        const mid={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}, c=center();
        scale=Math.max(1,Math.min(6,gesture.scale*Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)/gesture.distance));
        const ratio=scale/gesture.scale;
        x=(gesture.x-gesture.mid.x+c.x)*ratio+mid.x-c.x;
        y=(gesture.y-gesture.mid.y+c.y)*ratio+mid.y-c.y;
      } else if (p.length === 1 && gesture?.point) {x=gesture.x+p[0].x-gesture.point.x;y=gesture.y+p[0].y-gesture.point.y;}
      render();
    };
    stage.onpointerup = e => {
      const tap = points.size===1 && gesture?.point && Math.hypot(e.clientX-gesture.point.x,e.clientY-gesture.point.y)<8;
      points.delete(e.pointerId);snapshot();
      if(tap){const now=Date.now();if(now-lastTap<300){zoom(scale>1?1:2.5,{x:e.clientX,y:e.clientY});lastTap=0;}else lastTap=now;}
    };
    stage.onpointercancel = e => {points.delete(e.pointerId);snapshot();lastTap=0;};
    stage.onwheel = e => {e.preventDefault();zoom(scale*(e.deltaY<0?1.15:1/1.15),{x:e.clientX,y:e.clientY});};
    overlay.querySelector('[data-action=close]').onclick=close;
    overlay.querySelector('[data-action=in]').onclick=()=>zoom(scale*1.4);
    overlay.querySelector('[data-action=out]').onclick=()=>zoom(scale/1.4);
    overlay.querySelector('[data-action=reset]').onclick=()=>{x=y=0;zoom(1);};
    image.onload=render;
  };
  document.addEventListener('click', e => {
    const im=e.target.closest('.zoomable,.ffSkuModalHero img,.ffBulkPhoto,#ffSkuPhotoPreview');
    if(!im?.src)return;
    e.preventDefault();e.stopPropagation();window.FFH_OPEN_IMAGE(im.src);
  }, true);
  const style=document.createElement('style');
  style.textContent='.ffPhotoViewer{position:fixed;inset:0;z-index:30000;background:#05080bf5;display:flex;flex-direction:column;color:white}.ffPhotoToolbar{display:flex;align-items:center;justify-content:center;gap:12px;padding:12px;padding-top:max(12px,env(safe-area-inset-top));flex-shrink:0}.ffPhotoToolbar button{min-width:42px;min-height:44px;background:#19232e;color:white;border:1px solid #e99c54;border-radius:10px;font-size:20px}.ffPhotoToolbar output{min-width:52px;text-align:center}.ffPhotoStage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;user-select:none}.ffPhotoStage img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;transform-origin:center;pointer-events:none}.ffPhotoHint{text-align:center;font-size:12px;padding:8px;color:#d8dce0}.ffBulkPhoto{width:100px;height:100px;object-fit:contain;border-radius:50%;cursor:zoom-in;border:1px solid #e99c54}';
  document.head.appendChild(style);
})();
