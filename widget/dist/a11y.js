(function(){"use strict";const l={fontSize:0,highContrast:!1,grayscale:!1,highlightLinks:!1,bigCursor:!1},c="bugbox_a11y",d=["100%","120%","145%"];class b{constructor(){this.listeners=new Set,this.state=this.load()}load(){try{const t=localStorage.getItem(c);return t?{...l,...JSON.parse(t)}:{...l}}catch(t){return{...l}}}persist(){try{localStorage.setItem(c,JSON.stringify(this.state))}catch(t){}}get(){return this.state}update(t){this.state={...this.state,...t},this.persist(),this.emit()}reset(){this.state={...l};try{localStorage.removeItem(c)}catch(t){}this.emit()}subscribe(t){return this.listeners.add(t),()=>this.listeners.delete(t)}emit(){for(const t of this.listeners)t(this.state)}}function p(s){var a;const t=document.documentElement;t.style.setProperty("--a11y-font-scale",(a=d[s.fontSize])!=null?a:d[0]),t.classList.toggle("a11y-high-contrast",s.highContrast),t.classList.toggle("a11y-grayscale",s.grayscale),t.classList.toggle("a11y-highlight-links",s.highlightLinks),t.classList.toggle("a11y-big-cursor",s.bigCursor)}function y(){return`
#a11y-widget-root, #a11y-widget-root * { box-sizing: border-box; }
#a11y-widget-root {
  font-family: system-ui, "Segoe UI", Arial, "Alef", "Heebo", sans-serif;
  direction: rtl;
}

/* ---- Trigger button — black circle, ISA wheelchair icon, bottom-left ---- */
.a11y-trigger {
  position: fixed; left: 32px; bottom: 24px; z-index: 2147483646;
  width: 40px; height: 40px; border-radius: 9999px;
  background: #000; color: #fff; border: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,.3);
  transition: transform .2s ease, background .2s ease;
}
.a11y-trigger:hover { background: #1f2937; transform: scale(1.1); }
.a11y-trigger:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.a11y-trigger svg { width: 20px; height: 20px; fill: currentColor; }
@media (max-width: 768px) { .a11y-trigger { bottom: 80px; } }

/* ---- Panel ---- */
.a11y-panel {
  position: fixed; left: 16px; bottom: 80px; z-index: 2147483647;
  width: 288px; max-width: calc(100vw - 32px);
  background: #111; border: 1px solid #333; border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,.6); overflow: hidden;
  color: #fff; opacity: 0; visibility: hidden; transform: translateY(8px);
  transition: opacity .15s ease, transform .15s ease, visibility .15s;
}
.a11y-panel[data-open="true"] { opacity: 1; visibility: visible; transform: translateY(0); }
@media (max-width: 768px) { .a11y-panel { bottom: 136px; } }

.a11y-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #000; border-bottom: 1px solid #333;
}
.a11y-header-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; }
.a11y-header-title svg { width: 20px; height: 20px; fill: #fff; }
.a11y-close { background: transparent; border: 0; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 9999px; line-height: 0; }
.a11y-close:hover { color: #fff; }
.a11y-close:focus-visible { outline: 2px solid #fff; }
.a11y-close svg { width: 16px; height: 16px; }

.a11y-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.a11y-section-label { font-size: 12px; font-weight: 600; color: #9ca3af; margin: 0 0 8px; }

/* Font-size buttons */
.a11y-font-row { display: flex; gap: 8px; }
.a11y-font-btn {
  flex: 1; height: 44px; border-radius: 12px; font-weight: 700; cursor: pointer;
  border: 2px solid #4b5563; background: transparent; color: #d1d5db; transition: all .15s ease;
}
.a11y-font-btn:hover { border-color: #9ca3af; }
.a11y-font-btn[aria-pressed="true"] { border-color: #fff; background: #fff; color: #000; }
.a11y-font-btn:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }

/* Toggle rows */
.a11y-toggle {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: 12px; border: 1px solid #374151;
  background: transparent; color: #9ca3af; cursor: pointer; transition: all .15s ease;
}
.a11y-toggle:hover { border-color: #6b7280; color: #e5e7eb; }
.a11y-toggle[aria-pressed="true"] { border-color: #fff; background: rgba(255,255,255,.1); color: #fff; }
.a11y-toggle:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.a11y-toggle-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
.a11y-switch { position: relative; width: 36px; height: 20px; border-radius: 9999px; background: #4b5563; transition: background .15s ease; flex: 0 0 auto; }
.a11y-toggle[aria-pressed="true"] .a11y-switch { background: #fff; }
.a11y-switch::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 9999px; background: #d1d5db; box-shadow: 0 1px 2px rgba(0,0,0,.4); transition: left .15s ease, background .15s ease;
}
.a11y-toggle[aria-pressed="true"] .a11y-switch::after { left: 18px; background: #000; }

/* Reset */
.a11y-reset {
  width: 100%; height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px;
  border-radius: 12px; border: 1px solid #374151; background: transparent;
  color: #9ca3af; font-size: 12px; font-weight: 500; cursor: pointer; transition: all .15s ease;
}
.a11y-reset:hover { border-color: #6b7280; color: #e5e7eb; }
.a11y-reset:focus-visible { outline: 2px solid #fff; }
.a11y-reset svg { width: 14px; height: 14px; }

.a11y-sr-only { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* =========================================================================
   FEATURE CSS — identical to the bugbox index.css a11y-* effects.
   ========================================================================= */
:root { --a11y-font-scale: 100%; }
html { font-size: var(--a11y-font-scale) !important; }

html.a11y-high-contrast * {
  background: #000 !important;
  color: #fff !important;
  border-color: #fff !important;
  box-shadow: none !important;
}
html.a11y-high-contrast img,
html.a11y-high-contrast video { filter: brightness(.85) contrast(1.2) !important; }
html.a11y-high-contrast a,
html.a11y-high-contrast button { color: #ffff00 !important; }

html.a11y-grayscale * { filter: grayscale(100%) !important; }

html.a11y-highlight-links a {
  outline: 3px solid #2563eb !important;
  background: #dbeafe !important;
  color: #1e3a8a !important;
  border-radius: 3px; padding: 0 2px;
}

html.a11y-big-cursor,
html.a11y-big-cursor * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M6 2l26 15-11 2.5-6 11z' fill='black' stroke='white' stroke-width='2'/%3E%3C/svg%3E") 0 0, auto !important;
}

/* Prevent iOS Safari zoom on input focus */
@media (max-width: 768px) { input, select, textarea { font-size: 16px !important; } }
`}const o={triggerLabel:"פתח תפריט נגישות",panelTitle:"נגישות",close:"סגירה",reset:"איפוס הגדרות",fontSizeGroup:"גודל גופן",highContrast:"ניגודיות גבוהה",grayscale:"גווני אפור",highlightLinks:"הדגשת קישורים",bigCursor:"סמן גדול",on:"מופעל",off:"כבוי",resetDone:"כל ההגדרות אופסו"},h='<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="3.5" r="1.75"/><path d="M10 7.5v5.5l2.5 2.5H17v2h-5.2L9 14.7V7.5H10z"/><path d="M9.5 7.5H13l1.5 4H17v2h-3.5L12 9.5H9.5V7.5z"/><path d="M7 17.5A5 5 0 1 0 17 17.5" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"/></svg>';function x(s){const t=document.createElement("button");return t.type="button",t.className="a11y-trigger",t.setAttribute("aria-haspopup","true"),t.setAttribute("aria-expanded","false"),t.setAttribute("aria-label",o.triggerLabel),t.innerHTML=h,t.addEventListener("click",s),t}const m='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',v='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',w=[{lvl:0,label:"A",size:"13px"},{lvl:1,label:"A+",size:"16px"},{lvl:2,label:"A++",size:"20px"}],k=[{key:"highContrast",label:o.highContrast,icon:"◑"},{key:"grayscale",label:o.grayscale,icon:"◐"},{key:"highlightLinks",label:o.highlightLinks,icon:"🔗"},{key:"bigCursor",label:o.bigCursor,icon:"↖"}];class S{constructor(t,a){this.store=t,this.trigger=a,this.open=!1,this.lastFocus=null,this.onClick=e=>{const i=e.target.closest("[data-act]");if(!i)return;const r=this.store.get();switch(i.dataset.act){case"close":this.close();break;case"font":this.store.update({fontSize:Number(i.dataset.lvl)});break;case"toggle":{const n=i.dataset.key,u=!r[n];this.store.update({[n]:u}),this.announce(u?o.on:o.off);break}case"reset":this.store.reset(),this.announce(o.resetDone);break}},this.onKeydown=e=>{if(e.key==="Escape"){this.close();return}if(e.key!=="Tab")return;const i=this.focusable();if(!i.length)return;const r=i[0],n=i[i.length-1];e.shiftKey&&document.activeElement===r?(e.preventDefault(),n.focus()):!e.shiftKey&&document.activeElement===n&&(e.preventDefault(),r.focus())},this.el=document.createElement("div"),this.el.className="a11y-panel",this.el.setAttribute("role","dialog"),this.el.setAttribute("aria-modal","true"),this.el.setAttribute("aria-label",o.panelTitle),this.el.setAttribute("data-open","false"),this.el.innerHTML=this.render(),this.live=this.el.querySelector(".a11y-live"),this.el.addEventListener("click",this.onClick),this.el.addEventListener("keydown",this.onKeydown),this.store.subscribe(e=>this.sync(e)),this.sync(this.store.get())}render(){const t=w.map(e=>`<button type="button" class="a11y-font-btn" data-act="font" data-lvl="${e.lvl}" style="font-size:${e.size}" aria-pressed="false">${e.label}</button>`).join(""),a=k.map(e=>`
      <button type="button" class="a11y-toggle" data-act="toggle" data-key="${String(e.key)}" aria-pressed="false">
        <span class="a11y-toggle-label"><span aria-hidden="true">${e.icon}</span><span>${e.label}</span></span>
        <span class="a11y-switch" aria-hidden="true"></span>
      </button>`).join("");return`
      <div class="a11y-header">
        <span class="a11y-header-title">${h}<span>${o.panelTitle}</span></span>
        <button type="button" class="a11y-close" data-act="close" aria-label="${o.close}">${m}</button>
      </div>
      <div class="a11y-body">
        <div>
          <p class="a11y-section-label">${o.fontSizeGroup}</p>
          <div class="a11y-font-row">${t}</div>
        </div>
        ${a}
        <button type="button" class="a11y-reset" data-act="reset">${v}<span>${o.reset}</span></button>
        <div class="a11y-sr-only a11y-live" role="status" aria-live="polite"></div>
      </div>
    `}focusable(){return Array.from(this.el.querySelectorAll("button")).filter(t=>t.offsetParent!==null)}sync(t){this.el.querySelectorAll("[data-act='font']").forEach(a=>{a.setAttribute("aria-pressed",String(Number(a.dataset.lvl)===t.fontSize))}),this.el.querySelectorAll("[data-act='toggle']").forEach(a=>{a.setAttribute("aria-pressed",String(!!t[a.dataset.key]))})}announce(t){this.live.textContent="",window.requestAnimationFrame(()=>this.live.textContent=t)}toggle(){this.open?this.close():this.show()}show(){var t;this.open=!0,this.lastFocus=document.activeElement,this.el.setAttribute("data-open","true"),this.trigger.setAttribute("aria-expanded","true"),(t=this.focusable()[0])==null||t.focus()}close(){var t,a;this.open=!1,this.el.setAttribute("data-open","false"),this.trigger.setAttribute("aria-expanded","false"),(a=(t=this.lastFocus)==null?void 0:t.focus)==null||a.call(t)}}const g="__a11yWidgetLoaded";function f(){const s=window;if(s[g])return;s[g]=!0;const t=new b,a=document.createElement("style");a.id="a11y-widget-styles",a.textContent=y(),document.head.appendChild(a),p(t.get()),t.subscribe(p);const e=document.createElement("div");e.id="a11y-widget-root";const i=x(()=>r.toggle()),r=new S(t,i);e.append(i,r.el),document.body.appendChild(e),s.A11yWidget={open:()=>r.show(),close:()=>r.close(),reset:()=>t.reset()}}document.body?f():document.addEventListener("DOMContentLoaded",f,{once:!0})})();
