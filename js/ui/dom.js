// Small rendering helpers shared by the screens.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const n0 = (x) => Math.round(x).toLocaleString('en-US');
export const n1 = (x) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '');

export function bar(value, max, cls = '') {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max * 1.05 ? ' over' : '';
  return `<div class="bar ${cls}${over}"><span style="width:${pct.toFixed(1)}%"></span></div>`;
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export const num = (v) => {
  const x = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : null;
};

/** Lite YouTube embed: thumbnail first, iframe only after a tap (saves data, loads fast). */
export function videoBlock(video, backup, searchQuery) {
  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery + ' form tutorial')}`;
  if (!video) {
    return `<a class="video-missing" href="${search}" target="_blank" rel="noopener">▶ دوّر على فيديو للتمرين ده على يوتيوب</a>`;
  }
  const links = [
    backup ? `<button class="link" data-act="play" data-id="${esc(backup.id)}">فيديو تاني</button>` : '',
    `<a class="link" href="${search}" target="_blank" rel="noopener">دوّر على يوتيوب</a>`,
  ].filter(Boolean).join(' · ');
  return `
    <div class="video-wrap">
      <button class="video" data-act="play" data-id="${esc(video.id)}" aria-label="شغّل الفيديو"
        style="background-image:url('https://i.ytimg.com/vi/${esc(video.id)}/hqdefault.jpg')">
        <span class="play">▶</span>
      </button>
      <div class="video-meta"><span>${esc(video.channel ?? '')}</span><span>${links}</span></div>
    </div>`;
}

export function iframeFor(id) {
  return `<iframe class="video-frame" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1"
    title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}
