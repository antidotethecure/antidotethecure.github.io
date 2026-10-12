/* SousShift AI — Ice Cream Trucks: route house counter core (no DOM).
   Shared by /ice-cream/route/ (browser, window.RouteCore) and scripts/ice-cream-route-sample.cjs (Node).
   Points are [lat, lon]. Distances in meters.

   How a "home" is counted:
   - Buildings come from OpenStreetMap (Overpass). In LA County most buildings come from the county's
     building import and carry lacounty:ain (the parcel number) and building:units.
   - Buildings on the same parcel are merged into one lot (so a back garage tagged "house" isn't a 2nd home).
   - A lot is on the route when any of its home buildings has its center within the buffer of the route line.
   - Lot with 1–4 units (house, duplex, triplex) -> "homes" (counts its units).
   - Lot with 5+ units or building=apartments -> "apartment building" (units from building:units /
     building:flats when tagged, else levels × footprint, else 8; always shown as an estimate).
   - Shops, garages, sheds, roofs, churches, schools… are skipped. building=yes counts only when small
     (30–250 m², a house-sized footprint) and has no business tags. */
(function (root) {
  "use strict";
  var R = 6371008.8, RAD = Math.PI / 180;

  var HOUSE = { house: 1, detached: 1, semidetached_house: 1, terrace: 1, bungalow: 1, residential: 1, cabin: 1, static_caravan: 1 };
  var APT = { apartments: 1, dormitory: 1 };
  var BIZ = ["shop", "amenity", "office", "craft", "tourism", "leisure", "healthcare", "industrial", "public_transport", "power"];
  var DEFAULT_APT_UNITS = 8, M2_PER_UNIT = 85;

  function proj(lat0) { var k = Math.cos(lat0 * RAD) * RAD * R; return function (p) { return [p[1] * k, p[0] * RAD * R]; }; }

  function lineLength(line) {
    var d = 0; for (var i = 1; i < line.length; i++) d += hav(line[i - 1], line[i]); return d;
  }
  function hav(a, b) {
    var dLat = (b[0] - a[0]) * RAD, dLon = (b[1] - a[1]) * RAD;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /* Distance from each point to the polyline. Uses a local flat projection (fine for a city-sized route). */
  function makeDist(line) {
    if (!line.length) return function () { return Infinity; };
    var lat0 = line[0][0], P = proj(lat0), xy = line.map(P), segs = [];
    for (var i = 0; i < xy.length; i++) {
      var a = xy[i], b = xy[i + 1] || a;
      segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1],
        x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) });
    }
    return function (p, cap) {
      var q = P(p), best = Infinity, c = cap || Infinity;
      for (var j = 0; j < segs.length; j++) {
        var s = segs[j];
        if (q[0] < s.x0 - c || q[0] > s.x1 + c || q[1] < s.y0 - c || q[1] > s.y1 + c) continue;
        var dx = s.bx - s.ax, dy = s.by - s.ay, L = dx * dx + dy * dy, t = L ? ((q[0] - s.ax) * dx + (q[1] - s.ay) * dy) / L : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var ex = s.ax + t * dx - q[0], ey = s.ay + t * dy - q[1], d = Math.sqrt(ex * ex + ey * ey);
        if (d < best) best = d;
      }
      return best;
    };
  }

  /* Cut the route into pieces of at most maxLen meters; each piece gives one small bbox [s,w,n,e] grown by pad meters. */
  function chunkBoxes(line, pad, maxLen) {
    maxLen = maxLen || 700; var boxes = [], cur = [line[0]], len = 0;
    function flush() {
      if (!cur.length) return;
      var s = 90, w = 180, n = -90, e = -180;
      cur.forEach(function (p) { s = Math.min(s, p[0]); n = Math.max(n, p[0]); w = Math.min(w, p[1]); e = Math.max(e, p[1]); });
      var dLat = pad / (R * RAD), dLon = pad / (R * RAD * Math.cos(((s + n) / 2) * RAD));
      boxes.push([s - dLat, w - dLon, n + dLat, e + dLon].map(function (v) { return +v.toFixed(6); }));
    }
    for (var i = 1; i < line.length; i++) {
      var d = hav(line[i - 1], line[i]);
      if (len + d > maxLen && cur.length > 1) { flush(); cur = [line[i - 1]]; len = 0; }
      // a single very long straight segment: split it
      if (d > maxLen) {
        var n = Math.ceil(d / maxLen);
        for (var k = 1; k <= n; k++) {
          var t = k / n, p = [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
          cur.push(p); if (k < n) { flush(); cur = [p]; }
        }
        len = d / n; continue;
      }
      cur.push(line[i]); len += d;
    }
    flush();
    return boxes;
  }

  /* One small query for one or a few boxes. "out tags bb" (bounding box, no full outline) keeps the answer light. */
  function overpassQuery(boxes) {
    if (typeof boxes[0] === "number") boxes = [boxes];
    return "[out:json][timeout:25];(" + boxes.map(function (b) { return "way[\"building\"](" + b.join(",") + ");"; }).join("") + ");out tags bb qt;";
  }

  function ringArea(g, P) {
    var s = 0, xy = g.map(P);
    for (var i = 0; i < xy.length - 1; i++) s += xy[i][0] * xy[i + 1][1] - xy[i + 1][0] * xy[i][1];
    return Math.abs(s) / 2;
  }
  function centroid(g) {
    var la = 0, lo = 0, n = g.length > 1 && g[0][0] === g[g.length - 1][0] && g[0][1] === g[g.length - 1][1] ? g.length - 1 : g.length;
    for (var i = 0; i < n; i++) { la += g[i][0]; lo += g[i][1]; }
    return [la / n, lo / n];
  }
  function num(v) { var n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }

  /* One OSM building way -> {id, parcel, c:[lat,lon], kind:'h'|'a'|null, units, est, area}. kind null = not a home. */
  function building(el) {
    var t = el.tags || {}, b = t.building, geom = (el.geometry || []).map(function (p) { return [p.lat, p.lon]; });
    if (!geom.length && el.bounds) { // bounding box only: use it as the outline (LA lots sit on a street grid)
      var B = el.bounds;
      geom = [[B.minlat, B.minlon], [B.minlat, B.maxlon], [B.maxlat, B.maxlon], [B.maxlat, B.minlon], [B.minlat, B.minlon]];
    }
    if (!geom.length) return null;
    var c = centroid(geom), area = ringArea(geom, proj(c[0])), kind = null;
    var units = num(t["building:units"]) || num(t["building:flats"]);
    var biz = BIZ.some(function (k) { return t[k]; }) || (t["building:use"] && !/resid/.test(t["building:use"]));
    if (APT[b]) kind = "a";
    else if (HOUSE[b] && !biz) kind = area < 25 && !units ? null : "h";
    else if (b === "yes" && !biz && area >= 30 && area <= 250) kind = "h";
    if (kind === "h" && units >= 5) kind = "a";
    var est = false;
    if (kind === "a" && !units) {
      var lv = num(t["building:levels"]);
      units = lv ? Math.max(2, Math.round(lv * area * 0.8 / M2_PER_UNIT)) : DEFAULT_APT_UNITS;
      est = true;
    }
    if (kind === "h") units = Math.max(1, Math.min(4, units || 1));
    return { id: el.id, parcel: t["lacounty:ain"] || null, c: c, kind: kind, units: units, est: est, area: area };
  }

  /* Buildings -> lots on the route. dist = function from makeDist(line). maxBuf = how far to keep (m).
     Returns [{c:[lat,lon], k:'h'|'a', u:units, d:meters, e:estimated?}] (one per lot). */
  function lots(elements, dist, maxBuf) {
    var seen = {}, groups = {}, order = [];
    elements.forEach(function (el) {
      if (el.type && el.type !== "way") return;
      if (seen[el.id]) return; seen[el.id] = 1;
      var b = building(el); if (!b || !b.kind) return;
      b.d = dist(b.c, maxBuf + 5);
      var key = b.parcel ? "p" + b.parcel : "w" + b.id;
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(b);
    });
    var out = [];
    order.forEach(function (key) {
      var g = groups[key], near = Infinity, main = g[0], apt = false, units = 0, est = false;
      g.forEach(function (b) {
        if (b.d < near) near = b.d;
        if (b.area > main.area) main = b;
        if (b.kind === "a") apt = true;
      });
      if (near > maxBuf) return;
      if (apt) {
        // apartment lot: take the tagged unit count (county tags every building on a lot with the lot's total)
        g.forEach(function (b) { if (b.kind === "a" && !b.est) units = Math.max(units, b.units); });
        if (!units) { g.forEach(function (b) { if (b.kind === "a") units += b.units; }); est = true; }
      } else {
        g.forEach(function (b) { units = Math.max(units, b.units); });
      }
      var nearest = g.reduce(function (a, b) { return b.d < a.d ? b : a; });
      out.push({ c: [+nearest.c[0].toFixed(6), +nearest.c[1].toFixed(6)], k: apt ? "a" : "h", u: units, d: Math.round(near), e: est || undefined });
    });
    return out;
  }

  function count(list, buf) {
    var r = { homes: 0, houseLots: 0, aptBldgs: 0, aptUnits: 0, total: 0 };
    list.forEach(function (l) {
      if (l.d > buf) return;
      if (l.k === "a") { r.aptBldgs++; r.aptUnits += l.u; } else { r.houseLots++; r.homes += l.u; }
    });
    r.total = r.homes + r.aptUnits;
    return r;
  }

  /* Google encoded polyline (precision 5) for share links. */
  function encode(pts) {
    var out = "", pl = 0, pn = 0;
    function enc(v) { v = v < 0 ? ~(v << 1) : v << 1; var s = ""; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); }
    pts.forEach(function (p) { var a = Math.round(p[0] * 1e5), b = Math.round(p[1] * 1e5); out += enc(a - pl) + enc(b - pn); pl = a; pn = b; });
    return out;
  }
  function decode(str) {
    var i = 0, lat = 0, lon = 0, pts = [];
    function dec() { var r = 0, s = 0, b; do { b = str.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20 && i <= str.length); return r & 1 ? ~(r >> 1) : r >> 1; }
    try {
      while (i < str.length) { lat += dec(); lon += dec(); if (!isFinite(lat) || !isFinite(lon)) break; pts.push([lat / 1e5, lon / 1e5]); }
    } catch (e) { return []; }
    return pts.filter(function (p) { return Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180; });
  }

  var API = { lineLength: lineLength, hav: hav, makeDist: makeDist, chunkBoxes: chunkBoxes, overpassQuery: overpassQuery,
    building: building, lots: lots, count: count, encode: encode, decode: decode, DEFAULT_APT_UNITS: DEFAULT_APT_UNITS };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.RouteCore = API;
})(this);
