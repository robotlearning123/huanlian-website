(function () {
  const body = document.body;
  const header = document.querySelector("[data-site-header]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const primaryNav = document.querySelector("[data-primary-nav]");

  if (header) {
    const updateHeaderScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    updateHeaderScroll();
    window.addEventListener("scroll", updateHeaderScroll, { passive: true });
  }

  // Scroll-triggered reveal (Neuralink/SpaceX feel)
  // NOTE: child cards (.compact-card, .product-card, .overview-grid li, etc.)
  // are styled opacity:0 by default and require an ancestor .is-visible to
  // appear, so the parent sections in this selector list cannot be removed
  // without breaking the card cascade.
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    const targets = document.querySelectorAll(
      ".page-hero, .section-band, .cinematic-band, .stack-with-media, .product-card, .demo-band, .capability-block, .architecture-flow article, .application-list article, .evidence-grid article"
    );
    targets.forEach((el) => el.classList.add("reveal"));
    // Mark any element already in or above the viewport visible immediately so
    // they never paint at opacity:0 on initial render.
    const vh = window.innerHeight;
    targets.forEach((el) => {
      if (el.getBoundingClientRect().top < vh) {
        el.classList.add("is-visible");
      }
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px 25% 0px", threshold: 0 }
    );
    targets.forEach((el) => {
      if (!el.classList.contains("is-visible")) io.observe(el);
    });
    // Safety fallback: any reveal element still hidden after 1.5s gets shown
    // — guards against IO never firing (e.g. in static screenshots or when
    // the user lands deep-linked and never scrolls).
    window.setTimeout(() => {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => {
        el.classList.add("is-visible");
      });
    }, 1500);
  }

  // Lazy autoplay for cinematic / hero loops; hover-to-play for shop cards
  if ("IntersectionObserver" in window) {
    const allLooping = document.querySelectorAll("video[autoplay][muted][loop]");
    const cardVideos = [];
    const inViewVideos = [];
    allLooping.forEach((v) => {
      // Hero loop must play immediately on load; first impression beats bandwidth savings.
      if (v.classList.contains("hero-loop")) {
        v.preload = "auto";
        return;
      }
      v.removeAttribute("autoplay");
      v.preload = "metadata";
      try { v.pause(); } catch (e) {}
      if (v.closest(".product-thumb")) {
        cardVideos.push(v);
      } else {
        inViewVideos.push(v);
      }
    });
    // In-view autoplay: cinematic banners, demo backgrounds
    if (inViewVideos.length) {
      const playObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target;
            if (entry.isIntersecting) {
              if (el.readyState < 2) el.load();
              if (el.paused) el.play().catch(() => {});
            } else {
              if (!el.paused) el.pause();
            }
          });
        },
        { rootMargin: "0px", threshold: 0.15 }
      );
      inViewVideos.forEach((v) => playObserver.observe(v));
    }
    // Hover-to-play: shop product card thumbnails. Saves CPU on a 16-card grid.
    cardVideos.forEach((v) => {
      const fig = v.closest(".product-thumb");
      const start = () => v.play().catch(() => {});
      const stop = () => { v.pause(); v.currentTime = 0; };
      fig.addEventListener("pointerenter", start);
      fig.addEventListener("pointerleave", stop);
      fig.addEventListener("focusin", start);
      fig.addEventListener("focusout", stop);
      // Touch: tap once to start, tap again to stop
      fig.addEventListener("touchstart", () => {
        if (v.paused) start(); else stop();
      }, { passive: true });
    });
  }

  // Soft parallax on cinematic banner backgrounds
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const bgs = document.querySelectorAll(".cinematic-band > .cinematic-bg");
    if (bgs.length) {
      let ticking = false;
      const update = () => {
        const vh = window.innerHeight;
        bgs.forEach((bg) => {
          const r = bg.parentElement.getBoundingClientRect();
          const c = r.top + r.height / 2 - vh / 2;
          const shift = Math.max(-40, Math.min(40, -c * 0.06));
          bg.style.transform = `translate3d(0, ${shift}px, 0) scale(1.08)`;
        });
        ticking = false;
      };
      window.addEventListener(
        "scroll",
        () => {
          if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
          }
        },
        { passive: true }
      );
      update();
    }
  }

  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", () => {
      const nextState = navToggle.getAttribute("aria-expanded") !== "true";
      navToggle.setAttribute("aria-expanded", String(nextState));
      body.classList.toggle("nav-open", nextState);
    });

    primaryNav.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        navToggle.setAttribute("aria-expanded", "false");
        body.classList.remove("nav-open");
      }
    });
  }

  const activePage = body.dataset.page;
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    if (link.dataset.navLink === activePage) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });

  document.querySelectorAll("[data-module-tabs]").forEach((root) => {
    const tabs = Array.from(root.querySelectorAll("[data-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-panel]"));

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;

        tabs.forEach((item) => {
          item.setAttribute("aria-selected", String(item === tab));
        });

        panels.forEach((panel) => {
          const isActive = panel.dataset.panel === target;
          panel.toggleAttribute("hidden", !isActive);
          panel.classList.toggle("is-active", isActive);
        });
      });
    });
  });

  const canvas = document.getElementById("signalCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0;
  let height = 0;
  let frame = 0;

  function resizeCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function drawSignal() {
    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;

    const lanes = Math.max(5, Math.floor(height / 120));
    for (let lane = 0; lane < lanes; lane += 1) {
      const yBase = (height / (lanes + 1)) * (lane + 1);
      const hueColor = lane % 2 === 0 ? "rgba(126, 228, 189, 0.32)" : "rgba(215, 173, 98, 0.24)";

      context.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const pulse = Math.sin((x + frame * (1.6 + lane * 0.24)) * 0.026 + lane);
        const spike = Math.sin((x + frame * 2.1) * 0.082 + lane * 1.7);
        const y = yBase + pulse * 14 + Math.max(0, spike) * 9;

        if (x === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.strokeStyle = hueColor;
      context.stroke();
    }

    context.fillStyle = "rgba(246, 241, 232, 0.18)";
    for (let i = 0; i < 90; i += 1) {
      const x = (i * 97 + frame * 0.7) % width;
      const y = (i * 53) % height;
      context.fillRect(x, y, 1, 1);
    }

    frame += prefersReducedMotion.matches ? 0 : 1;
    window.requestAnimationFrame(drawSignal);
  }

  resizeCanvas();
  drawSignal();
  window.addEventListener("resize", resizeCanvas);
})();

(function newsFilter() {
  var filters = document.querySelectorAll("[data-news-filter]");
  if (!filters.length) return;
  var items = document.querySelectorAll("[data-news-cat]");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cat = btn.dataset.newsFilter;
      filters.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      items.forEach(function (it) {
        it.classList.toggle("is-hidden", cat !== "all" && it.dataset.newsCat !== cat);
      });
    });
  });
})();

(function mailtoForms() {
  var forms = document.querySelectorAll("form[data-mailto-form]");
  forms.forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var to = form.dataset.mailtoTo || "AstroMind@xnzlsmart.cn";
      var subject = form.dataset.mailtoSubject || "Inquiry";
      var lines = [];
      form.querySelectorAll("input, select, textarea").forEach(function (f) {
        if (!f.name || !f.value || f.type === "hidden") return;
        var label = (form.querySelector('label[for="' + f.id + '"]') || {}).textContent || f.name;
        lines.push(label.replace(/\s*\*\s*$/, "").trim() + ": " + f.value);
      });
      var prodInput = form.querySelector("[data-quote-products]");
      if (prodInput && prodInput.value) {
        lines.unshift("产品清单 / Products:\n" + prodInput.value, "");
      }
      var url = "mailto:" + to +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      window.location.href = url;
    });
  });
})();

(function quoteCart() {
  var buttons = document.querySelectorAll("[data-add-quote]");
  if (!buttons.length) return;
  var listEl = document.querySelector("[data-quote-cart-list]");
  var hiddenInput = document.querySelector("[data-quote-products]");
  var countEl = document.querySelector("[data-quote-count]");
  var bar = document.querySelector("[data-quote-bar]");
  var cart = [];
  var quoteCopy = {
    zh: {
      empty: "尚未添加产品。请在上方产品卡片点击「+ 询价单」。",
      unnamed: "未命名产品",
      remove: "移除",
      added: "✓ 已加入",
      add: "+ 询价单",
    },
    en: {
      empty: "No products yet. Click \"+ Quote list\" on a card above to add.",
      unnamed: "Unnamed product",
      remove: "Remove",
      added: "✓ Added",
      add: "+ Quote list",
    },
  };

  function currentQuoteCopy() {
    return document.documentElement.lang.toLowerCase().startsWith("en") ? quoteCopy.en : quoteCopy.zh;
  }

  function render() {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!cart.length) {
      var empty = document.createElement("li");
      empty.className = "quote-cart-empty";
      empty.dataset.i18n = "shop.quote.empty";
      empty.textContent = currentQuoteCopy().empty;
      listEl.appendChild(empty);
    } else {
      cart.forEach(function (name) {
        var li = document.createElement("li");
        li.className = "quote-cart-item";
        var span = document.createElement("span");
        span.textContent = name;
        var rm = document.createElement("button");
        rm.type = "button";
        rm.className = "quote-cart-remove";
        rm.setAttribute("aria-label", currentQuoteCopy().remove);
        rm.textContent = "×";
        rm.addEventListener("click", function () {
          var i = cart.indexOf(name);
          if (i !== -1) cart.splice(i, 1);
          render();
        });
        li.appendChild(span);
        li.appendChild(rm);
        listEl.appendChild(li);
      });
    }
    if (hiddenInput) hiddenInput.value = cart.map(function (n, i) { return (i + 1) + ". " + n; }).join("\n");
    if (countEl) countEl.textContent = String(cart.length);
    if (bar) bar.hidden = cart.length === 0;
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest(".product-card");
      var h3 = card && card.querySelector("h3");
      var name = (h3 && h3.textContent.trim()) || currentQuoteCopy().unnamed;
      if (cart.indexOf(name) === -1) cart.push(name);
      render();
      btn.classList.add("is-added");
      btn.textContent = currentQuoteCopy().added;
      setTimeout(function () {
        btn.classList.remove("is-added");
        btn.textContent = currentQuoteCopy().add;
      }, 1400);
    });
  });

  render();
})();
