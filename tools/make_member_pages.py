# -*- coding: utf-8 -*-
"""회원 페이지(member/*.html) 생성 스크립트.

privacy.html 의 머리글·바닥글을 그대로 가져와 회원가입·로그인·마이페이지·비밀번호 재설정·이용약관 페이지를 만듭니다.
사이트 공통 머리글이나 바닥글을 고친 뒤에는 이 스크립트를 다시 실행하면 회원 페이지에도 반영됩니다.

    python3 tools/make_member_pages.py
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://guspace.kr'

WHO = ['건물주 · 자산주', '건물주 (관리 위탁 희망)', '법인 유휴자산 담당자', '임차인 · 창업자', '숙박 · 리테일 운영자',
       '투자자', '관리회사 · 중개법인', '공공 · 지역기관', '기타']
INTEREST = ['시설관리 FM', '자산관리 PM', '공실관리 · 임차사관리', '공실개발 · 자산가치 증대', '인테리어 · 디자인 PM',
            '공간운영 · 수익화', '노후건물 개선 · 그린 밸류업', '건물관리 실무 자료']


def who_select(id_='who', required=True):
    opts = ''.join(f'<option>{w}</option>' for w in WHO)
    return f'<select id="{id_}" name="who"{" required" if required else ""}><option value="">선택</option>{opts}</select>'


def interest_grid(prefix='i'):
    return '<div class="check-grid">' + ''.join(
        f'<label><input type="checkbox" name="interest" value="{x}"> <span>{x}</span></label>' for x in INTEREST) + '</div>'


HONEYPOT = '<div class="hp" aria-hidden="true"><label for="website">website</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>'


def hero(crumb, h1, lede):
    return f'''<section class="page-hero">
  <div class="wrap">
    <div class="crumb"><a href="../index.html">홈</a> › <span>{crumb}</span></div>
    <h1>{h1}</h1>
    <p class="lede">{lede}</p>
  </div>
</section>'''


PAGES = {}

PAGES['join'] = dict(
    title='회원가입 | 지유공간개발',
    desc='지유공간개발 회원가입. 상담 신청 내역과 진행 상황을 마이페이지에서 확인하고, 건물관리·공실 실무 자료 소식을 받아볼 수 있습니다.',
    main=hero('회원가입', '회원가입', '회원으로 가입하시면 상담 신청 내역과 진행 상황을 마이페이지에서 확인하실 수 있고, 원하시면 건물관리·공실 실무 자료가 새로 나올 때 메일로 받아보실 수 있습니다.') + f'''
<section class="section">
  <div class="wrap">
    <div class="auth">
      <form class="form" data-join novalidate>
        {HONEYPOT}
        <div class="full"><label for="email">이메일 <small>로그인 아이디로 씁니다</small></label><input id="email" name="email" type="email" autocomplete="email" required></div>
        <div><label for="password">비밀번호 <small>8자 이상, 영문과 숫자 포함</small></label><input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required></div>
        <div><label for="password2">비밀번호 확인</label><input id="password2" name="password2" type="password" autocomplete="new-password" required><p class="field-hint" data-pw-hint></p></div>
        <div><label for="name">이름</label><input id="name" name="name" autocomplete="name" required></div>
        <div><label for="company">회사 · 소속 <small>선택</small></label><input id="company" name="company" autocomplete="organization"></div>
        <div><label for="phone">연락처 <small>선택</small></label><input id="phone" name="phone" type="tel" autocomplete="tel" placeholder="010-0000-0000"></div>
        <div><label for="who">어떤 입장이신가요</label>{who_select()}</div>
        <div class="full"><label>관심 있는 분야 <small>여러 개 고를 수 있습니다</small></label>{interest_grid()}</div>
        <div class="full"><div class="agrees">
          <label class="all"><input type="checkbox" data-agree-all> <span>아래 내용에 모두 동의합니다</span></label>
          <label><input type="checkbox" name="age14" data-agree> <span><em>[필수]</em>만 14세 이상입니다</span></label>
          <label><input type="checkbox" name="agree" data-agree> <span><em>[필수]</em>이용약관과 개인정보 수집·이용에 동의합니다</span><a href="terms.html" target="_blank" rel="noopener">약관 보기</a></label>
          <label><input type="checkbox" name="marketing" data-agree> <span><em class="opt">[선택]</em>건물관리·공실 실무 자료 소식을 메일로 받겠습니다</span></label>
        </div></div>
        <div class="full msg" role="status"></div>
        <div class="full"><button class="btn btn-point" type="submit">가입하기</button></div>
        <p class="full note">이미 회원이신가요? <a class="text-link" href="login.html">로그인</a></p>
      </form>
      <aside class="auth-side">
        <h3>회원이 되면</h3>
        <ul>
          <li>상담을 신청할 때 이름과 연락처를 다시 적지 않아도 됩니다.</li>
          <li>신청한 상담이 지금 어느 단계에 있는지 마이페이지에서 확인할 수 있습니다.</li>
          <li>소식 받기에 동의하시면 건물관리·공실 실무 자료가 새로 올라올 때 메일로 알려드립니다.</li>
        </ul>
        <p>가입할 때 받는 정보와 보관 기간은 <a class="text-link" href="../privacy.html">개인정보처리방침</a>에 적어 두었습니다. 탈퇴하면 회원 정보는 바로 지웁니다.</p>
      </aside>
    </div>
  </div>
</section>''')

PAGES['login'] = dict(
    title='로그인 | 지유공간개발',
    desc='지유공간개발 회원 로그인. 상담 신청 내역과 진행 상황, 회원 정보를 확인할 수 있습니다.',
    main=hero('로그인', '로그인', '가입하신 이메일과 비밀번호로 로그인하세요. 상담 신청 내역과 진행 상황은 마이페이지에서 확인하실 수 있습니다.') + f'''
<section class="section">
  <div class="wrap">
    <div class="auth single">
      <div>
        <form class="form" data-login novalidate>
          <div class="full"><label for="email">이메일</label><input id="email" name="email" type="email" autocomplete="email" required></div>
          <div class="full"><label for="password">비밀번호</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
          <div class="full msg" role="status"></div>
          <div class="full"><button class="btn btn-point" type="submit">로그인</button></div>
        </form>
        <div class="auth-links"><a href="join.html">회원가입</a><a href="#forgot" data-forgot-toggle>비밀번호를 잊으셨나요?</a></div>
        <div class="forgot" id="forgot" hidden>
          <h2>비밀번호 재설정</h2>
          <p>가입한 이메일을 적어 주시면 새 비밀번호를 정할 수 있는 링크를 보내드립니다. 링크는 30분 동안 쓸 수 있습니다.</p>
          <form class="form" data-forgot novalidate>
            <div class="full"><label for="femail">이메일</label><input id="femail" name="email" type="email" autocomplete="email" required></div>
            <div class="full msg" role="status"></div>
            <div class="full"><button class="btn btn-line" type="submit">재설정 링크 받기</button></div>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>''')

PAGES['mypage'] = dict(
    title='마이페이지 | 지유공간개발',
    desc='지유공간개발 회원 마이페이지. 상담 신청 내역과 진행 상황, 회원 정보와 소식 수신 설정을 확인합니다.',
    main=hero('마이페이지', '<span data-my-name>회원</span>님의 마이페이지', '상담 신청 내역과 진행 상황을 확인하고, 회원 정보와 소식 수신 설정을 바꿀 수 있습니다.') + f'''
<section class="section">
  <div class="wrap">
    <p data-my-loading class="note">회원 정보를 불러오는 중입니다…</p>
    <div class="my-grid" data-my hidden>
      <div class="my-card wide">
        <div class="my-head"><div><h2>내 상담 신청</h2><p class="my-sub">담당자가 진행 상태를 바꾸면 여기에도 바로 반영됩니다.</p></div><a class="btn btn-point btn-sm" href="../contact.html">새 상담 신청</a></div>
        <ul class="inq-list mt-2" data-my-inq></ul>
      </div>
      <div class="my-card">
        <h2>회원 정보</h2>
        <p class="my-sub">로그인 이메일 <b data-my-email></b></p>
        <form class="form" data-my-profile novalidate>
          <div><label for="name">이름</label><input id="name" name="name" autocomplete="name" required></div>
          <div><label for="company">회사 · 소속 <small>선택</small></label><input id="company" name="company" autocomplete="organization"></div>
          <div><label for="phone">연락처 <small>선택</small></label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
          <div><label for="who">어떤 입장이신가요</label>{who_select(required=False)}</div>
          <div><label for="location">관리 · 보유 건물 위치 <small>선택</small></label><input id="location" name="location" placeholder="예: 서울 영등포구 양평동, 지상 6층 근생"></div>
          <div><label>관심 있는 분야</label>{interest_grid()}</div>
          <div><label class="agree"><input type="checkbox" name="marketing"> <span>건물관리·공실 실무 자료 소식을 메일로 받겠습니다 (선택)</span></label></div>
          <div class="msg" role="status"></div>
          <div><button class="btn btn-ink" type="submit">저장</button></div>
        </form>
      </div>
      <div>
        <div class="my-card">
          <h2>비밀번호 변경</h2>
          <p class="my-sub">8자 이상, 영문과 숫자를 함께 넣어 주세요.</p>
          <form class="form" data-my-password novalidate>
            <div><label for="cur">현재 비밀번호</label><input id="cur" name="current" type="password" autocomplete="current-password" required></div>
            <div><label for="next">새 비밀번호</label><input id="next" name="next" type="password" autocomplete="new-password" required></div>
            <div><label for="next2">새 비밀번호 확인</label><input id="next2" name="next2" type="password" autocomplete="new-password" required></div>
            <div class="msg" role="status"></div>
            <div><button class="btn btn-line" type="submit">비밀번호 바꾸기</button></div>
          </form>
        </div>
        <div class="my-card mt-3">
          <h2>로그아웃</h2>
          <p class="my-sub">이 기기에서 로그아웃합니다.</p>
          <button class="btn btn-line" type="button" data-logout>로그아웃</button>
        </div>
        <div class="my-card mt-3 danger-zone">
          <h2>회원 탈퇴</h2>
          <p class="my-sub">탈퇴하면 회원 정보는 바로 지워지고 되돌릴 수 없습니다. 이미 접수된 상담 기록은 개인정보처리방침에 정한 기간 동안 보관한 뒤 파기합니다.</p>
          <form class="form" data-my-withdraw novalidate>
            <div><label for="wpw">비밀번호 확인</label><input id="wpw" name="password" type="password" autocomplete="current-password" required></div>
            <div class="msg" role="status"></div>
            <div><button class="btn btn-danger" type="submit">탈퇴하기</button></div>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>''')

PAGES['reset'] = dict(
    title='비밀번호 재설정 | 지유공간개발',
    desc='지유공간개발 회원 비밀번호 재설정.',
    main=hero('비밀번호 재설정', '새 비밀번호 정하기', '메일로 받은 링크에서 새 비밀번호를 정해 주세요. 링크는 받은 뒤 30분 동안만 쓸 수 있습니다.') + '''
<section class="section">
  <div class="wrap">
    <div class="auth single">
      <form class="form" data-reset novalidate>
        <div class="full"><label for="password">새 비밀번호 <small>8자 이상, 영문과 숫자 포함</small></label><input id="password" name="password" type="password" autocomplete="new-password" required></div>
        <div class="full"><label for="password2">새 비밀번호 확인</label><input id="password2" name="password2" type="password" autocomplete="new-password" required></div>
        <div class="full msg" role="status"></div>
        <div class="full"><button class="btn btn-point" type="submit">새 비밀번호 저장</button></div>
        <p class="full note"><a class="text-link" href="login.html">로그인으로 돌아가기</a></p>
      </form>
    </div>
  </div>
</section>''')

TERMS = [
    ('제1조 (목적)', ['이 약관은 주식회사 지유공간개발(이하 “회사”)이 홈페이지(guspace.kr)에서 제공하는 회원 서비스의 이용 조건과 절차, 회사와 회원의 권리와 의무를 정합니다.']),
    ('제2조 (회원)', ['“회원”은 이 약관에 동의하고 홈페이지에서 회원가입을 마친 사람을 말합니다.', '만 14세 미만은 회원으로 가입할 수 없습니다.']),
    ('제3조 (약관의 효력과 변경)', ['이 약관은 홈페이지에 게시한 때부터 효력이 생깁니다.', '회사는 관련 법령을 위반하지 않는 범위에서 약관을 바꿀 수 있으며, 바꿀 때는 시행일 7일 전부터 홈페이지에 변경 내용과 시행일을 알립니다. 회원에게 불리한 변경은 30일 전부터 알립니다.', '회원은 바뀐 약관에 동의하지 않으면 탈퇴할 수 있습니다.']),
    ('제4조 (회원가입)', ['회원가입은 이용자가 가입 양식에 정보를 적고 이 약관과 개인정보 수집·이용에 동의한 뒤, 회사가 이를 접수하면 이루어집니다.', '다른 사람의 정보를 쓰거나 사실과 다른 정보를 적은 경우 회사는 가입을 거절하거나 회원 자격을 정지할 수 있습니다.']),
    ('제5조 (제공하는 서비스)', ['회사는 회원에게 다음 서비스를 제공합니다.', '1. 상담 신청 시 회원 정보 자동 입력', '2. 상담 신청 내역과 진행 상황 확인', '3. 소식 수신에 동의한 회원에게 건물관리·공실 관련 자료와 소식 안내', '서비스 내용은 회사 사정에 따라 바뀔 수 있으며, 바뀌는 경우 홈페이지에 미리 알립니다.']),
    ('제6조 (회원 정보의 관리)', ['회원은 마이페이지에서 언제든지 자신의 정보를 확인하고 고칠 수 있습니다.', '이메일과 비밀번호 관리 책임은 회원에게 있습니다. 비밀번호가 다른 사람에게 알려졌다고 생각되면 바로 바꾸고 회사에 알려 주십시오.']),
    ('제7조 (회원의 의무)', ['회원은 다음 행위를 해서는 안 됩니다.', '1. 다른 사람의 정보를 도용하는 행위', '2. 홈페이지의 운영을 방해하거나 정보를 무단으로 수집·변경하는 행위', '3. 관련 법령이나 이 약관에 어긋나는 행위']),
    ('제8조 (탈퇴와 자격 정지)', ['회원은 마이페이지에서 언제든지 탈퇴할 수 있으며, 회사는 탈퇴 즉시 회원 정보를 지웁니다.', '회원이 제7조를 위반한 경우 회사는 회원 자격을 정지하거나 회원 정보를 삭제할 수 있습니다.']),
    ('제9조 (개인정보 보호)', ['회사는 회원의 개인정보를 관련 법령과 홈페이지에 게시한 개인정보처리방침에 따라 보호합니다.']),
    ('제10조 (책임의 한계)', ['회사는 천재지변, 통신 장애 등 회사가 통제할 수 없는 사유로 서비스를 제공하지 못한 경우 책임을 지지 않습니다.', '홈페이지에 게시한 자료는 일반적인 실무 정보이며, 개별 건물에 대한 판단은 상담을 통해 확인해 주십시오.']),
    ('제11조 (분쟁 해결)', ['이 약관과 서비스 이용에 관한 분쟁은 대한민국 법을 따르며, 소송이 필요한 경우 민사소송법에 따른 관할 법원에 제기합니다.']),
    ('부칙', ['이 약관은 2026년 11월 18일부터 적용합니다.']),
]


def terms_main():
    body = ''
    for i, (h, ps) in enumerate(TERMS):
        cls = 'mb-2' if i == 0 else 'mb-2 mt-6'
        body += f'    <h2 style="font-size:20px" class="{cls}">{h}</h2>\n' + ''.join(f'    <p>{p}</p>\n' for p in ps)
    return hero('이용약관', '이용약관', '지유공간개발 홈페이지 회원 서비스를 이용할 때 적용되는 약관입니다.') + f'''
<section class="section">
  <div class="wrap narrow">
{body}  </div>
</section>'''


PAGES['terms'] = dict(title='이용약관 | 지유공간개발', desc='주식회사 지유공간개발 홈페이지 회원 서비스 이용약관.', main=terms_main())


def relative(html):
    def fix(m):
        attr, val = m.group(1), m.group(2)
        if re.match(r'^(https?:|#|mailto:|tel:|/|data:|\.\./)', val) or val == '':
            return m.group(0)
        return f'{attr}="../{val}"'
    html = re.sub(r'\b(href|src)="([^"]*)"', fix, html)
    html = re.sub(r'srcset="([^"]*)"', lambda m: 'srcset="' + ', '.join('../' + p.strip() for p in m.group(1).split(',')) + '"', html)
    return html


def build():
    tpl = open(os.path.join(ROOT, 'privacy.html'), encoding='utf-8').read()
    tpl = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', '', tpl, flags=re.S)
    tpl = tpl.replace(' aria-current="page"', '')
    head, rest = tpl.split('<main id="main">', 1)
    _, foot = rest.split('</main>', 1)
    os.makedirs(os.path.join(ROOT, 'member'), exist_ok=True)
    for name, p in PAGES.items():
        url = f'{SITE}/member/{name}.html'
        h = head
        h = re.sub(r'<title>.*?</title>', f'<title>{p["title"]}</title>', h)
        h = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="noindex,follow">', h)
        h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{p["desc"]}">', h)
        h = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{p["title"]}">', h)
        h = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{p["desc"]}">', h)
        h = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">', h)
        h = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', h)
        f = foot.replace('<script src="assets/js/track.js?v=1" defer></script>',
                         '<script src="assets/js/track.js?v=1" defer></script>\n<script src="assets/js/member.js?v=1"></script>')
        # 머리글·바닥글만 한 단계 위 경로로 바꾸고, 본문은 member/ 폴더 기준으로 쓴 그대로 둡니다.
        chrome = lambda x: relative(x).replace('href="../member/', 'href="').replace('data-mypage="member/', 'data-mypage="')
        out = chrome(h) + '<main id="main">\n' + p['main'] + '\n</main>' + chrome(f)
        open(os.path.join(ROOT, 'member', name + '.html'), 'w', encoding='utf-8').write(out)
        print('wrote member/%s.html' % name)


if __name__ == '__main__':
    build()
