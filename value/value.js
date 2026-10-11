/* SousShift AI value stack — /value/?o=christian | jurni
   DATA lives in value-data.js (window.VALUE = {sources, items, owners}). This file only renders. */
(function () {
  "use strict";
  var V = window.VALUE, $ = function (i) { return document.getElementById(i); };
  function usd(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var key = (new URLSearchParams(location.search).get("o") || "").toLowerCase();
  if (!V.owners[key]) key = "core";
  var O = V.owners[key], locs = O.locations || 1;

  $("who").innerHTML = O.who ? "<b>" + esc(O.who) + "</b>" + esc(O.places || "") : "";
  $("lead").innerHTML = O.lead;
  if (O.back) $("back").href = O.back; else $("back").style.display = "none";

  /* source numbering in order of first use */
  var order = [], num = {};
  function cite(ids) { return (ids || []).map(function (id) { if (!num[id]) { order.push(id); num[id] = order.length; } return num[id]; }); }

  var mo = { low: 0, typ: 0 }, once = { low: 0, typ: 0 }, html = "", grp = "";
  V.items.forEach(function (it) {
    var mult = it.perLocation ? locs : 1;
    if (!it.optional && it.count !== false) {
      var bucket = it.unit === "mo" ? mo : once;
      bucket.low += it.low * mult; bucket.typ += it.typ * mult;
    }
    if (it.group !== grp) { grp = it.group; html += '<div class="grp">' + esc(grp) + "</div>"; }
    var n = cite(it.src), price = it.low === it.typ ? usd(it.low) : usd(it.low) + "–" + usd(it.typ);
    var unit = it.unit === "mo" ? "/mo" : " one-time";
    var x = it.perLocation && locs > 1 ? " ×" + locs : "";
    html += '<div class="b' + (it.optional ? " opt" : "") + '"><div class="hd"><div class="ic">' + it.ic + '</div><div><h3>' + esc(it.name) + "</h3><p>" + esc(it.one) + "</p></div></div>" +
      '<div class="row"><span class="el">Elsewhere: ' + esc(it.tool) + " <b>~" + price + unit + x + "</b>" + (it.est ? " (est.)" : "") + (it.count === false ? " · not added to the total" : "") +
      ' <sup>' + n.join(",") + "</sup></span>" +
      (it.optional ? '<span class="inc">+ ' + esc(it.ours) + "</span>" : '<span class="inc">✓ Included</span>') + "</div></div>";
  });
  $("list").innerHTML = html;

  var yearLow = once.low + 12 * mo.low, yearTyp = once.typ + 12 * mo.typ, ours = O.setup + 12 * O.monthly;
  $("vs").innerHTML =
    '<div class="side them"><div class="t">Doing it piece by piece' + (locs > 1 ? " · " + locs + " restaurants" : "") + '</div>' +
      '<div class="big">~' + usd(mo.low) + "–" + usd(mo.typ) + '/mo</div><div class="sm">+ ' + usd(once.low) + "–" + usd(once.typ) + " up front</div>" +
      "<ul><li>" + V.vendorCount + "+ vendors, " + V.vendorCount + "+ logins and bills</li><li>You set it all up and make it work together</li><li>Nobody runs it all for you or answers for all of it</li></ul></div>" +
    '<div class="side us"><div class="t">SousShift AI' + (locs > 1 ? " · both restaurants" : "") + '</div>' +
      '<div class="big">' + usd(O.monthly) + '/mo</div><div class="sm">+ one ' + usd(O.setup) + " setup" + (locs > 1 ? ", covering both restaurants" : "") + "</div>" +
      "<ul><li>One person, one bill, one link</li><li>Done for you: built, set up, hosted and updated</li><li>Your customer list is yours</li></ul></div>";
  $("yr").innerHTML =
    "<span>First year, piece by piece</span><b>~" + usd(yearLow) + "–" + usd(yearTyp) + "</b>" +
    "<span>First year, SousShift (" + usd(O.setup) + " + 12 × " + usd(O.monthly) + ")</span><b>" + usd(ours) + "</b>" +
    '<span class="s">Difference in year one</span><b class="s">~' + usd(yearLow - ours) + "–" + usd(yearTyp - ours) + "</b>" +
    "<span>Break-even: guests who come back because of the app</span><b>" + Math.ceil(O.monthly / 25) + " visits/mo</b>" +
    '<span style="grid-column:1/-1;color:var(--dim);font-size:12.5px">At a $25 average visit, ' + Math.ceil(O.monthly / 25) + " extra visits a month cover " + usd(O.monthly) + "/mo. An estimate, not a promise.</span>";
  $("perf").innerHTML = O.perf;

  $("src").innerHTML = order.map(function (id) { var s = V.sources[id];
    return "<li>" + esc(s.label) + ' — <a href="' + esc(s.url) + '" rel="noopener nofollow" target="_blank">' + esc(s.url.replace(/^https?:\/\//, "")) + "</a> (checked " + esc(s.checked) + ")</li>"; }).join("");
  window.VALUE_TOTALS = { key: key, mo: mo, once: once, yearLow: yearLow, yearTyp: yearTyp, ours: ours };
})();
