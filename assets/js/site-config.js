/* ============================================================
   지유공간개발 홈페이지 설정 파일
   이 파일의 값만 바꾸면 홈페이지 전체(상단·하단·상담문의 페이지)에 반영됩니다.
   값이 비어 있으면("") 페이지에 적힌 기본 문구가 그대로 보입니다.
   ============================================================ */
window.GU_SITE = {
  /* 대표 전화번호 — 예: "031-000-0000" */
  phone: "",

  /* 대표 이메일 — 예: "contact@example.com"
     상담 폼 서버가 준비되지 않았을 때는 이 주소로 메일 앱이 열립니다. */
  email: "",

  /* 사업자등록번호 — 예: "000-00-00000" (사업자등록 후 입력) */
  bizNo: "",

  /* 상담 신청 폼이 전송되는 주소
     - 기본값 "/api/contact" 는 같이 배포되는 Cloudflare Pages Function(functions/api/contact.js)입니다.
       Cloudflare 대시보드에 RESEND_API_KEY, CONTACT_TO 환경변수를 넣으면 바로 동작합니다.
     - Formspree 등 외부 서비스를 쓰려면 그 주소로 바꾸면 됩니다. 예: "https://formspree.io/f/xxxxxxx" */
  formEndpoint: "/api/contact",

  /* 지도 링크 (기본값은 주소 검색 링크입니다. 정확한 장소 링크가 있으면 바꿔 넣으세요) */
  mapNaver: "https://map.naver.com/p/search/%EA%B2%BD%EA%B8%B0%EB%8F%84%20%ED%99%94%EC%84%B1%EC%8B%9C%20%EA%B2%BD%EA%B8%B0%EB%8C%80%EB%A1%9C%201014",
  mapKakao: "https://map.kakao.com/?q=%EA%B2%BD%EA%B8%B0%EB%8F%84%20%ED%99%94%EC%84%B1%EC%8B%9C%20%EA%B2%BD%EA%B8%B0%EB%8C%80%EB%A1%9C%201014"
};
