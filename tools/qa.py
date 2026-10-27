import http.server, threading, socketserver, os, sys, glob
from playwright.sync_api import sync_playwright
ROOT='/home/claude/guspacedev'
SHOT='/tmp/claude-0/-home-claude/68a847d7-c3cc-5b42-a1cc-b1c7555fa5dc/scratchpad/shots'
os.chdir(ROOT)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',8801),Q)
threading.Thread(target=srv.serve_forever,daemon=True).start()
pages=[f for f in sorted(glob.glob('**/*.html',recursive=True)) if not f.startswith('naver9935')]
problems=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for vp,tag in (({'width':1440,'height':900},'d'),({'width':390,'height':844},'m')):
        ctx=b.new_context(viewport=vp); pg=ctx.new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        for path in pages:
            pg.goto(f'http://127.0.0.1:8801/{path}', wait_until='networkidle')
            pg.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
            try: pg.wait_for_function("Array.from(document.images).every(i=>i.complete)", timeout=15000)
            except Exception: pass
            broken=pg.evaluate("Array.from(document.images).filter(i=>i.naturalWidth===0).map(i=>i.getAttribute('src'))")
            ov=pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            links=pg.evaluate("Array.from(document.querySelectorAll('a[href]')).map(a=>a.getAttribute('href')).filter(h=>!/^(https?:|#|mailto:|tel:)/.test(h))")
            base=os.path.dirname(path); miss=[]
            for h in set(links):
                t=h.split('#')[0]
                tgt=os.path.normpath(os.path.join(base,t)) if t else path
                if not os.path.exists(tgt): miss.append(h)
            if broken or ov or miss: problems.append((tag,path,broken,ov,miss))
            pg.screenshot(path=f'{SHOT}/{tag}_{path.replace("/","_")}.png', full_page=True)
        if errs: problems.append((tag,'JS',errs[:3]))
        ctx.close()
    b.close()
srv.shutdown()
print('문제:', problems if problems else '없음  (페이지 %d × 2뷰포트)'%len(pages))
