/* SousShift AI — Mobile Mechanic demo: vehicle data. Exposes window.VEH.
   All sources are free U.S. government APIs, no key, CORS-enabled (checked 2026-10-13):
     vPIC   https://vpic.nhtsa.dot.gov/api/vehicles/  GetMakesForVehicleType, GetModelsForMakeYear, DecodeVinValues  (Access-Control-Allow-Origin: *)
     NHTSA  https://api.nhtsa.gov/recalls/recallsByVehicle + /complaints/complaintsByVehicle  (echoes the page's Origin)
   Responses are cached in this browser's localStorage (summaries only: a complaints response can be 1 MB).
   vPIC model lists have NO trims. Trim / engine / drivetrain / body come from a VIN decode, or the customer picks them. */
(function () {
  "use strict";
  var W = window, VPIC = "https://vpic.nhtsa.dot.gov/api/vehicles/", NAPI = "https://api.nhtsa.gov/";
  var CK = "ssai:mech:cache:", DAY = 864e5;

  /* ---------- cache ---------- */
  function cget(k, ttl) {
    try { var v = JSON.parse(localStorage.getItem(CK + k)); if (v && Date.now() - v.at < ttl) return v.v; } catch (e) {}
    return null;
  }
  function cset(k, v) {
    try { localStorage.setItem(CK + k, JSON.stringify({ at: Date.now(), v: v })); }
    catch (e) {   // quota: drop our older cache entries and try once more
      try { Object.keys(localStorage).forEach(function (x) { if (x.indexOf(CK) === 0) localStorage.removeItem(x); }); localStorage.setItem(CK + k, JSON.stringify({ at: Date.now(), v: v })); } catch (e2) {}
    }
  }
  var inflight = {};
  function getJSON(url) {
    if (inflight[url]) return inflight[url];
    var p = fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    inflight[url] = p; p.then(function () { delete inflight[url]; }, function () { delete inflight[url]; });
    return p;
  }
  function cached(k, ttl, make) {
    var hit = cget(k, ttl); if (hit) return Promise.resolve(hit);
    return make().then(function (v) { cset(k, v); return v; });
  }

  /* ---------- names ---------- */
  var UP = { BMW: 1, GMC: 1, RAM: 1, MINI: 1, KIA: 0, VW: 1, AMC: 1, MG: 1, BYD: 1, SRT: 1, USA: 1, LLC: 1, INC: 1, II: 1, III: 1 };
  function title(s) {
    return String(s || "").toLowerCase().replace(/(^|[\s\-\/(&])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); })
      .replace(/\b[A-Za-z]+\b/g, function (w) { return UP[w.toUpperCase()] ? w.toUpperCase() : w; });
  }
  /* most-shopped makes in the U.S., pinned to the top of the make list */
  var POPULAR = ["TOYOTA", "HONDA", "FORD", "CHEVROLET", "NISSAN", "HYUNDAI", "KIA", "JEEP", "RAM", "GMC", "SUBARU", "TESLA", "MAZDA", "VOLKSWAGEN", "BMW", "MERCEDES-BENZ", "LEXUS", "DODGE", "AUDI", "ACURA"];

  /* ---------- makes / models ---------- */
  function makes() {
    return cached("makes:v1", 30 * DAY, function () {
      return Promise.all(["car", "truck", "mpv"].map(function (ty) {
        return getJSON(VPIC + "GetMakesForVehicleType/" + ty + "?format=json").then(function (d) { return d.Results || []; }, function () { return null; });
      })).then(function (res) {
        if (res.every(function (r) { return r === null; })) throw new Error("makes");
        var set = {}; res.forEach(function (r) { (r || []).forEach(function (m) { var n = String(m.MakeName || "").trim().toUpperCase(); if (n) set[n] = 1; }); });
        return Object.keys(set).sort();
      });
    });
  }
  /* -> [{ name, type: car|truck|mpv }] */
  function models(make, year) {
    var k = "models:v1:" + make + "|" + year;
    return cached(k, 30 * DAY, function () {
      return Promise.all(["car", "truck", "mpv"].map(function (ty) {
        return getJSON(VPIC + "GetModelsForMakeYear/make/" + encodeURIComponent(make) + "/modelyear/" + year + "/vehicletype/" + ty + "?format=json")
          .then(function (d) { return (d.Results || []).map(function (m) { return { name: String(m.Model_Name).trim(), type: ty }; }); }, function () { return null; });
      })).then(function (res) {
        if (res.every(function (r) { return r === null; })) throw new Error("models");
        var seen = {}, out = [];
        res.forEach(function (r) { (r || []).forEach(function (m) { if (m.name && !seen[m.name.toUpperCase()]) { seen[m.name.toUpperCase()] = 1; out.push(m); } }); });
        return out.sort(function (a, b) { return a.name.localeCompare(b.name); });
      });
    });
  }

  /* ---------- body style ---------- */
  var RX = {
    truck: /\b(f-?\d{3}|silverado|sierra|ram|1500|2500|3500|tacoma|tundra|frontier|titan|ranger|colorado|canyon|ridgeline|gladiator|maverick|santa cruz|cybertruck|r1t|lightning|pickup|hardbody|s-?10|s15|dakota|avalanche|d-?21|t100|b-?series|mighty max|sonoma|hombre|i-?\d{3,4}|raider|baja|el camino|silverado ev|hummer ev pickup)\b/i,
    van: /\b(odyssey|sienna|pacifica|caravan|carnival|sedona|transit|sprinter|express|savana|promaster|quest|town (and|&) country|nv\d*|metris|e-?\d{3}|econoline|van|voyager|previa|astro|safari|venture|montana|uplander|windstar|freestar|mpv|routan|entourage|nautilus|bus|id\. buzz)\b/i,
    coupe: /\b(coupe|mustang|camaro|challenger|corvette|brz|gr86|86|frs|fr-s|miata|mx-5|370z|350z|z|supra|rc|86|tt|911|cayman|boxster|crossfire|solstice|sky|genesis coupe|tiburon|eclipse|celica|prelude|s2000|rx-?8|cr-?z|veloster)\b/i,
    hatch: /\b(fit|yaris|golf|gti|mini|cooper|hatch(back)?|spark|versa note|sonic|leaf|bolt|prius|mirage|rio5|accent hatch|i3|cube|juke|kona|soul|matrix|vibe|xb|xd|aveo|fiesta|500|c-?max|e-?golf)\b/i,
    suv: /\b(suv|cr-?v|rav4|explorer|escape|edge|expedition|tahoe|suburban|yukon|equinox|traverse|blazer|trailblazer|wrangler|cherokee|grand cherokee|compass|renegade|4runner|highlander|sequoia|land cruiser|pilot|passport|hr-?v|rogue|pathfinder|armada|murano|kicks|tucson|santa fe|palisade|sorento|sportage|telluride|forester|outback|ascent|crosstrek|cx-?\d+|tiguan|atlas|model [xy]|q\d|x\d|gl[a-z]?|ml|rx|nx|gx|lx|mdx|rdx|xt\d|escalade|navigator|aviator|durango|journey|bronco|terrain|acadia|envision|encore|enclave|xc\d+|macan|cayenne|range rover|defender|discovery|venza|bz4x|mach-e|id\.4|ev9|ioniq 5|ariya|r1s|solterra)\b/i
  };
  /* vPIC BodyClass (from a VIN) wins; otherwise the vehicle type the model was listed under + its name */
  function bodyFrom(bodyClass, type, name) {
    var b = String(bodyClass || "").toLowerCase(), n = String(name || "");
    if (b) {
      if (/pickup/.test(b)) return "truck";
      if (/van|minivan/.test(b)) return "van";
      if (/sport utility|suv|crossover|cuv|mpv/.test(b)) return "suv";
      if (/coupe|convertible|roadster/.test(b)) return "coupe";
      if (/hatchback|liftback/.test(b)) return "hatch";
      if (/wagon/.test(b)) return "suv";
      if (/sedan|saloon/.test(b)) return "sedan";
    }
    if (type === "truck") return RX.van.test(n) ? "van" : RX.suv.test(n) ? "suv" : "truck";
    if (type === "mpv") return RX.van.test(n) ? "van" : RX.truck.test(n) ? "truck" : "suv";
    if (type === "car") return RX.coupe.test(n) ? "coupe" : RX.hatch.test(n) ? "hatch" : "sedan";
    if (RX.truck.test(n) && !RX.suv.test(n)) return "truck";
    if (RX.van.test(n)) return "van";
    if (RX.suv.test(n)) return "suv";
    if (RX.coupe.test(n)) return "coupe";
    if (RX.hatch.test(n)) return "hatch";
    return "sedan";
  }

  /* ---------- VIN ---------- */
  function decodeVin(vin) {
    return getJSON(VPIC + "DecodeVinValues/" + encodeURIComponent(vin) + "?format=json").then(function (d) {
      var r = (d.Results || [])[0] || {};
      if (!r.Make || !r.ModelYear) throw new Error("nodecode");
      var fuel = String(r.FuelTypePrimary || ""), el = String(r.ElectrificationLevel || "");
      var ev = /electric/i.test(fuel) && !/gasoline|diesel/i.test(fuel) || /BEV/.test(el);
      var hyb = !ev && (/HEV|PHEV|hybrid/i.test(el) || /electric/i.test(String(r.FuelTypeSecondary || "")));
      var drive = String(r.DriveType || ""), dv = /4x4|4WD|4-Wheel/i.test(drive) ? "4WD" : /AWD|All/i.test(drive) ? "AWD" : /FWD|Front/i.test(drive) ? "FWD" : /RWD|Rear/i.test(drive) ? "RWD" : "";
      var L = parseFloat(r.DisplacementL);
      return {
        year: String(r.ModelYear), make: String(r.Make).toUpperCase(), model: r.Model || "", trim: [r.Trim, r.Series].filter(Boolean).join(" ").trim(),
        engine: ev ? "EV" : L ? (Math.round(L * 10) / 10).toFixed(1) : "", cyl: r.EngineCylinders || "",
        fuel: ev ? "electric" : hyb ? "hybrid" : /diesel/i.test(fuel) ? "diesel" : fuel ? "gas" : "",
        drive: dv, body: bodyFrom(r.BodyClass, "", r.Model), bodyClass: r.BodyClass || "",
        abs: /standard/i.test(String(r.ABS || "")) ? "yes" : ""
      };
    });
  }

  /* ---------- recalls + complaints ---------- */
  function q(make, model, year) { return "make=" + encodeURIComponent(make) + "&model=" + encodeURIComponent(model) + "&modelYear=" + encodeURIComponent(year); }
  function recallsUrl(make, model, year) { return NAPI + "recalls/recallsByVehicle?" + q(make, model, year); }
  function complaintsUrl(make, model, year) { return NAPI + "complaints/complaintsByVehicle?" + q(make, model, year); }
  function recalls(make, model, year) {
    return cached("recalls:v1:" + [make, model, year].join("|").toUpperCase(), DAY, function () {
      return getJSON(recallsUrl(make, model, year)).then(function (d) {
        return (d.results || []).map(function (r) {
          return { id: r.NHTSACampaignNumber, comp: r.Component || "", date: r.ReportReceivedDate || "", summary: r.Summary || "", remedy: r.Remedy || "",
            consequence: r.Consequence || "", parkIt: !!r.parkIt, parkOutSide: !!r.parkOutSide, ota: !!r.overTheAirUpdate };
        }).sort(function (a, b) { return (b.parkIt - a.parkIt) || (b.parkOutSide - a.parkOutSide) || String(b.id).localeCompare(String(a.id)); });
      });
    });
  }
  function complaints(make, model, year) {
    return cached("complaints:v1:" + [make, model, year].join("|").toUpperCase(), 7 * DAY, function () {
      return getJSON(complaintsUrl(make, model, year)).then(function (d) {
        var c = {}, n = 0, crash = 0, fire = 0;
        (d.results || []).forEach(function (x) {
          n++; if (x.crash) crash++; if (x.fire) fire++;
          String(x.components || "").split(",").forEach(function (p) { p = p.trim(); if (p) c[p] = (c[p] || 0) + 1; });
        });
        var top = Object.keys(c).map(function (k) { return [k, c[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
        return { total: n, crash: crash, fire: fire, top: top.slice(0, 8) };
      });
    });
  }
  /* NHTSA component name -> one of our services (so "Check it" can open the right sheet) */
  function compSvc(comp) {
    var c = String(comp || "").toUpperCase();
    if (/SERVICE BRAKES|PARKING BRAKE/.test(c)) return "brakes";
    if (/AIR BAG|SEAT BELT/.test(c)) return null;            // dealer recall / airbag specialist, not a mobile job
    if (/ENGINE|COOLING/.test(c)) return "engine";
    if (/ELECTRICAL/.test(c)) return "battery";
    if (/STEERING|SUSPENSION/.test(c)) return "susp";
    if (/EXTERIOR LIGHTING/.test(c)) return "lights";
    if (/VISIBILITY|WIPER/.test(c)) return "wipers";
    if (/TIRES|WHEELS/.test(c)) return "tires";
    if (/LATCHES|LOCKS/.test(c)) return "doors";
    if (/POWER TRAIN|FUEL|PROPULSION|SPEED CONTROL/.test(c)) return "diag";
    return null;
  }

  /* all-electric makes / models (so an EV picked without a VIN skips oil, plugs, exhaust) */
  var EVMAKE = /^(TESLA|RIVIAN|LUCID|POLESTAR|FISKER|VINFAST)$/i, EVMODEL = /\b(leaf|bolt|ev\d?|e-?tron|lightning|mach-e|id\.\s?\d|ioniq\s?[56]|ioniq electric|kona electric|niro ev|ariya|bz4x|solterra|i3|i4|ix|i7|eqs|eqe|eqb|taycan|e-?golf|spark ev|focus electric|model [sx3y]|cybertruck|prologue|zdx|blazer ev|equinox ev|silverado ev|hummer ev|lyriq|optiq|c40 recharge|xc40 recharge|ex30|ex90)\b/i;
  function isEV(make, model) { return EVMAKE.test(String(make || "")) || EVMODEL.test(String(model || "")); }
  W.VEH = { isEV: isEV, makes: makes, models: models, decodeVin: decodeVin, recalls: recalls, complaints: complaints, recallsUrl: recallsUrl, complaintsUrl: complaintsUrl,
    bodyFrom: bodyFrom, title: title, POPULAR: POPULAR, compSvc: compSvc };
})();
