(function () {
  const params  = new URLSearchParams(window.location.search);
  const pdfFile = params.get('pdf') || 'pdf1.pdf';
  const loading = document.getElementById('loading');

  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  let pdfDoc    = null;
  let pageNum   = 1;
  let zoomScale = 1.0;
  const ZOOM_STEP = 0.2;
  const ZOOM_MIN  = 0.4;
  const ZOOM_MAX  = 3.0;

  const canvas  = document.getElementById('pdf-canvas');
  const ctx     = canvas.getContext('2d');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const pageInfo= document.getElementById('page-info');

  async function renderPage(num) {
    const page     = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: zoomScale * devicePixelRatio });

    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width  = (viewport.width  / devicePixelRatio) + 'px';
    canvas.style.height = (viewport.height / devicePixelRatio) + 'px';

    await page.render({ canvasContext: ctx, viewport }).promise;

    pageInfo.textContent = num + ' / ' + pdfDoc.numPages;
    prevBtn.disabled = num <= 1;
    nextBtn.disabled = num >= pdfDoc.numPages;
  }

  async function init() {
    try {
      pdfDoc = await pdfjsLib.getDocument('pdfs/' + pdfFile).promise;
    } catch (e) {
      loading.textContent = 'ERRO AO CARREGAR';
      console.error(e);
      return;
    }
    loading.style.display = 'none';
    renderPage(pageNum);
  }

  prevBtn.addEventListener('click', () => {
    if (pageNum > 1) { pageNum--; renderPage(pageNum); }
  });

  nextBtn.addEventListener('click', () => {
    if (pageNum < pdfDoc.numPages) { pageNum++; renderPage(pageNum); }
  });

  document.getElementById('zoom-in').addEventListener('click', () => {
    if (zoomScale < ZOOM_MAX) {
      zoomScale = Math.min(ZOOM_MAX, +(zoomScale + ZOOM_STEP).toFixed(2));
      renderPage(pageNum);
    }
  });

  document.getElementById('zoom-out').addEventListener('click', () => {
    if (zoomScale > ZOOM_MIN) {
      zoomScale = Math.max(ZOOM_MIN, +(zoomScale - ZOOM_STEP).toFixed(2));
      renderPage(pageNum);
    }
  });

  /* swipe mobile */
  let touchStartX = 0;
  canvas.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  canvas.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      if (dx < 0 && pageNum < pdfDoc.numPages) { pageNum++; renderPage(pageNum); }
      if (dx > 0 && pageNum > 1)               { pageNum--; renderPage(pageNum); }
    }
  });

  init();
})();
