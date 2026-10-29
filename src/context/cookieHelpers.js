const _cookieFlags = () => typeof window !== 'undefined' && window.location.protocol === 'https:'
  ? '; path=/; SameSite=Lax; Secure'
  : '; path=/; SameSite=Lax';

export const setGodCookie   = (name, value) => { document.cookie = `${name}=${value}${_cookieFlags()}`; };
export const clearGodCookie = (name)        => { document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`; };
