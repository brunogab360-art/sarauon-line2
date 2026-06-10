(function () {
  /* ── helpers ── */
  const params  = new URLSearchParams(window.location.search);
  const pdfFile = params.get('pdf') || 'pdf1.pdf';
  const loading = document.getElementById('loading');

  /* ── zoom state ── */
  let zoomScale = 1.0;
  const ZOOM_STEP = 0.15;
  const ZOOM_MIN  = 0.5;
  const ZOOM_MAX  = 2.5;

  /* ── build flipbook from rendered PDF pages ── */
  async function renderPDF() {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let pdf;
    try {
      pdf = await pdfjsLib.getDocument('pdfs/' + pdfFile).promise;
    } catch (e) {
      loading.textContent = 'ERRO AO CARREGAR PDF';
      console.error(e);
      return;
    }

    const bookEl  = document.getElementById('book');
    const totalPg = pdf.numPages;

    /* render all pages as canvases first */
    const canvases = [];
    for (let i = 1; i <= totalPg; i++) {
      const page     = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 }); /* high-res base */
      const canvas   = document.createElement('canvas');
      canvas.width   = viewport.width;
      canvas.height  = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      canvases.push(canvas);
    }

    /* build page elements for StPageFlip */
    canvases.forEach(canvas => {
      const div = document.createElement('div');
      div.className = 'page';
      div.style.cssText = 'overflow:hidden;background:#fff;';
      const img = document.createElement('img');
      img.src   = canvas.toDataURL('image/jpeg', 0.92);
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
      div.appendChild(img);
      bookEl.appendChild(div);
    });

    /* ── init PageFlip ── */
    applyBookSize();

    /* hide loading */
    loading.style.display = 'none';
  }

  /* ── size helpers ── */
  function bookDimensions() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const h  = Math.round(vh * 0.92 * zoomScale);
    const w  = Math.round(h * 0.7);   /* roughly A4 portrait ratio */
    const maxW = Math.round(vw * 0.9 * zoomScale);
    return { width: Math.min(w, maxW), height: h };
  }

  let pageFlip = null;

  function applyBookSize() {
    const bookEl = document.getElementById('book');
    const { width, height } = bookDimensions();

    /* destroy previous instance if exists */
    if (pageFlip) {
      try { pageFlip.destroy(); } catch(e) {}
      pageFlip = null;
    }

    bookEl.style.width  = width  + 'px';
    bookEl.style.height = height + 'px';

    pageFlip = new St.PageFlip(bookEl, {
      width,
      height,
      size: 'fixed',
      showCover: true,
      useMouseEvents: true,
      mobileScrollSupport: true,
      swipeDistance: 30,
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));
  }

  /* ── zoom buttons ── */
  document.getElementById('zoom-in').addEventListener('click', () => {
    if (zoomScale < ZOOM_MAX) {
      zoomScale = Math.min(ZOOM_MAX, +(zoomScale + ZOOM_STEP).toFixed(2));
      applyBookSize();
    }
  });

  document.getElementById('zoom-out').addEventListener('click', () => {
    if (zoomScale > ZOOM_MIN) {
      zoomScale = Math.max(ZOOM_MIN, +(zoomScale - ZOOM_STEP).toFixed(2));
      applyBookSize();
    }
  });

  /* ── re-size on window resize ── */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyBookSize, 250);
  });

  /* ── start ── */
  renderPDF();
})();
