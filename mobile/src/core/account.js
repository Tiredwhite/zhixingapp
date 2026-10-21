const SESSION_KEY = 'zhixing.account.session';

export function activeAccountSession() {
  if (typeof uni === 'undefined') return null;
  let session;
  try { session = uni.getStorageSync(SESSION_KEY); } catch { return null; }
  const expiry = Number(session?.expires_at);
  if (typeof session?.access_token === 'string' && session.access_token && Number.isFinite(expiry) && expiry > Math.floor(Date.now() / 1000)) {
    return session;
  }
  if (session) {
    try { uni.removeStorageSync(SESSION_KEY); } catch { /* The guard still blocks navigation. */ }
  }
  return null;
}

export function hasActiveAccount() {
  return Boolean(activeAccountSession());
}

export function requireAccountLogin() {
  // #ifdef APP-PLUS
  if (hasActiveAccount()) return true;
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  const current = pages[pages.length - 1]?.route || '';
  if (current !== 'pages/login/index') uni.reLaunch({ url: '/pages/login/index' });
  return false;
  // #endif
  return true;
}

export function expireAccountSession(errorData) {
  if (!['LOGIN_REQUIRED', 'INVALID_TOKEN'].includes(errorData?.code) || typeof uni === 'undefined') return;
  try { uni.removeStorageSync(SESSION_KEY); } catch { /* The server will continue to reject this token. */ }
  // #ifdef APP-PLUS
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  if (pages[pages.length - 1]?.route !== 'pages/login/index') uni.reLaunch({ url: '/pages/login/index' });
  // #endif
}
