"""Scripted usability/accessibility audit of the Task-Fit Classifier interface (run with the language model switched off).
Setup: pip install playwright && playwright install chromium   |   Run from the repository root: python3 scripts/usability_audit.py
Writes eval-results/usability.json"""
import json, subprocess, time, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))  # repository root (this file lives in scripts/)
env = dict(os.environ, PORT="4107", OLLAMA_PORT="9")
srv = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
srv.stdout.readline()
URL = "http://127.0.0.1:4107/"
out = {}

CONTRAST_JS = """
() => {
  function parse(c){const m=c.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p=m[1].split(',').map(s=>parseFloat(s)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function lum(c){const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
  function bgOf(el){let e=el; let layers=[]; while(e){const c=parse(getComputedStyle(e).backgroundColor); if(c&&c.a>0){layers.push(c); if(c.a>=1)break;} e=e.parentElement;} let base={r:255,g:255,b:255}; for(let i=layers.length-1;i>=0;i--){const l=layers[i]; base={r:l.r*l.a+base.r*(1-l.a),g:l.g*l.a+base.g*(1-l.a),b:l.b*l.a+base.b*(1-l.a)};} return base;}
  const res=[]; const seen=new Set();
  document.querySelectorAll('body *').forEach(el=>{
    if(!el.offsetParent && getComputedStyle(el).position!=='fixed') return;
    const hasText=[...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim().length>0);
    if(!hasText) return;
    const cs=getComputedStyle(el); const fg=parse(cs.color); if(!fg) return;
    const bg=bgOf(el); const a=fg.a; const fgc={r:fg.r*a+bg.r*(1-a),g:fg.g*a+bg.g*(1-a),b:fg.b*a+bg.b*(1-a)};
    const L1=lum(fgc), L2=lum(bg); const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    const size=parseFloat(cs.fontSize); const bold=parseInt(cs.fontWeight)>=700; const large=size>=24||(size>=18.66&&bold);
    const need=large?3:4.5;
    const key=el.tagName+'|'+cs.color+'|'+JSON.stringify(bg);
    if(seen.has(key)) return; seen.add(key);
    res.push({tag:el.tagName.toLowerCase(),cls:el.className||'',text:el.textContent.trim().slice(0,40),ratio:+ratio.toFixed(2),need,pass:ratio>=need});
  });
  return res;
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(URL); pg.wait_for_load_state("networkidle")

    out["page"] = pg.evaluate("""() => ({
        lang: document.documentElement.lang, title: document.title,
        viewportMeta: !!document.querySelector('meta[name=viewport]'),
        h1: document.querySelectorAll('h1').length,
        landmarks: {header: document.querySelectorAll('header').length, nav: document.querySelectorAll('nav').length, main: document.querySelectorAll('main').length, footer: document.querySelectorAll('footer').length},
    })""")

    out["forms"] = pg.evaluate("""() => {
        const ctl=[...document.querySelectorAll('input:not([type=radio]),select,textarea')];
        const labelled=ctl.filter(c=>c.id && document.querySelector('label[for="'+c.id+'"]'));
        const radios=[...document.querySelectorAll('input[type=radio]')];
        const radioInLabel=radios.filter(r=>r.closest('label'));
        const fs=[...document.querySelectorAll('fieldset')];
        return {textControls:ctl.length, textControlsWithLabel:labelled.length, radios:radios.length, radiosWrappedInLabel:radioInLabel.length,
                fieldsets:fs.length, fieldsetsWithLegend:fs.filter(f=>f.querySelector('legend')).length,
                requiredControls:document.querySelectorAll('[required]').length,
                placeholders:document.querySelectorAll('[placeholder]').length};
    }""")

    out["aria"] = pg.evaluate("""() => ({
        elementsWithRole: document.querySelectorAll('[role]').length,
        elementsWithAriaAttr: [...document.querySelectorAll('*')].filter(e=>[...e.attributes].some(a=>a.name.startsWith('aria-'))).length,
        ariaLiveRegions: document.querySelectorAll('[aria-live],[role=alert],[role=status]').length,
        tabButtons: document.querySelectorAll('.tab-btn').length,
        tabButtonsWithRoleTab: document.querySelectorAll('.tab-btn[role=tab]').length,
        errorParagraphs: document.querySelectorAll('.error').length,
        errorParagraphsWithAlert: document.querySelectorAll('.error[role=alert]').length,
        imgs: document.querySelectorAll('img').length, imgsWithoutAlt: document.querySelectorAll('img:not([alt])').length,
    })""")

    # focus visibility
    focus = pg.evaluate("""() => {
        const el=document.getElementById('emp-task'); const before=getComputedStyle(el);
        const b={outline:before.outlineStyle+' '+before.outlineWidth, shadow:before.boxShadow, border:before.borderColor};
        el.focus(); const after=getComputedStyle(el);
        const a={outline:after.outlineStyle+' '+after.outlineWidth, shadow:after.boxShadow, border:after.borderColor};
        const btn=document.querySelector('button[type=submit]'); btn.focus(); const bs=getComputedStyle(btn);
        return {inputBefore:b,inputAfter:a,inputFocusChanged:JSON.stringify(a)!==JSON.stringify(b), buttonFocusOutline:bs.outlineStyle+' '+bs.outlineWidth, buttonFocusShadow:bs.boxShadow};
    }""")
    out["focus"] = focus

    # keyboard reachability
    seen=set(); order=[]
    pg.evaluate("document.activeElement && document.activeElement.blur()")
    for i in range(60):
        pg.keyboard.press("Tab")
        d = pg.evaluate("(()=>{const e=document.activeElement; return e? (e.tagName+'#'+(e.id||'')+'.'+(e.className||'')+'['+(e.name||'')+'='+(e.value||'').slice(0,12)+'|'+(e.textContent||'').trim().slice(0,18)+']') : ''})()")
        if d in seen: break
        seen.add(d); order.append(d)
    out["keyboard"] = {"distinctFocusStopsInFirstPass": len(order), "firstStops": order[:8]}
    # activate a tab by keyboard
    pg.focus(".tab-btn[data-tab=policy]"); pg.keyboard.press("Enter")
    out["keyboard"]["tabActivatedByEnter"] = pg.evaluate("document.getElementById('tab-policy').classList.contains('active')")
    pg.click(".tab-btn[data-tab=employee]")

    # contrast
    cr = pg.evaluate(CONTRAST_JS)
    fails = [c for c in cr if not c["pass"]]
    out["contrast"] = {"textStylesChecked": len(cr), "failingAA": len(fails), "worst": sorted(fails, key=lambda c: c["ratio"])[:6]}

    # native validation
    out["validation"] = pg.evaluate("""() => { const f=document.getElementById('employee-form'); return {emptyFormValid: f.checkValidity(), invalidFields: [...f.querySelectorAll(':invalid')].length}; }""")

    # task flows (fallback mode, model deliberately unreachable)
    def flow_employee():
        pg.click(".tab-btn[data-tab=employee]")
        t=time.time(); pg.fill("#emp-task","Generate product images"); pg.fill("#emp-tool","Personal AI image generator")
        pg.check("#tab-employee input[name=toolFits][value=false]"); pg.check("#tab-employee input[name=disclosed][value=false]")
        pg.click("#employee-form button[type=submit]"); pg.wait_for_selector("#employee-results:not([hidden])", timeout=8000)
        return {"actions":5,"ms":round((time.time()-t)*1000), "badge": pg.inner_text("#employee-source-badge")[:60], "quadrantShown": pg.inner_text("#employee-result-quadrant")[:40]}
    def flow_policy():
        pg.click(".tab-btn[data-tab=policy]")
        t=time.time(); pg.fill("#pol-task","Draft client analysis"); pg.fill("#pol-tool","Team AI assistant")
        pg.check("#tab-policy input[name=toolFits][value=false]"); pg.check("#tab-policy input[name=disclosed][value=true]")
        pg.click("#policy-form button[type=submit]"); pg.wait_for_selector("#policy-results:not([hidden])", timeout=8000)
        return {"actions":5,"ms":round((time.time()-t)*1000), "baselineBadge": pg.inner_text("#policy-baseline-badge")[:60], "guardrailedBadge": pg.inner_text("#policy-guardrailed-badge")[:60]}
    def flow_crossorg():
        pg.click(".tab-btn[data-tab=crossorg]")
        t=time.time(); pg.fill("#org-task","Generate product images"); pg.fill("#org-tool","Personal AI image generator")
        pg.check("#tab-crossorg input[name=toolFits][value=false]"); pg.check("#tab-crossorg input[name=disclosed][value=false]")
        pg.select_option("#org-select", index=1)
        pg.click("#crossorg-form button[type=submit]"); pg.wait_for_selector("#crossorg-results:not([hidden])", timeout=8000)
        return {"actions":6,"ms":round((time.time()-t)*1000), "heading": pg.inner_text("#crossorg-org-heading")[:60]}
    def flow_adv():
        pg.click(".tab-btn[data-tab=adversarial]")
        t=time.time(); pg.click("#adversarial-prompt-list button >> nth=1"); pg.wait_for_selector("#adversarial-results:not([hidden])", timeout=8000)
        return {"actions":1,"ms":round((time.time()-t)*1000), "badge": pg.inner_text("#adversarial-source-badge")[:60]}
    out["flows"] = {"UC1": flow_employee(), "UC2": flow_policy(), "UC3": flow_crossorg(), "UC4": flow_adv()}

    # mobile
    pg.set_viewport_size({"width": 375, "height": 667}); pg.click(".tab-btn[data-tab=employee]")
    out["mobile375"] = pg.evaluate("""() => { const t=[...document.querySelectorAll('button,input,select')].filter(e=>e.offsetParent);
        const sizes=t.map(e=>{const host=(e.type==='radio'&&e.closest('label'))?e.closest('label'):e; const r=host.getBoundingClientRect(); return Math.min(r.width,r.height)});
        const wide=[...document.querySelectorAll('body *')].filter(e=>e.offsetParent && e.getBoundingClientRect().right>window.innerWidth+1).map(e=>e.tagName.toLowerCase()+'.'+(e.className||'')+'#'+(e.id||'')).slice(0,6);
        return {horizontalOverflow: document.documentElement.scrollWidth>window.innerWidth, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
                interactiveVisible:t.length, minTargetPx:Math.round(Math.min(...sizes)), overflowingElements: wide, under24px: sizes.filter(s=>s<24).length, under44px: sizes.filter(s=>s<44).length}; }""")
    b.close()

srv.terminate()
os.makedirs(os.path.join(ROOT, "eval-results"), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, "eval-results", "usability.json"), "w"), indent=2)
print(json.dumps(out, indent=2))
