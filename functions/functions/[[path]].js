/** 서버 소스 파일(functions/)이 정적 파일로 노출되지 않도록 404로 막습니다. */
export function onRequest() {
  return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}
