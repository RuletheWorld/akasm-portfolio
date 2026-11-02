export const KEY_UNLOCKED = "rm-pass-unlocked";
export const KEY_DARK = "rm-cabin-dark";
export const KEY_MUTED = "rm-sound-off";
export const store = {
  get(k: string) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(k, v); } catch {}
  },
  del(k: string) {
    try { localStorage.removeItem(k); } catch {}
  },
};
/** Inline, pre-paint script: theme + whether the gate covers the page. */
export const BOOT_SCRIPT = `(function(){try{
var d=document.documentElement,q=location.search;
if(localStorage.getItem('${KEY_DARK}')==='1')d.dataset.theme='dark';
var home=location.pathname==='/'||location.pathname==='';
var skip=/[?&]skip(=|&|$)/.test(q),force=/[?&]gate(=|&|$)/.test(q);
if(home&&!skip&&(force||localStorage.getItem('${KEY_UNLOCKED}')!=='1'))d.classList.add('is-covered');
}catch(e){}})();`;
