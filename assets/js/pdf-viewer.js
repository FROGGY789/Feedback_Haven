/* =============================================================
 *  pdf-viewer.js — PDF.js 로 PDF를 그리고, 클릭 지점을 알려줍니다.
 *  각 페이지는 아래 구조로 렌더링됩니다:
 *    <div class="page" data-page="n">
 *      <canvas></canvas>
 *      <div class="marker-layer"></div>   ← 마커/클릭 레이어
 *    </div>
 * ============================================================= */

const PDFViewer = (function () {
  // PDF.js worker 지정
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "assets/vendor/pdfjs/pdf.worker.min.js";
  }

  // 클릭/드래그 선택 처리
  function attachSelect(layer, pageNum, handlers) {
    const DRAG_MIN = 0.02; // 이보다 작으면 '클릭(점)' 으로 간주
    let dragging = false, sx = 0, sy = 0, box = null;
    const norm = (e) => {
      const r = layer.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
      };
    };
    layer.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest(".marker, .region")) return; // 기존 표시 클릭은 제외
      const p = norm(e);
      sx = p.x; sy = p.y; dragging = true;
      box = null;
    });
    layer.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const p = norm(e);
      if (!box && (Math.abs(p.x - sx) > DRAG_MIN || Math.abs(p.y - sy) > DRAG_MIN)) {
        box = document.createElement("div");
        box.className = "sel-rect";
        layer.appendChild(box);
      }
      if (box) {
        const x = Math.min(sx, p.x), y = Math.min(sy, p.y);
        const w = Math.abs(p.x - sx), h = Math.abs(p.y - sy);
        box.style.left = x * 100 + "%"; box.style.top = y * 100 + "%";
        box.style.width = w * 100 + "%"; box.style.height = h * 100 + "%";
      }
    });
    const finish = (e) => {
      if (!dragging) return;
      dragging = false;
      const p = norm(e);
      const w = Math.abs(p.x - sx), h = Math.abs(p.y - sy);
      if (box) { box.remove(); box = null; }
      if (!handlers.onSelect) return;
      if (w > DRAG_MIN && h > DRAG_MIN) {
        handlers.onSelect({
          page: pageNum, x: Math.min(sx, p.x), y: Math.min(sy, p.y), w, h,
          clientX: e.clientX, clientY: e.clientY, layer
        });
      } else {
        handlers.onSelect({
          page: pageNum, x: sx, y: sy, w: 0, h: 0,
          clientX: e.clientX, clientY: e.clientY, layer
        });
      }
    };
    layer.addEventListener("mouseup", finish);
    layer.addEventListener("mouseleave", (e) => { if (dragging) finish(e); });
  }

  async function render(url, container, handlers) {
    handlers = handlers || {};
    container.innerHTML = "";

    const pdf = await window.pdfjsLib.getDocument({
      url,
      // 한글(CJK) 및 표준 글꼴이 제대로 그려지도록 매핑 데이터 지정
      cMapUrl: "assets/vendor/pdfjs/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "assets/vendor/pdfjs/standard_fonts/"
    }).promise;
    const layers = {}; // page number -> marker-layer element

    // 컨테이너 폭에 맞춰 렌더링 (여백 고려)
    const targetWidth = Math.min(container.clientWidth - 8, 1100);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const unscaled = page.getViewport({ scale: 1 });
      const scale = targetWidth / unscaled.width;
      const viewport = page.getViewport({ scale });

      const pageEl = document.createElement("div");
      pageEl.className = "page";
      pageEl.dataset.page = String(n);
      pageEl.style.width = viewport.width + "px";
      pageEl.style.height = viewport.height + "px";

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";
      const ctx = canvas.getContext("2d");

      const layer = document.createElement("div");
      layer.className = "marker-layer";

      pageEl.appendChild(canvas);
      pageEl.appendChild(layer);
      container.appendChild(pageEl);
      layers[n] = layer;

      // 페이지 아래 이북 리더식 이동 버튼 (‹ 이전 / 다음 ›)
      const nav = document.createElement("div");
      nav.className = "page-nav";
      nav.innerHTML =
        `<button type="button" class="page-nav__btn" data-goto="${n - 1}"${n === 1 ? " disabled" : ""}>‹ 이전</button>` +
        `<span class="page-nav__label">${n} / ${pdf.numPages}</span>` +
        `<button type="button" class="page-nav__btn" data-goto="${n + 1}"${n === pdf.numPages ? " disabled" : ""}>다음 ›</button>`;
      container.appendChild(nav);
      nav.querySelectorAll("[data-goto]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const el = container.querySelector('.page[data-page="' + btn.dataset.goto + '"]');
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        })
      );

      // 클릭 = 점 피드백 / 드래그 = 범위(형광펜) 피드백
      attachSelect(layer, n, handlers);

      await page.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
      }).promise;
    }

    return {
      numPages: pdf.numPages,
      layers,
      getLayer: (n) => layers[n],
      // 특정 페이지로 스크롤
      scrollToPage(n) {
        const el = container.querySelector('.page[data-page="' + n + '"]');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
  }

  return { render };
})();
