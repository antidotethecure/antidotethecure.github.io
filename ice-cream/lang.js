/* SousShift AI — Ice Cream Trucks: English / Spanish switch for /ice-cream/ and /ice-cream/demo/.
   Each page defines window.T = {en:{key:"…"}, es:{key:"…"}} before loading this file.
   Elements: data-t="key" (innerHTML), data-t-ph="key" (placeholder), data-t-alt="key" (img alt), data-t-aria="key" (aria-label).
   Buttons with data-lang="en|es" switch. Choice remembered in localStorage "ssai:ice:lang"; ?lang=es overrides.
   API: window.ICE.lang, ICE.t(key), ICE.set(lang), ICE.on(fn) — fn(lang) runs after every switch. */
(function () {
  "use strict";
  var KEY = "ssai:ice:lang", T = window.T || { en: {}, es: {} }, subs = [];
  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(l) { try { localStorage.setItem(KEY, l); } catch (e) {} }
  var q = (location.search.match(/[?&]lang=(en|es)\b/) || [])[1];
  var nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  var cur = q || read() || (nav === "es" ? "es" : "en");
  if (q) save(q); // a texted ?lang=es link keeps Spanish on every page they open next
  function t(k) { var d = T[cur] || T.en; return d[k] != null ? d[k] : (T.en[k] != null ? T.en[k] : k); }
  function apply() {
    document.documentElement.lang = cur;
    document.querySelectorAll("[data-t]").forEach(function (el) { el.innerHTML = t(el.getAttribute("data-t")); });
    document.querySelectorAll("[data-t-ph]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-t-ph")); });
    document.querySelectorAll("[data-t-alt]").forEach(function (el) { el.alt = t(el.getAttribute("data-t-alt")); });
    document.querySelectorAll("[data-t-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-t-aria"))); });
    document.querySelectorAll("[data-lang]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-lang") === cur ? "true" : "false"); });
    if (T[cur] && T[cur]._title) document.title = T[cur]._title;
    subs.forEach(function (fn) { try { fn(cur); } catch (e) { console.error(e); } });
  }
  function set(l) { if (l !== "en" && l !== "es") return; cur = l; save(l); apply(); }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-lang]");
    if (b) { ev.preventDefault(); set(b.getAttribute("data-lang")); }
  });
  window.ICE = { get lang() { return cur; }, t: t, set: set, on: function (fn) { subs.push(fn); }, apply: apply };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
})();
