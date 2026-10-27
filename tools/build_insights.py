# -*- coding: utf-8 -*-
"""인사이트(자료실) 페이지 생성기.
기존 페이지에서 상단/하단 템플릿을 그대로 떼어 와 새 페이지를 만든다.
"""
import os, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://guspace.kr'


def split(path):
    s = open(os.path.join(ROOT, path), encoding='utf-8').read()
    meta = s[s.index('<meta name="naver-site-verification"'):s.index('<title>')]
    headtail = s[s.index('<meta property="og:locale"'):s.index('</head>')]
    header = s[s.index('<body>'):s.index('<main id="main">')].replace(' aria-current="page"', '')
    footer = s[s.index('</main>') + len('</main>'):]
    return meta, headtail, header, footer


TPL = {0: split('business.html'), 1: split('business/fm.html')}


def write(path, title, desc, main, depth, og_img, ld=None, keywords=''):
    meta, headtail, header, footer = TPL[depth]
    url = f'{SITE}/{path}'
    kw = f'\n<meta name="keywords" content="{keywords}">' if keywords else ''
    ldblock = ''
    if ld:
        ldblock = '\n' + '\n'.join(
            '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + '</script>'
            for d in ld)
    html = f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{meta}<title>{title}</title>
<meta name="description" content="{desc}">{kw}
<meta property="og:type" content="{'website' if depth == 0 else 'article'}">
<meta property="og:site_name" content="지유공간개발">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}/assets/img/{og_img}.webp">
<meta property="og:url" content="{url}">
<link rel="canonical" href="{url}">
{headtail}{ldblock}
</head>
{header}<main id="main">
{main}
</main>
{footer}'''
    out = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(out) or ROOT, exist_ok=True)
    open(out, 'w', encoding='utf-8').write(html)
    return len(html)
