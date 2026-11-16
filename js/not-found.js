/* not-found.js: runs only on /404.html (GitHub Pages shows that page for any address that does not exist).
   Addresses here are case-sensitive, and a phone keyboard capitalises the first letter, so sousshift.com/Valenzo/ was a dead page.
   This sends a mistyped address to the real one: the whole path in lower case, and the usual spellings of "valenzo" (velenzio, valenzio, velenzo, valenso).
   It only ever redirects inside this site (location.origin is always put in front), and only once: a path that is already fixed is left alone. */
(function () {
  "use strict";
  function fix(path) {
    var s = String(path).toLowerCase().replace(/\/{2,}/g, "/").split("/");
    if (/^v[ae]l[ae]n[sz]i?o$/.test(s[1] || "")) { s[1] = "valenzo"; if (s.length === 2) s.push(""); }
    return s.join("/");
  }
  if (typeof module !== "undefined" && module.exports) { module.exports = fix; return; }   // node: tests/not-found.cjs
  var to = fix(location.pathname);
  if (to !== location.pathname) location.replace(location.origin + to + location.search + location.hash);
})();
