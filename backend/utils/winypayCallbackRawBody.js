const WINYPAY_CALLBACK_PATH_RE =
  /\/api\/payment\/winypay\/(?:deposit-callback|withdraw-callback)(?:\?|$)/i;
const HMK_CALLBACK_PATH_RE = /\/api\/hmk\/callback(?:\?|$)/i;

export function isWinypayCallbackRequest(req) {
  const url = String(req.originalUrl || req.url || '');
  return WINYPAY_CALLBACK_PATH_RE.test(url);
}

export function isHmkCallbackRequest(req) {
  const url = String(req.originalUrl || req.url || '');
  return HMK_CALLBACK_PATH_RE.test(url);
}

export function captureWinypayCallbackRawBody(req, _res, buf) {
  if (!isWinypayCallbackRequest(req) && !isHmkCallbackRequest(req)) return;
  req.rawBody = buf?.length ? buf.toString('utf8') : '';
}
