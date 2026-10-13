/* SousShift app: live-apps showcase (merged from /demo/setup/). Filter chips, live phone preview, ?for= and ?type= links. */
(function () {
  var $ = function (i) { return document.getElementById(i); };
  var qs = new URLSearchParams(location.search);

  // ?for=Business  → "Made for Business" pill + carry it to the growth page
  var who = (qs.get("for") || "").slice(0, 60);
  if (who && $("forPill")) {
    $("forName").textContent = who; $("forPill").style.display = "block";
    if ($("growthLink")) $("growthLink").href = "../demo/growth/?for=" + encodeURIComponent(who);
  }

  // filter chips
  var fBtns = document.querySelectorAll("#xFilter button"), cards = document.querySelectorAll("#xGrid .xa");
  function filter(f) {
    fBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.f === f ? "true" : "false"); });
    cards.forEach(function (c) {
      var show = f === "all" || (" " + c.dataset.k + " ").indexOf(" " + f + " ") > -1;
      c.hidden = !show; c.classList.remove("in");
      if (show) { void c.offsetWidth; c.classList.add("in"); }
    });
  }
  fBtns.forEach(function (b) { b.addEventListener("click", function () { filter(b.dataset.f); }); });

  // truck links: ?type=truck|icecream|foodtruck → show trucks first
  var qt = (qs.get("type") || "").toLowerCase();
  if (/^(truck|trucks|icecream|ice-cream|foodtruck|food-truck)$/.test(qt)) {
    filter("truck");
    if (!location.hash) setTimeout(function () { var t = $("trucks"); if (t) t.scrollIntoView(); }, 60);
  }

  // live phone preview
  var dBtns = document.querySelectorAll("#xDemo button"), ph = $("xPh");
  dBtns.forEach(function (b) { b.addEventListener("click", function () {
    dBtns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    if (ph) ph.src = b.dataset.src;
  }); });
})();
