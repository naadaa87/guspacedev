# -*- coding: utf-8 -*-
import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_insights import write, SITE
from content import POSTS
from faq import FAQ

ORG = {
    "@type": "Organization", "name": "주식회사 지유공간개발",
    "url": SITE + "/", "logo": SITE + "/favicon.svg"
}


def strip(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html)).strip()


def minutes(p):
    """한국어 분당 약 500자 기준 읽는 시간."""
    extra = ''.join(q + a for q, a in FAQ.get(p['slug'], []))
    chars = len(strip(p['lede'] + p['body'] + extra).replace(' ', ''))
    return max(3, round(chars / 500)), chars


# ---------- 개별 아티클 ----------
for p in POSTS:
    p['read'], p['chars'] = (lambda t: (f'{t[0]}분', t[1]))(minutes(p))
    path = f"insights/{p['slug']}.html"
    rel = ''.join(
        f'<li><a class="text-link" href="../{h}">{t}</a></li>' for h, t in p['related'])
    qa = FAQ.get(p['slug'], [])
    faq_html = ''
    if qa:
        items = ''.join(
            f'<details><summary>{q}</summary><div class="a">{a}</div></details>' for q, a in qa)
        faq_html = f'''
<section class="section alt" id="faq">
  <div class="wrap">
    <div class="section-head"><h2>자주 묻는 질문</h2></div>
    <div class="faq">{items}</div>
    <p class="note mt-3">여기서 다루지 못한 내용은 <a class="text-link" href="../contact.html">상담문의</a>로 알려주시면 건물 상황에 맞춰 정리해 드립니다.</p>
  </div>
</section>'''
    main = f'''<section class="page-hero">
  <div class="wrap">
    <div class="crumb"><a href="../index.html">홈</a> › <a href="../insights.html">인사이트</a> › <span>{p['cat']}</span></div>
    <h1>{p['h1']}</h1>
    <p class="lede">{p['lede']}</p>
    <div class="post-meta"><span>{p['date'].replace('-', '. ')}</span><span>읽는 데 {p['read']}</span><span>지유공간개발 편집</span></div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="post">
      <article class="post-body">{p['body']}</article>
      <aside class="post-aside">
        <h4>함께 보면 좋은 글</h4>
        <ul>{rel}</ul>
        <div class="ask">
          <p>건물 주소와 층별 현황만 알려주셔도 첫 상담이 가능합니다.</p>
          <a class="btn btn-point btn-sm" href="../contact.html">상담 신청하기</a>
        </div>
      </aside>
    </div>
  </div>
</section>{faq_html}'''
    ld = [
        {"@context": "https://schema.org", "@type": "Article",
         "headline": p['title'], "description": p['desc'],
         "datePublished": p['date'], "dateModified": p['date'],
         "inLanguage": "ko-KR",
         "image": f"{SITE}/assets/img/{p['og']}.webp",
         "author": ORG, "publisher": ORG,
         "mainEntityOfPage": {"@type": "WebPage", "@id": f"{SITE}/{path}"},
         "articleSection": p['cat'], "keywords": p['keywords'],
         "wordCount": p['chars']},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "홈", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "인사이트", "item": SITE + "/insights.html"},
            {"@type": "ListItem", "position": 3, "name": p['h1'], "item": f"{SITE}/{path}"}]},
    ]
    if qa:
        ld.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qa]})
    n = write(path, f"{p['title']} | 지유공간개발", p['desc'], main, 1, p['og'], ld, p['keywords'])
    print(f"  {path}  본문 {p['chars']:,}자 · {p['read']} / 파일 {n // 1024}KB")

# ---------- 목록 ----------
items = ''.join(
    f'''<li><a href="insights/{p['slug']}.html">
      <span class="cat">{p['cat']}</span>
      <span><h3>{p['h1']}</h3><p>{p['desc']}</p><span class="meta">{p['date'].replace('-', '. ')} · 읽는 데 {p['read']}</span></span>
    </a></li>''' for p in POSTS)

main = f'''<section class="page-hero">
  <div class="wrap">
    <div class="crumb"><a href="index.html">홈</a> › <span>인사이트</span></div>
    <h1>건물을 가진 분들이 실제로 묻는 것들</h1>
    <p class="lede">관리 현장과 공실 상담에서 반복해서 나오는 질문을 정리했습니다. 건물관리 견적을 비교하는 법, 관리 인원을 정하는 기준, 공실의 원인과 해결 순서, 임대차 만기 관리, 관리비 산정, 노후 건물 공사 순서까지 — 실제 업무에서 쓰는 기준 그대로 적었습니다.</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <ul class="post-list">{items}</ul>
    <p class="note mt-6">여기에 없는 내용이라도 건물 상황을 알려주시면 정리해 드립니다. 일반적인 질문은 <a class="text-link" href="process.html#faq">자주 묻는 질문</a>에도 모아 두었습니다.</p>
  </div>
</section>'''

ld = [
    {"@context": "https://schema.org", "@type": "CollectionPage",
     "name": "인사이트 | 지유공간개발", "url": SITE + "/insights.html", "inLanguage": "ko-KR",
     "description": "건물관리·공실·임대차·관리비·노후건물 개선에 대해 지유공간개발이 실무에서 쓰는 기준을 정리한 글 모음입니다.",
     "publisher": ORG,
     "mainEntity": {"@type": "ItemList", "itemListElement": [
         {"@type": "ListItem", "position": i + 1, "name": p['h1'],
          "url": f"{SITE}/insights/{p['slug']}.html"} for i, p in enumerate(POSTS)]}},
    {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "홈", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "인사이트", "item": SITE + "/insights.html"}]},
]
n = write('insights.html', '인사이트 — 건물관리·공실·임대차 실무 자료 | 지유공간개발',
          '건물관리 위탁 견적서 읽는 법, 관리 인력 산정 기준, 공실이 길어지는 이유와 해결 순서, 상가 임대차 만기 관리, 관리비 산정과 부과 기준, 노후 건물 공사 우선순위 — 지유공간개발이 실무에서 쓰는 기준을 정리했습니다.',
          main, 0, 'dev-design-meeting', ld,
          '건물관리, 시설관리, 공실 해결, 상가 임대차, 관리비 산정, 노후건물 개선, 건물 자산관리')
print(f"  insights.html  {n // 1024}KB")
print(f"\n총 {len(POSTS)}편 + 목록 1개 생성")
