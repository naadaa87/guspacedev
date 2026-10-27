# 지유공간개발 홈페이지

주식회사 지유공간개발(GU SPACE DEVELOPMENT CO., LTD.) 회사 홈페이지입니다.
빌드 과정이 없는 정적 사이트라서 이 폴더를 그대로 GitHub에 올리고 Cloudflare Pages에 연결하면 바로 배포됩니다.

## 1. 배포 (GitHub → Cloudflare Pages)

1. 이 저장소(`naadaa87/guspacedev`)가 그대로 배포 소스입니다. `index.html` 이 저장소 최상위에 있어야 합니다.
2. Cloudflare 대시보드 → **Workers & Pages → Create → Pages → Connect to Git** 에서 그 저장소를 선택합니다.
3. 빌드 설정은 아래처럼 둡니다.
   - Framework preset: **None**
   - Build command: (비워 둠)
   - Build output directory: **/** (또는 비워 둠)
4. Save and Deploy. 1~2분 뒤 `https://프로젝트명.pages.dev` 주소로 열립니다.
5. 회사 도메인을 붙이려면 Pages 프로젝트 → **Custom domains** 에서 추가합니다.
   이후 GitHub에 파일을 수정해 올릴 때마다 자동으로 다시 배포됩니다.

## 2. 아직 채워야 하는 것

| 항목 | 위치 | 비고 |
|---|---|---|
| **대표 전화번호 · 이메일** | `assets/js/site-config.js` | 이 파일 하나만 고치면 하단 영역과 상담문의 페이지에 모두 반영됩니다. 전화번호를 넣으면 모바일 화면 하단 고정 바에 "전화" 버튼이 함께 나타납니다. 비워 두면 "[전화번호 입력]" 문구가 그대로 보입니다. |
| 대표 인사말 | `about.html` 의 "대표 인사말" 섹션 | 기획서 내용을 바탕으로 쓴 초안입니다. 대표님 말투로 다듬어 주세요. |
| 지도 | `contact.html`, `assets/js/site-config.js` | 지금은 주소 검색 결과로 연결됩니다. 네이버 플레이스에 업체를 등록하신 뒤 정확한 장소 링크로 바꾸면 됩니다. |
| 개인정보처리방침 | `privacy.html` | 개인정보보호책임자 이름과 연락처를 채워야 합니다. |

사업자등록 정보(사업자등록번호 757-86-04159, 법인등록번호 130111-0133105, 업태·종목, 본점 주소)와 도메인(`https://guspace.kr`)은 이미 전 페이지에 반영되어 있습니다. 도메인이 바뀌면 폴더 전체에서 `https://guspace.kr` 을 새 주소로 한 번에 바꿔 주세요(HTML의 canonical·og:url·구조화 데이터, `sitemap.xml`, `robots.txt` 에 쓰입니다).

## 3. 검색엔진 등록

### 네이버 서치어드바이저
소유확인은 **HTML 태그 방식**으로 이미 적용되어 있습니다. 모든 페이지 `<head>` 에 아래 태그가 들어 있고, 파일 업로드 방식으로 바꾸실 경우를 대비해 `naver9935ff4d7001e43d868b73772f8a93ed.html` 도 루트에 함께 두었습니다.

```html
<meta name="naver-site-verification" content="8dcfa84205fd9a38d54791239c0ed1be110e3145">
```

배포가 끝난 뒤 서치어드바이저에서 할 일은 세 가지입니다.

1. **사이트 소유확인** 버튼을 눌러 확인을 완료합니다.
2. **요청 → 사이트맵 제출** 에 `https://guspace.kr/sitemap.xml` 을 등록합니다.
3. **요청 → 웹페이지 수집** 에 주요 페이지(홈, 사업영역, 인사이트 글)를 한 번씩 수동으로 넣어 두면 첫 수집이 빨라집니다.

### 구글 서치콘솔
https://search.google.com/search-console 에서 도메인을 추가한 뒤, 발급되는 확인용 메타 태그를 네이버 태그 바로 아래에 같은 방식으로 넣으면 됩니다. 사이트맵 주소는 네이버와 동일합니다.

### 이미 되어 있는 것
- 페이지별 제목·설명·키워드를 검색어 기준으로 정리
- 구조화 데이터(JSON-LD): 회사 정보, 서비스, 이동 경로, 자주 묻는 질문, 아티클
- `sitemap.xml` (21개 주소, 우선순위·변경주기 포함), `robots.txt` (네이버 Yeti·다음·구글 로봇 명시)
- 공유 미리보기용 og 태그와 canonical 주소

## 4. 상담 신청 폼이 메일로 오게 하려면

`functions/api/contact.js` 가 폼 내용을 이메일로 보내는 서버 역할을 합니다. Cloudflare Pages가 자동으로 인식하므로 따로 설정할 것은 없고, 환경변수 세 개만 넣으면 됩니다.

1. https://resend.com 에서 무료 계정을 만들고 API 키를 발급받습니다. (월 3,000통 무료)
2. Cloudflare Pages 프로젝트 → **Settings → Environment variables** 에 추가합니다.
   - `RESEND_API_KEY` : 발급받은 키
   - `CONTACT_TO` : 상담 내용을 받을 회사 이메일
   - `CONTACT_FROM` : 발신 주소. 도메인 인증 전에는 `onboarding@resend.dev` 로 테스트할 수 있고, 인증 후에는 `지유공간개발 <contact@회사도메인>` 형식으로 바꿉니다.
3. 다시 배포(Retry deployment)하면 적용됩니다.

환경변수를 넣지 않아도 폼은 동작합니다. 그 경우 방문자의 메일 앱이 열리면서 `site-config.js` 의 `email` 주소로 내용이 채워진 메일이 만들어집니다.
Formspree 같은 다른 서비스를 쓰고 싶으면 `site-config.js` 의 `formEndpoint` 값만 그 주소로 바꾸면 됩니다.

## 5. 화면 구성에서 알아 두실 것

- PC: 상단 메뉴의 "사업영역"에 마우스를 올리면 하위 메뉴가 열립니다.
- 모바일: 오른쪽 위 메뉴 버튼으로 전체 메뉴가 열리고, 화면 하단에 "상담 신청" 바가 고정됩니다(상담문의 페이지에서는 숨김).
- 열이 많은 표는 모바일에서 옆으로 밀어 볼 수 있게 했고, 그 아래에 안내 문구가 붙습니다.
- 홈의 자가진단, 공간운영 페이지의 건물 단면도는 자바스크립트로 동작하며 외부 서비스에 의존하지 않습니다.

## 6. 내용 수정 방법

- 문구 수정: 각 HTML 파일을 열어 해당 문장을 고치면 됩니다. 페이지마다 상단 메뉴와 하단은 같은 구조라 같이 손보는 것이 좋습니다.
- 색 바꾸기: `assets/css/site.css` 맨 위 `:root` 의 `--point`(포인트 그린), `--ink`(네이비) 값을 바꾸면 사이트 전체에 적용됩니다.
- 사진 교체: `assets/img/` 에 같은 이름의 WebP 파일을 넣습니다. 큰 파일(가로 1600px)과 `-800` 이 붙은 작은 파일 두 장이 한 쌍입니다.
- 글꼴: 본문은 Pretendard, 제목은 Noto Serif KR입니다. 두 파일 모두 한글 상용 2,350자(KS X 1001)와 라틴 문자·숫자·기호를 담아 새로 만든 것이라, 일상적인 한국어 문장은 모두 정상적으로 나옵니다. 다만 "뷁"처럼 표준 상용 한글에 없는 희귀 음절을 새로 넣으면 그 글자만 시스템 기본 글꼴로 보입니다. 그런 글자가 필요하면 알려주시면 글꼴을 다시 만들어 드립니다.
- 사진은 사이트 안에서 한 장을 한 번만 쓰도록 배치했습니다. 새로 넣을 때도 같은 사진이 두 페이지에 나오지 않게 해 주세요.

## 7. 페이지 구성

```
index.html                     홈 (세 층 구조, 진행 6단계, 사업영역 7개, 고객별 진입점, 연계법인, 자가진단)
about.html                     회사소개 (네 가지 역할, 대표 인사말, 개요, 지유코퍼레이션과의 관계, 원칙, 시장, 오시는 길)
business.html                  사업영역 총괄 (세 묶음 일곱 영역)
business/fm.html               시설관리 FM
business/pm.html               자산관리 PM (임대차 · 관리비 · 예산 · 월간 보고)
business/leasing.html          공실관리 · 임차사관리 · 공실해결
business/value-up.html         공실개발 · 자산가치 증대
business/interior-pm.html      인테리어 · 디자인 PM
business/space-operation.html  공간운영 · 수익화 · 브랜딩
business/green.html            노후건물 개선 · 그린 밸류업
process.html                   진행절차 · 관리 상품 M1~M3 · 개발 상품 P1~P6 · 역할분담 · FAQ
clients.html                   고객별 솔루션 (8개 유형)
insights.html                  인사이트 목록 (검색 유입용 자료)
insights/                      아티클 6편 (견적서 읽는 법, 인원 산정, 공실 원인,
                               임대차 만기 관리, 관리비 산정, 노후건물 공사 순서)
contact.html                   상담문의 · 오시는 길
privacy.html                   개인정보처리방침
404.html                       없는 주소 안내
assets/css/site.css            스타일
assets/js/site.js              메뉴, 자가진단, 폼 동작
assets/js/site-config.js       연락처 등 설정값 (여기만 고치면 됨)
assets/fonts/                  Pretendard(본문) · Noto Serif KR(제목) 두 파일 (자체 호스팅, OFL 라이선스)
assets/img/                    사진 (WebP)
functions/api/contact.js       상담 폼 메일 발송 (Cloudflare Pages Function)
_headers                       보안 · 캐시 헤더
robots.txt, sitemap.xml        검색엔진용
naver9935...93ed.html          네이버 소유확인 파일 (HTML 파일 업로드 방식 대비)
tools/                         인사이트 생성·SEO 적용·검수 스크립트 (배포에는 영향 없음)
```

## 8. 내용 관련 원칙

- 인사이트 글은 `tools/content.py` 에 본문이, `tools/faq.py` 에 문답이 들어 있습니다. 글을 추가하거나 고친 뒤 `python3 tools/make_insights.py` 를 실행하면 목록과 구조화 데이터까지 다시 만들어집니다. 글을 직접 HTML로 고치셔도 되지만, 그 경우 스크립트를 다시 돌리면 덮어쓰기되니 주의하십시오.
- 사이트의 뼈대는 "건물관리(FM·PM) → 공실·임차사 관리 → 공실개발·자산가치 증대"의 세 층 구조입니다. 새 페이지나 문구를 추가할 때도 이 순서 안에서 자리를 잡으면 전체 메시지가 흐트러지지 않습니다.
- 자산관리 PM 페이지의 월간 보고서 화면은 예시이며, 숫자는 실제 건물 자료가 아닙니다. 실제 보고서 양식이 정해지면 그 화면으로 바꾸는 것을 권합니다.

- 지유코퍼레이션 실적(37개 동, 195,000평, 12개 분야 SOP)은 모두 "연계사 기준"으로 표기했습니다. 지유공간개발의 직접 수행 실적은 프로젝트가 생기는 대로 별도로 추가하면 됩니다.
- 스마트 빌딩, 빌딩 인텔리전스 등 기획 단계의 사업은 "준비 중" 또는 "방향"으로만 적었고, 플랫폼이나 시스템을 이미 보유한 것처럼 쓰지 않았습니다.
- 시공은 등록 전문업체가 맡고 지유공간개발은 발주자 편 PM만 한다는 점, 진단이 유료라는 점을 관련 페이지마다 밝혔습니다.
