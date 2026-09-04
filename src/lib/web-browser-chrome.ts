/**
 * Mobile browsers only collapse the URL bar when the *document* scrolls.
 * Expo locks body overflow for the app shell, so chat scrolling alone never
 * hides chrome. These helpers briefly unlock document scroll while pinning
 * #root to the visual viewport so the UI fills the larger screen.
 */

const CHROME_ATTR = 'data-sheyon-urlbar';
const SCROLL_ROOM_PX = 80;

let viewportListenersBound = false;
let collapsed = false;

function isMobileWebBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true;
  } catch {
    // ignore
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function syncRootToVisualViewport() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!collapsed) return;

  const root = document.getElementById('root');
  const viewport = window.visualViewport;
  if (!root) return;

  const height = Math.round(viewport?.height ?? window.innerHeight);
  const offsetTop = Math.round(viewport?.offsetTop ?? 0);

  root.style.position = 'fixed';
  root.style.left = '0';
  root.style.right = '0';
  root.style.top = '0';
  root.style.width = '100%';
  root.style.height = `${height}px`;
  root.style.transform = offsetTop > 0 ? `translateY(${offsetTop}px)` : '';
  root.style.zIndex = '0';
}

function bindViewportListeners() {
  if (viewportListenersBound || typeof window === 'undefined') return;
  viewportListenersBound = true;

  const sync = () => syncRootToVisualViewport();
  window.visualViewport?.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('scroll', sync);
  window.addEventListener('resize', sync);
}

function clearRootPin() {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('root');
  if (!root) return;
  root.style.position = '';
  root.style.left = '';
  root.style.right = '';
  root.style.top = '';
  root.style.width = '';
  root.style.height = '';
  root.style.transform = '';
  root.style.zIndex = '';
}

/**
 * Collapse or restore the mobile browser URL bar while keeping the Expo root
 * filled to the visual viewport (fullscreen chat feel).
 */
export function setWebBrowserUrlBarCollapsed(nextCollapsed: boolean) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!isMobileWebBrowser()) return;

  const html = document.documentElement;
  const body = document.body;
  if (!body) return;

  if (nextCollapsed === collapsed) {
    if (nextCollapsed) syncRootToVisualViewport();
    return;
  }

  collapsed = nextCollapsed;
  bindViewportListeners();

  if (nextCollapsed) {
    html.setAttribute(CHROME_ATTR, 'collapsed');
    body.style.minHeight = `${Math.round(window.innerHeight + SCROLL_ROOM_PX)}px`;
    html.style.overflowY = 'scroll';
    body.style.overflowY = 'visible';
    syncRootToVisualViewport();
    // Nudge the document so the UA collapses chrome.
    requestAnimationFrame(() => {
      if (!collapsed) return;
      window.scrollTo(0, SCROLL_ROOM_PX);
      syncRootToVisualViewport();
    });
    return;
  }

  html.removeAttribute(CHROME_ATTR);
  window.scrollTo(0, 0);
  body.style.minHeight = '';
  html.style.overflowY = '';
  body.style.overflowY = '';
  clearRootPin();
}
