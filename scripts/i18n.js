(function () {
  const STORE_KEY = "huanlian.lang";

  // Default registry — overridden when lang/registry.json loads. Adding a new
  // language only requires (1) dropping a new lang/<code>.json and (2)
  // appending an entry to lang/registry.json — no JS edits needed.
  let registry = {
    default: "zh",
    languages: [
      { code: "zh", label: "ZH", htmlLang: "zh-CN", ariaLabel: "Switch to Chinese", switchLabelTo: "EN" },
      { code: "en", label: "EN", htmlLang: "en",    ariaLabel: "Switch to English", switchLabelTo: "ZH" },
    ],
  };

  function supportedCodes() {
    return registry.languages.map((l) => l.code);
  }

  function getLangMeta(code) {
    return registry.languages.find((l) => l.code === code) || registry.languages[0];
  }

  function pickLang() {
    const url = new URL(location.href);
    const fromUrl = url.searchParams.get("lang");
    if (fromUrl && supportedCodes().includes(fromUrl)) return fromUrl;
    const stored = localStorage.getItem(STORE_KEY);
    if (stored && supportedCodes().includes(stored)) return stored;
    // Auto-detect from navigator if browser hint matches a supported language
    const navHint = (navigator.language || "").toLowerCase();
    for (const meta of registry.languages) {
      const codeLower = meta.code.toLowerCase();
      const htmlLower = (meta.htmlLang || "").toLowerCase();
      if (navHint === codeLower || navHint.startsWith(codeLower + "-") || navHint === htmlLower) {
        return meta.code;
      }
    }
    return registry.default;
  }

  function get(dict, key) {
    return key.split(".").reduce((o, k) => (o == null ? o : o[k]), dict);
  }

  function applyDict(dict) {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const val = get(dict, el.dataset.i18n);
      if (typeof val === "string") el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const val = get(dict, el.dataset.i18nHtml);
      if (typeof val === "string") el.innerHTML = val;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        const val = get(dict, key);
        if (typeof val === "string" && attr) el.setAttribute(attr, val);
      });
    });
  }

  async function loadJSON(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  }

  async function loadDict(code) {
    return loadJSON(`lang/${code}.json`);
  }

  function revealReady() {
    const root = document.documentElement;
    root.classList.remove("i18n-await");
    root.classList.add("i18n-ready");
  }

  async function setLang(code) {
    const target = supportedCodes().includes(code) ? code : registry.default;
    try {
      const dict = await loadDict(target);
      applyDict(dict);
      const meta = getLangMeta(target);
      document.documentElement.lang = meta.htmlLang || target;
      localStorage.setItem(STORE_KEY, target);
      revealReady();

      const url = new URL(location.href);
      if (target === registry.default) url.searchParams.delete("lang");
      else url.searchParams.set("lang", target);
      history.replaceState(null, "", url.toString());

      // Update toggle button(s). For 2-language, simple flip; for >2 we
      // could swap to a <select> — handled via the languages registry.
      document.querySelectorAll("[data-lang-switch]").forEach((btn) => {
        if (registry.languages.length === 2) {
          const codes = supportedCodes();
          const nextCode = codes[(codes.indexOf(target) + 1) % codes.length];
          const nextMeta = getLangMeta(nextCode);
          btn.textContent = nextMeta.label || meta.switchLabelTo;
          btn.setAttribute("aria-label", nextMeta.ariaLabel || `Switch to ${nextCode}`);
        } else {
          // For >=3 languages, render a dropdown next to the button if not yet upgraded
          ensureLangPicker(btn, target);
        }
      });
    } catch (err) {
      console.warn("i18n load failed:", err);
      revealReady();
    }
  }

  function ensureLangPicker(btnEl, currentCode) {
    if (btnEl.dataset.upgraded === "1") {
      // refresh selected option
      const sel = btnEl.querySelector("select");
      if (sel) sel.value = currentCode;
      return;
    }
    btnEl.textContent = "";
    const sel = document.createElement("select");
    sel.className = "lang-picker";
    sel.setAttribute("aria-label", "Change language");
    registry.languages.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.code;
      opt.textContent = l.label;
      if (l.code === currentCode) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", (e) => setLang(e.target.value));
    btnEl.appendChild(sel);
    btnEl.dataset.upgraded = "1";
  }

  async function init() {
    try {
      const r = await loadJSON("lang/registry.json");
      if (r && Array.isArray(r.languages) && r.languages.length) {
        registry = { default: r.default || r.languages[0].code, languages: r.languages };
      }
    } catch (e) {
      // fall back to built-in registry
    }
    const initial = pickLang();
    setLang(initial);
    document.querySelectorAll("[data-lang-switch]").forEach((btn) => {
      if (registry.languages.length === 2) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const cur = localStorage.getItem(STORE_KEY) || registry.default;
          const supp = supportedCodes();
          const idx = supp.indexOf(cur);
          const next = supp[(idx + 1) % supp.length];
          setLang(next);
        });
      }
    });
  }

  // Safety net: even if registry/dict fail to load, never leave the body
  // hidden indefinitely.
  setTimeout(revealReady, 1200);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.huanlianI18n = { setLang, getRegistry: () => registry };
})();
