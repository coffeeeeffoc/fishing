import { useEffect, useState } from 'react';

type FullscreenDocument = Document & { webkitFullscreenElement?: Element };
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void | Promise<void> };

function fullscreenHost(): Window {
  try {
    // The browser Shell uses an iframe; inspect its viewport, not the smaller game frame.
    if (window.top?.document) return window.top;
  } catch {
    // Cross-origin hosts expose only the game's own viewport and fullscreen state.
  }
  return window;
}

function needsFullscreen() {
  if (!window.matchMedia('(pointer: coarse) and (orientation: landscape)').matches) return false;
  const host = fullscreenHost();
  return !(
    (document as FullscreenDocument).fullscreenElement ||
    (document as FullscreenDocument).webkitFullscreenElement ||
    (host.document as FullscreenDocument).fullscreenElement ||
    (host.document as FullscreenDocument).webkitFullscreenElement ||
    host.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
    (host.navigator as Navigator & { standalone?: boolean }).standalone ||
    // ponytail: native hosts lack DOM fullscreen state; use a screen-sized viewport until a host API is available.
    (Math.abs(host.innerWidth - host.screen.width) <= 2 &&
      Math.abs(host.innerHeight - host.screen.height) <= 2)
  );
}

export function FullscreenButton() {
  const [visible, setVisible] = useState(needsFullscreen);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const update = () => {
      setVisible(needsFullscreen());
      setMessage('');
    };
    const host = fullscreenHost();
    const windows = [...new Set([window, host])];
    const media = window.matchMedia('(pointer: coarse) and (orientation: landscape)');
    const display = host.matchMedia('(display-mode: fullscreen), (display-mode: standalone)');
    for (const target of windows) {
      target.addEventListener('resize', update);
      target.document.addEventListener('fullscreenchange', update);
      target.document.addEventListener('webkitfullscreenchange', update);
    }
    media.addEventListener('change', update);
    display.addEventListener('change', update);
    return () => {
      for (const target of windows) {
        target.removeEventListener('resize', update);
        target.document.removeEventListener('fullscreenchange', update);
        target.document.removeEventListener('webkitfullscreenchange', update);
      }
      media.removeEventListener('change', update);
      display.removeEventListener('change', update);
    };
  }, []);

  const enter = async () => {
    if (!needsFullscreen()) {
      setVisible(false);
      return;
    }
    const root = document.documentElement as FullscreenElement;
    if (!root.requestFullscreen && !root.webkitRequestFullscreen) {
      setMessage('当前浏览器不支持网页全屏，请使用浏览器的全屏功能或在 App 中打开。');
      return;
    }
    setPending(true);
    setMessage('');
    try {
      if (root.requestFullscreen) await root.requestFullscreen();
      else await root.webkitRequestFullscreen!();
      setVisible(needsFullscreen());
    } catch {
      setMessage('未能进入全屏，请重试或使用浏览器的全屏功能。');
    } finally {
      setPending(false);
    }
  };

  if (!visible) return null;
  return (
    <div className="fullscreen-control">
      <button aria-label="进入全屏" disabled={pending} onClick={() => void enter()}>
        全屏
      </button>
      {message && <span role="status">{message}</span>}
    </div>
  );
}
