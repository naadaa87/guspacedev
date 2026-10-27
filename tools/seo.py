# -*- coding: utf-8 -*-
"""검색엔진 최적화 일괄 적용 — 구조화 데이터, 타이틀·설명, 사이트맵, robots."""
import os, re, json, glob, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://guspace.kr'
os.chdir(ROOT)

ORG_ID = SITE + '/#organization'
ORG = {
    "@context": "https://schema.org",
    "@type": ["Organization", "ProfessionalService"],
    "@id": ORG_ID,
    "name": "주식회사 지유공간개발",
    "alternateName": ["지유공간개발", "GU SPACE DEVELOPMENT", "GU GONGGAN GAEBAL CO., LTD."],
    "url": SITE + "/",
    "logo": {"@type": "ImageObject", "url": SITE + "/favicon.svg"},
    "image": SITE + "/assets/img/dev-shell-to-lounge.webp",
    "description": "시설관리(FM)와 자산관리(PM)로 건물을 시스템으로 관리하고, 공실과 임차사를 관리하며, 비어 있는 공간을 직접 개발해 건물의 자산가치를 올리는 건물관리·공실 솔루션 기업입니다.",
    "foundingDate": "2026-09-02",
    "taxID": "757-86-04159",
    "vatID": "757-86-04159",
    "founder": {"@type": "Person", "name": "최시준"},
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "경기대로 1014, 6층 603·605호 (병점동, 병점프라자)",
        "addressLocality": "화성시",
        "addressRegion": "경기도",
        "addressCountry": "KR",
    },
    "areaServed": [
        {"@type": "AdministrativeArea", "name": "서울특별시"},
        {"@type": "AdministrativeArea", "name": "경기도"},
        {"@type": "AdministrativeArea", "name": "인천광역시"},
    ],
    "knowsAbout": [
        "건물 종합시설관리", "시설관리 FM", "자산관리 PM", "임대차 관리", "공실 관리",
        "임차사 관리", "공실 개발", "건물 자산가치 증대", "인테리어 PM", "공간 운영", "노후건물 개선",
    ],
    "slogan": "공실을 수익공간으로, 건물을 운영자산으로",
    "hasOfferCatalog": {
        "@type": "OfferCatalog", "name": "지유공간개발 서비스",
        "itemListElement": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": n, "url": SITE + "/" + u}}
            for n, u in [
                ("시설관리 FM", "business/fm.html"),
                ("자산관리 PM", "business/pm.html"),
                ("공실관리 · 임차사관리", "business/leasing.html"),
                ("공실개발 · 자산가치 증대", "business/value-up.html"),
                ("인테리어 · 디자인 PM", "business/interior-pm.html"),
                ("공간운영 · 수익화", "business/space-operation.html"),
                ("노후건물 개선 · 그린 밸류업", "business/green.html"),
            ]
        ],
    },
}

WEBSITE = {
    "@context": "https://schema.org", "@type": "WebSite", "@id": SITE + "/#website",
    "url": SITE + "/", "name": "지유공간개발", "inLanguage": "ko-KR",
    "publisher": {"@id": ORG_ID},
}

# ---------- 페이지별 타이틀 · 설명 · 서비스 정의 ----------
SERVICE_DESC = {
    "business/fm.html": "건물 종합시설관리(FM) — 시설·미화·보안·주차 인력 운영, 법정검사와 예방점검, 긴급출동, 월간 관리 보고",
    "business/pm.html": "건물 자산관리(PM) — 임대차 계약과 갱신, 관리비 산정·부과·정산, 예산과 지출, 임대율·수납률·순영업수익 월간 보고",
    "business/leasing.html": "공실관리와 임차사관리 — 만기 관리와 갱신 협의, 임차사 응대, 임대 마케팅과 중개법인 협업",
    "business/value-up.html": "공실개발과 자산가치 증대 — 공실 원인 진단, 업종과 수익모델 설계, 개발 전후 수익 검증",
    "business/interior-pm.html": "인테리어·디자인 PM — 건물주 편의 설계 방향 설정, 견적 비교, 시공사 선정, 공정·품질·예산 관리",
    "business/space-operation.html": "공간운영과 수익화 — 오픈 세팅, 예약·결제·출입 시스템, 무인화, 위탁운영, 공간 브랜딩",
    "business/green.html": "노후건물 개선과 그린 밸류업 — 외피·설비·조명·에너지 개선을 임대경쟁력과 운영비 절감으로 연결",
}

META = {
    "index.html": (
        "건물관리 FM·PM부터 공실 해결까지 | 지유공간개발",
        "경기·서울 건물 종합시설관리(FM)와 자산관리(PM) 전문. 시설·미화·보안·주차 인력 운영, 임대차와 관리비 관리, 공실관리·임차사관리, 공실개발까지 한 회사가 이어서 맡아 건물의 자산가치를 올립니다. 지유코퍼레이션 연계법인.",
        "건물관리, 건물 종합시설관리, FM 위탁, 자산관리 PM, 공실 관리, 임차사 관리, 공실 해결, 건물 자산가치, 경기 건물관리, 서울 건물관리",
    ),
    "about.html": (
        "회사소개 — 주식회사 지유공간개발 | 건물관리·공실 솔루션",
        "주식회사 지유공간개발은 35년 넘게 건물을 관리해 온 ㈜지유코퍼레이션의 연계법인으로, 시설관리(FM)와 자산관리(PM)를 주업으로 공실과 임차사를 관리하고 비어 있는 공간을 직접 개발합니다. 회사 개요, 사업자 정보, 대표 인사말, 일하는 원칙을 소개합니다.",
        "지유공간개발, 주식회사 지유공간개발, 지유코퍼레이션, 건물관리 회사, 화성 건물관리, 회사소개",
    ),
    "business.html": (
        "사업영역 — 건물관리·공실·개발 7개 서비스 | 지유공간개발",
        "시설관리 FM, 자산관리 PM, 공실관리·임차사관리, 공실개발·자산가치 증대, 인테리어·디자인 PM, 공간운영·수익화, 노후건물 개선까지 세 묶음 일곱 가지 사업영역을 소개합니다.",
        "건물 시설관리, 자산관리, 공실개발, 인테리어 PM, 공간운영, 노후건물 개선, 건물관리 서비스",
    ),
    "business/fm.html": (
        "시설관리 FM — 건물 종합시설관리 위탁 | 지유공간개발",
        "시설·미화·보안·주차를 한 체계로 운영하고 법정검사와 예방점검, 긴급출동, 월간 보고까지 맡는 건물 종합시설관리(FM) 서비스. 직무별 인원과 근무 형태 기준의 투명한 견적과 중소형 빌딩 원격·표준화 관리를 안내합니다.",
        "시설관리, FM 위탁, 건물 종합관리, 건물관리 용역, 미화 보안 주차, 법정점검, 건물관리 견적",
    ),
    "business/pm.html": (
        "자산관리 PM — 임대차·관리비·월간 보고 | 지유공간개발",
        "임대차 계약과 갱신, 관리비 산정·부과·정산, 예산과 지출, 보험과 법정 서류를 맡고 임대율·수납률·관리비·순영업수익(NOI)을 매달 보고하는 건물 자산관리(PM) 서비스입니다.",
        "자산관리 PM, 건물 임대관리, 관리비 산정, 임대차 관리, 빌딩 자산관리, 월간 관리보고서, NOI",
    ),
    "business/leasing.html": (
        "공실관리 · 임차사관리 — 공실 해결 | 지유공간개발",
        "만기 12개월 전부터 시작하는 공실 관리 사이클, 임차사 응대와 연체·퇴거 기준, 조건 조정에서 직접 개발까지 이어지는 공실 해결 3단계, 임대 마케팅과 중개법인 협업을 안내합니다.",
        "공실 관리, 임차사 관리, 공실 해결, 상가 공실, 임대 마케팅, 임대차 만기 관리, 공실률",
    ),
    "business/value-up.html": (
        "공실개발 · 자산가치 증대 — 건물 밸류업 | 지유공간개발",
        "임대로 채워지지 않는 공간의 원인을 진단하고 상권·입지·수요에 맞는 업종과 수익모델을 설계합니다. 진단부터 운영까지 여섯 단계와 다섯 가지 진단 지표, 개발 전후 수익 검증 방식을 소개합니다.",
        "공실개발, 건물 밸류업, 자산가치 증대, 공간기획, 수익모델 설계, 상가 리뉴얼, 부동산 밸류업",
    ),
    "business/interior-pm.html": (
        "인테리어 · 디자인 PM — 건물주 편의 공사 관리 | 지유공간개발",
        "디자인 방향, 견적 비교, 등록 시공사 선정, 공정·품질·예산 관리를 건물주 편에서 맡는 인테리어 PM. 공사비를 대신 받지 않아 시공사와 이해관계가 겹치지 않습니다. 계약모델과 현금흐름 원칙을 안내합니다.",
        "인테리어 PM, 상업공간 인테리어, 공사 감리, 시공사 선정, 공사비 견적 비교, 건물 리모델링 관리",
    ),
    "business/space-operation.html": (
        "공간운영 · 수익화 — 공실을 운영형 공간으로 | 지유공간개발",
        "오픈 세팅부터 예약·결제·출입 시스템, 무인화, 위탁운영까지. 월세 하나에 묶여 있던 공간의 수익원을 시간·일·프로젝트 단위로 넓히는 공간운영·수익화 서비스입니다.",
        "공간운영, 공간 수익화, 무인매장 운영, 위탁운영, 공유공간, 팝업스토어, 단기임대",
    ),
    "business/green.html": (
        "노후건물 개선 · 그린 밸류업 — 에너지·설비 | 지유공간개발",
        "외피·설비·조명·에너지 개선을 임대경쟁력과 운영비 절감에 연결합니다. 진단 영역과 진행 순서, 공실층 리뉴얼과 묶는 패키지, 주차·전기차 충전 설비까지 안내합니다.",
        "노후건물 개선, 그린 리모델링, 건물 에너지 절감, 설비 교체, 관리비 절감, 외벽 보수",
    ),
    "process.html": (
        "진행절차 · 상품 — 관리 M1~M3, 개발 P1~P6 | 지유공간개발",
        "문의에서 실행까지 여섯 단계 진행 절차와 관리 상품(시설관리·자산관리·공실관리) 세 가지, 개발 상품 여섯 가지, 상황별 추천 순서, 관계사 역할 분담, 자주 묻는 질문을 안내합니다.",
        "건물관리 상담 절차, 관리 위탁 계약, 건물관리 상품, 공실 진단 비용, 건물관리 FAQ",
    ),
    "clients.html": (
        "고객별 솔루션 — 건물주·임차인·투자자 | 지유공간개발",
        "중소형 상업용 건물주, 법인 유휴자산 보유사, 임차인·창업자, 숙박·리테일 운영자, 매입·경매 투자자, 관리회사·중개법인, 공공기관까지 고객 유형별로 겪는 문제와 제안 순서를 정리했습니다.",
        "건물주 솔루션, 꼬마빌딩 관리, 법인 유휴자산, 상가 투자, 중개법인 협업, 공공 유휴공간",
    ),
    "contact.html": (
        "상담문의 · 오시는 길 — 건물관리·공실 상담 | 지유공간개발",
        "건물 주소와 층별 현황만 알려주셔도 첫 상담이 가능합니다. 관리 위탁, 공실 해결, 개발 상담을 받습니다. 경기 남부(화성·수원·용인·평택)와 서울 전역 방문 상담, 사업자 정보와 오시는 길을 안내합니다.",
        "건물관리 상담, 건물관리 문의, 공실 상담, 화성 건물관리, 수원 건물관리, 서울 건물관리",
    ),
    "privacy.html": ("개인정보처리방침 | 지유공간개발", None, None),
    "404.html": ("페이지를 찾을 수 없습니다 | 지유공간개발", None, None),
}

CRUMB = {
    "about.html": [("홈", ""), ("회사소개", "about.html")],
    "business.html": [("홈", ""), ("사업영역", "business.html")],
    "process.html": [("홈", ""), ("진행절차 · 상품", "process.html")],
    "clients.html": [("홈", ""), ("고객별 솔루션", "clients.html")],
    "contact.html": [("홈", ""), ("상담문의", "contact.html")],
    "privacy.html": [("홈", ""), ("개인정보처리방침", "privacy.html")],
}
for u, d in SERVICE_DESC.items():
    name = {
        "business/fm.html": "시설관리 FM", "business/pm.html": "자산관리 PM",
        "business/leasing.html": "공실관리 · 임차사관리", "business/value-up.html": "공실개발 · 자산가치 증대",
        "business/interior-pm.html": "인테리어 · 디자인 PM", "business/space-operation.html": "공간운영 · 수익화",
        "business/green.html": "노후건물 개선 · 그린 밸류업",
    }[u]
    CRUMB[u] = [("홈", ""), ("사업영역", "business.html"), (name, u)]


def ld_tag(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '</script>'


def faq_from_html(s):
    out = []
    for m in re.finditer(r'<details><summary>(.*?)</summary><div class="a">(.*?)</div></details>', s, re.S):
        q = html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip()
        a = html.unescape(re.sub(r'<[^>]+>', '', m.group(2))).strip()
        a = re.sub(r'\s+', ' ', a)
        if q and a:
            out.append({"@type": "Question", "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": a}})
    return out


changed = 0
for f in sorted(glob.glob('**/*.html', recursive=True)):
    if f.startswith('naver9935') or f.startswith('insights'):
        continue
    s = open(f, encoding='utf-8').read()

    # --- 타이틀 · 설명 · 키워드
    if f in META:
        t, d, kw = META[f]
        s = re.sub(r'<title>.*?</title>', f'<title>{t}</title>', s, count=1, flags=re.S)
        s = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + t + m.group(2), s, count=1)
        if d:
            s = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + d + m.group(2), s, count=1)
            s = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + d + m.group(2), s, count=1)
        if kw and 'name="keywords"' not in s:
            s = s.replace('<meta property="og:type"', f'<meta name="keywords" content="{kw}">\n<meta property="og:type"', 1)

    # --- 구조화 데이터
    s = re.sub(r'\n?<script type="application/ld\+json">.*?</script>', '', s, flags=re.S)
    blocks = []
    if f == 'index.html':
        blocks += [ORG, WEBSITE]
    else:
        blocks.append({"@context": "https://schema.org", "@type": "WebPage",
                       "url": f"{SITE}/{f}", "name": META.get(f, (s.split('<title>')[1].split('</title>')[0],))[0],
                       "inLanguage": "ko-KR", "isPartOf": {"@id": SITE + "/#website"},
                       "publisher": {"@id": ORG_ID}})
    if f in CRUMB:
        blocks.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": f"{SITE}/{u}"}
            for i, (n, u) in enumerate(CRUMB[f])]})
    if f in SERVICE_DESC:
        blocks.append({"@context": "https://schema.org", "@type": "Service",
                       "name": CRUMB[f][-1][0], "description": SERVICE_DESC[f],
                       "serviceType": "건물관리 · 부동산 자산관리",
                       "provider": {"@id": ORG_ID},
                       "areaServed": [{"@type": "AdministrativeArea", "name": n} for n in ("서울특별시", "경기도", "인천광역시")],
                       "url": f"{SITE}/{f}"})
    qa = faq_from_html(s)
    if qa:
        blocks.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": qa})
    s = s.replace('</head>', '\n'.join(ld_tag(b) for b in blocks) + '\n</head>', 1)

    open(f, 'w', encoding='utf-8').write(s)
    changed += 1
print(f'구조화 데이터·메타 적용: {changed}개 페이지')
