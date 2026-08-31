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

  async function render(url, container, handlers) {
    handlers = handlers || {};
    container.innerHTML = "";

    const pdf = await window.pdfjsLib.getDocument(url).promise;
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

      // 클릭 → 정규화 좌표(0~1)로 변환하여 콜백
      layer.addEventListener("click", (e) => {
        // 마커 자체를 클릭한 경우는 무시 (마커가 자체 처리)
        if (e.target.closest(".marker")) return;
        const rect = layer.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        if (handlers.onPageClick) {
          handlers.onPageClick({
            page: n,
            x: Math.max(0, Math.min(1, x)),
            y: Math.max(0, Math.min(1, y)),
            clientX: e.clientX,
            clientY: e.clientY,
            layer
          });
        }
      });

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
