// Drives a full-screen <canvas> with only the SPD title-screen parallax
// background (TitleParallax), without the banner/torches. Used by the hero
// select screen before a class is chosen.

import { useEffect } from 'react';
import TitleParallax, { TITLE_ASSET_URLS } from './titleBackground';
import { getDisplaySettings, subscribeDisplay } from './menuSettings';

function loadImages(urls) {
  return Promise.all(urls.map(url => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve([url, img]);
    img.onerror = () => resolve([url, null]);
    img.src = url;
  }))).then(pairs => Object.fromEntries(pairs));
}

export default function useParallaxBackground(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();
    let parallax = null;
    let disposed = false;

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (parallax) { parallax.reset(w, h); parallax.prime(); }
      return { w, h };
    };

    const render = (now) => {
      if (disposed) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#16151a';
      ctx.fillRect(0, 0, w, h);

      if (parallax) {
        if (getDisplaySettings().bgMotion) parallax.update(dt);
        parallax.draw(ctx);
      }

      raf = requestAnimationFrame(render);
    };

    loadImages(TITLE_ASSET_URLS).then((imgs) => {
      if (disposed) return;
      parallax = new TitleParallax(imgs);
      sizeCanvas();
      last = performance.now();
      raf = requestAnimationFrame(render);
    });

    const onResize = () => sizeCanvas();
    window.addEventListener('resize', onResize);
    const unsub = subscribeDisplay(() => {});

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      unsub();
    };
  }, [canvasRef]);
}
