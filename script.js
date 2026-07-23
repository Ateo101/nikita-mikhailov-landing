(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Scroll / load reveals */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  requestAnimationFrame(() => {
    document.querySelectorAll(".hero .reveal").forEach((el) => {
      el.classList.add("is-visible");
    });
  });

  /* Portfolio tabs */
  const tabsRoot = document.querySelector("[data-tabs]");
  if (tabsRoot) {
    const tabs = Array.from(tabsRoot.querySelectorAll('[role="tab"]'));
    const panels = Array.from(tabsRoot.querySelectorAll('[role="tabpanel"]'));

    function activate(next) {
      tabs.forEach((tab) => {
        const selected = tab === next;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
      });

      panels.forEach((panel) => {
        const match = panel.id === next.getAttribute("aria-controls");
        panel.hidden = !match;
        panel.classList.toggle("is-active", match);
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activate(tab));
    });

    tabsRoot.querySelector(".tab-list")?.addEventListener("keydown", (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;

      let next = i;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      else return;

      e.preventDefault();
      tabs[next].focus();
      activate(tabs[next]);
    });
  }

  /* Lightbox with zoom / pan */
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  const imageEl = lightbox.querySelector("[data-lightbox-image]");
  const stageEl = lightbox.querySelector("[data-lightbox-stage]");
  const zoomLabel = lightbox.querySelector("[data-lightbox-zoom-label]");
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 0.25;

  let items = [];
  let index = 0;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let originTx = 0;
  let originTy = 0;
  let lastTap = 0;
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let lastFocused = null;

  function applyTransform() {
    imageEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    if (zoomLabel) zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    stageEl.style.cursor = scale > 1 ? (dragging ? "grabbing" : "grab") : "default";
  }

  function resetView() {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  function setZoom(next, clientX, clientY) {
    const prev = scale;
    scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));

    if (stageEl && clientX != null && clientY != null && prev !== scale) {
      const rect = stageEl.getBoundingClientRect();
      const cx = clientX - rect.left - rect.width / 2;
      const cy = clientY - rect.top - rect.height / 2;
      const ratio = scale / prev;
      tx = cx - (cx - tx) * ratio;
      ty = cy - (cy - ty) * ratio;
    }

    if (scale === 1) {
      tx = 0;
      ty = 0;
    }

    applyTransform();
  }

  function showItem(i) {
    if (!items.length) return;
    index = (i + items.length) % items.length;
    const item = items[index];
    imageEl.src = item.src;
    imageEl.alt = item.alt || "";
    resetView();
  }

  function openLightbox(trigger) {
    const gallery = trigger.closest(".gallery");
    if (!gallery) return;

    items = Array.from(gallery.querySelectorAll("[data-lightbox-trigger]")).map((btn) => {
      const img = btn.querySelector("img");
      return { src: img.currentSrc || img.src, alt: img.alt };
    });

    const triggers = Array.from(gallery.querySelectorAll("[data-lightbox-trigger]"));
    index = Math.max(0, triggers.indexOf(trigger));

    lastFocused = document.activeElement;
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    showItem(index);
    lightbox.querySelector("[data-lightbox-close]")?.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    imageEl.removeAttribute("src");
    items = [];
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  document.querySelectorAll("[data-lightbox-trigger]").forEach((btn) => {
    btn.addEventListener("click", () => openLightbox(btn));
  });

  lightbox.querySelectorAll("[data-lightbox-close]").forEach((el) => {
    el.addEventListener("click", closeLightbox);
  });

  lightbox.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => showItem(index - 1));
  lightbox.querySelector("[data-lightbox-next]")?.addEventListener("click", () => showItem(index + 1));
  lightbox.querySelector("[data-lightbox-zoom-in]")?.addEventListener("click", () => setZoom(scale + ZOOM_STEP));
  lightbox.querySelector("[data-lightbox-zoom-out]")?.addEventListener("click", () => setZoom(scale - ZOOM_STEP));
  lightbox.querySelector("[data-lightbox-zoom-reset]")?.addEventListener("click", resetView);

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") showItem(index - 1);
    else if (e.key === "ArrowRight") showItem(index + 1);
    else if (e.key === "+" || e.key === "=") setZoom(scale + ZOOM_STEP);
    else if (e.key === "-" || e.key === "_") setZoom(scale - ZOOM_STEP);
    else if (e.key === "0") resetView();
  });

  stageEl.addEventListener(
    "wheel",
    (e) => {
      if (lightbox.hidden) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom(scale + delta, e.clientX, e.clientY);
    },
    { passive: false }
  );

  stageEl.addEventListener("dblclick", (e) => {
    if (scale > 1) resetView();
    else setZoom(2, e.clientX, e.clientY);
  });

  stageEl.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (scale <= 1) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    originTx = tx;
    originTy = ty;
    stageEl.classList.add("is-dragging");
    stageEl.setPointerCapture(e.pointerId);
  });

  stageEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    tx = originTx + (e.clientX - dragStartX);
    ty = originTy + (e.clientY - dragStartY);
    applyTransform();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    stageEl.classList.remove("is-dragging");
    if (e && stageEl.hasPointerCapture?.(e.pointerId)) {
      stageEl.releasePointerCapture(e.pointerId);
    }
    applyTransform();
  }

  stageEl.addEventListener("pointerup", endDrag);
  stageEl.addEventListener("pointercancel", endDrag);

  stageEl.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap < 300) {
        e.preventDefault();
        if (scale > 1) resetView();
        else setZoom(2, e.touches[0].clientX, e.touches[0].clientY);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    }

    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      pinchStartDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchStartScale = scale;
    }
  }, { passive: false });

  stageEl.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = e.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        setZoom(pinchStartScale * (dist / pinchStartDist), midX, midY);
      }
    },
    { passive: false }
  );
})();
