/* SousShift AI — Ice Cream Trucks: the map truck marker + the ice cream "blimp" above it (Night Route colors).
   Hand-drawn SVG, no images, no credits.

   IceTruck.html()            → marker HTML: <div class="itk"> blimp + step-van + ground shadow </div>
   IceTruck.Blimp(root, opts) → controller for the blimp inside that marker:
       .update({ d, clock })  d = meters from the customer's location to the truck (null = no location shared)
                              clock = feed time in seconds (the simulation runs its own clock; live = Date.now()/1000)
       .reset()               forget the trend (new lap / new house pin)
       .relabel()             re-draw the label after a language switch
       .state                 { n: 1|2|3, melt: 0..1, leaving: bool, key: label key }

   Scoops = proximity:  3 scoops ≤ opts.near mi (default 0.25), 2 scoops ≤ opts.mid mi (default 1.0), else 1 scoop.
   Melting = the truck is moving AWAY: distance rising over the last few fixes. Stronger the faster it goes and the
   further it gets from its closest pass. Approaching again → the scoops re-form.
   No location → 1 scoop, no melt logic. prefers-reduced-motion → no bob / blink / falling drops, static state. */
(function () {
  "use strict";
  var MI = 1609.344;

  var CSS = [
    ".truckpin{background:none;border:0}",
    ".itk{position:relative;width:64px;height:46px}",
    ".itk .van{position:absolute;left:0;bottom:0;width:64px;height:45px;transition:transform .35s ease;filter:drop-shadow(0 1px 1.2px rgba(0,0,0,.75))}",
    ".itk .van svg{display:block;width:64px;height:45px;overflow:visible}",
    ".itk.flip .van{transform:scaleX(-1)}",
    ".itk .gp{position:absolute;left:50%;bottom:-1px;width:16px;height:16px;margin-left:-8px;border-radius:50%;transform:scaleY(.42);box-shadow:0 0 0 0 rgba(255,209,102,.7);animation:itk-gp 1.8s infinite}",
    "@keyframes itk-gp{to{box-shadow:0 0 0 30px rgba(255,209,102,0)}}",
    /* blimp */
    ".itk .blimp{position:absolute;left:50%;bottom:44px;width:96px;margin-left:-48px;display:flex;flex-direction:column;align-items:center;pointer-events:none}",
    ".itk .bl-in{display:flex;flex-direction:column;align-items:center;animation:itk-bob 2.6s ease-in-out infinite alternate}",
    "@keyframes itk-bob{from{transform:translateY(1px)}to{transform:translateY(-4px)}}",
    ".itk .bl-lbl{font:800 11px/1.15 \"Rajdhani\",system-ui,sans-serif;color:#fff;background:rgba(7,17,42,.9);border:1px solid var(--bc,#3fa9ff);border-radius:99px;padding:1px 7px 2px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.5);margin-bottom:1px;transition:border-color .5s,opacity .25s}",
    ".itk .bl-lbl.swap{opacity:0}",
    ".itk .cone{display:block;width:36px;height:59px;overflow:visible}",
    ".itk .cone .glow{animation:itk-blink 1.7s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}",
    "@keyframes itk-blink{0%,100%{opacity:.3;transform:scale(.86)}50%{opacity:1;transform:scale(1.05)}}",
    ".itk[data-n='3'] .cone .glow{animation-duration:1.05s}",
    ".itk .cone stop.g0{stop-color:var(--bc,#3fa9ff);stop-opacity:.9}",
    ".itk .cone stop.g1{stop-color:var(--bc,#3fa9ff);stop-opacity:0}",
    ".itk{--bc:#3fa9ff}",
    ".itk[data-n='2']{--bc:#ffd166}",
    ".itk[data-n='3']{--bc:#ff6fae}",
    ".itk.melting{--bc:#ff5a7a}",
    ".itk.noloc{--bc:#9eadcc}",
    /* scoops: pop in from above, melt away downward when the truck is leaving */
    ".itk .sc{transform-box:fill-box;transform-origin:50% 100%;transition:transform .55s cubic-bezier(.3,1.55,.5,1),opacity .35s}",
    ".itk .sc.off{opacity:0;transform:translateY(-5px) scale(.35)}",
    ".itk.melting .sc.off{transform:translateY(4px) scale(1.15,.15);transition:transform .9s ease-in,opacity .9s ease-in}",
    ".itk .sag{transform-box:fill-box;transform-origin:50% 100%;transition:transform .9s ease}",
    ".itk .drip rect,.itk .drip circle{transform-box:fill-box;transition:transform .9s ease}",
    ".itk .drip rect{transform-origin:50% 0}",
    ".itk .drop{opacity:0}",
    ".itk.melting .drop{animation:itk-drop 1.5s ease-in infinite}",
    ".itk.melting .drop.d2{animation-delay:.55s}",
    ".itk.melting .drop.d3{animation-delay:1.05s}",
    "@keyframes itk-drop{0%{opacity:0;transform:translateY(0)}15%{opacity:var(--dop,1)}100%{opacity:0;transform:translateY(15px)}}",
    "@media (prefers-reduced-motion:reduce){.itk *,.itk .gp{animation:none!important;transition:none!important}.itk .cone .glow{opacity:.75}.itk.melting .drop{opacity:var(--dop,1)}}"
  ].join("\n");

  function injectCss() {
    if (document.getElementById("itk-css")) return;
    var s = document.createElement("style"); s.id = "itk-css"; s.textContent = CSS; document.head.appendChild(s);
  }

  /* A realistic step-van, facing right (cab on the right). viewBox 128 x 90; drawn at 64 x 45 on the map. */
  var VAN =
    '<svg viewBox="0 -6 128 90" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<radialGradient id="itk-sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset=".65" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="itk-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef2fa"/><stop offset="1" stop-color="#c3cce0"/></linearGradient>' +
    '<linearGradient id="itk-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".12" stop-color="#000" stop-opacity="0"/><stop offset=".86" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>' +
    '<linearGradient id="itk-pink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8cc2"/><stop offset=".5" stop-color="#ff4d97"/><stop offset="1" stop-color="#b8114f"/></linearGradient>' +
    '<linearGradient id="itk-navy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3f7a"/><stop offset="1" stop-color="#0b1630"/></linearGradient>' +
    '<linearGradient id="itk-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset=".5" stop-color="#ffc93c"/><stop offset="1" stop-color="#e08a0c"/></linearGradient>' +
    '<linearGradient id="itk-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cdeeff"/><stop offset=".45" stop-color="#4f9be0"/><stop offset="1" stop-color="#173a78"/></linearGradient>' +
    '<linearGradient id="itk-in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2752"/><stop offset=".6" stop-color="#3a2a3e"/><stop offset="1" stop-color="#ffb347"/></linearGradient>' +
    '<linearGradient id="itk-chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b9c3d8"/><stop offset="1" stop-color="#6d7a96"/></linearGradient>' +
    '<radialGradient id="itk-tire" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#3b4561"/><stop offset=".7" stop-color="#151b2c"/><stop offset="1" stop-color="#05080f"/></radialGradient>' +
    '<radialGradient id="itk-rim" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#cdd5e6"/><stop offset="1" stop-color="#5e6b88"/></radialGradient>' +
    '<radialGradient id="itk-signglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff6fae" stop-opacity=".55"/><stop offset="1" stop-color="#ff6fae" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="itk-head" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe6"/><stop offset=".4" stop-color="#ffe7a0" stop-opacity=".8"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>' +
    '<pattern id="itk-awn" width="6" height="8" patternUnits="userSpaceOnUse"><rect width="3" height="8" fill="#ff4d97"/><rect x="3" width="3" height="8" fill="#fff4fa"/></pattern>' +
    '<clipPath id="itk-clip"><path d="M6 66V28Q6 22 12 22H91Q96 22 98 26L106 40L116 42.5Q121 43.6 121 49V64Q121 69.5 115.5 69.5H8.5Q6 69.5 6 66Z"/></clipPath>' +
    '</defs>' +
    /* soft ground shadow */
    '<ellipse cx="64" cy="77.5" rx="62" ry="6" fill="url(#itk-sh)"/>' +
    /* roof sign: lit soft-serve cone */
    '<ellipse cx="44" cy="5" rx="15" ry="13" fill="url(#itk-signglow)"/>' +
    '<rect x="42.6" y="16" width="2.8" height="5" fill="#0b1630"/>' +
    '<rect x="36" y="19.2" width="16" height="3.4" rx="1.2" fill="url(#itk-navy)"/><rect x="36.6" y="19.4" width="14.8" height=".9" rx=".45" fill="#ffd166" opacity=".9"/>' +
    '<path d="M38.4 8.2H49.6L44 18.6Z" fill="url(#itk-gold)" stroke="#9a5a06" stroke-width=".6" stroke-linejoin="round"/>' +
    '<path d="M40.4 9.6L46.6 15.4M43.6 9.4L47.8 13.2M39.8 11.6L44.6 16.4M46.8 9.4L41.8 14.2M48.6 10.6L43.4 15.6" stroke="#a8620a" stroke-width=".55" opacity=".7"/>' +
    '<path d="M37.6 8.8C36.4 6.6 38.6 4.6 41 4.8C40.6 2.6 42.6 1.2 44.6 1.6C44.8 -.8 47.2 -2.6 48.2 -4.6C49.6 -2.2 48.8 .4 47.4 1.6C49.6 1.8 51 3.8 50 5.2C52 5.8 51.8 8.4 50.2 9H37.8Z" fill="#ffe3f0" stroke="#ff4d97" stroke-width=".9" stroke-linejoin="round"/>' +
    '<path d="M39 7.2C42 6.2 46 6.2 49.4 7.2M41.6 4.2C43.6 3.4 46 3.4 48 4.2" fill="none" stroke="#ff8fc4" stroke-width=".8" stroke-linecap="round"/>' +
    '<ellipse cx="41.4" cy="5.8" rx="1.6" ry=".8" fill="#fff" opacity=".9"/>' +
    /* body silhouette */
    '<path d="M6 66V28Q6 22 12 22H91Q96 22 98 26L106 40L116 42.5Q121 43.6 121 49V64Q121 69.5 115.5 69.5H8.5Q6 69.5 6 66Z" fill="url(#itk-body)"/>' +
    '<g clip-path="url(#itk-clip)">' +
    '<rect x="0" y="20" width="128" height="52" fill="url(#itk-side)"/>' +
    '<rect x="0" y="20" width="100" height="6.6" fill="url(#itk-navy)"/>' +            /* navy roof cap */
    '<rect x="0" y="26.6" width="100" height=".8" fill="#ffd166" opacity=".85"/>' +     /* gold pinstripe under the roof */
    '<rect x="0" y="56" width="128" height="16" fill="url(#itk-pink)"/>' +             /* pink skirt */
    '<rect x="0" y="54.6" width="128" height="1.5" fill="#ffd166"/>' +                  /* gold beltline */
    '<rect x="0" y="56.1" width="128" height=".7" fill="#fff" opacity=".35"/>' +
    '</g>' +
    '<path d="M12 23.2H90" stroke="#fff" stroke-opacity=".45" stroke-width=".8" stroke-linecap="round"/>' +
    '<path d="M8 29.6H86" stroke="#fff" stroke-width="1.1" stroke-opacity=".9" stroke-linecap="round"/>' +     /* body highlight */
    '<path d="M14 30V54M86 28V54" stroke="#9aa6c2" stroke-width=".6" opacity=".8"/>' +                          /* panel seams */
    '<rect x="6" y="41" width="2.6" height="8" rx=".8" fill="#ff2e4d" stroke="#7a0014" stroke-width=".4"/>' +   /* tail light */
    /* awning + serving window */
    '<path d="M19 28.6H69L67.6 33.4H20.4Z" fill="url(#itk-awn)" stroke="#9b1150" stroke-width=".5" stroke-linejoin="round"/>' +
    '<path d="M20.4 33.4q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.6 2 3.2 0z" fill="#ff4d97" stroke="#9b1150" stroke-width=".4"/>' +
    '<rect x="22.5" y="35" width="43" height="14.2" rx="1.4" fill="url(#itk-in)" stroke="#0b1630" stroke-width="1"/>' +
    '<rect x="26" y="37" width="7" height="3.2" rx=".6" fill="#ffd166" opacity=".9"/><rect x="35" y="37" width="7" height="3.2" rx=".6" fill="#ff8fc4" opacity=".9"/><rect x="44" y="37" width="7" height="3.2" rx=".6" fill="#7ff0d0" opacity=".85"/>' +
    '<path d="M28 48.6c0-3 2.6-4.6 4.4-4.6s4.4 1.6 4.4 4.6z" fill="#3a2440"/>' +                               /* server silhouette */
    '<path d="M54 44.4l1.6 4.4h-3.2z" fill="#ffc93c"/><circle cx="54" cy="43.6" r="1.8" fill="#ff8fc4"/>' +       /* cone on the counter */
    '<path d="M23.5 36.2H64.5" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>' +
    '<rect x="20.5" y="48.6" width="47" height="2.8" rx="1" fill="url(#itk-chrome)" stroke="#0b1630" stroke-width=".6"/>' + /* counter ledge */
    /* gold sun decal (Paletas El Sol) */
    '<g transform="translate(77 41)"><g stroke="#e08a0c" stroke-width="1.1" stroke-linecap="round"><path d="M0 -7.4V-5.6M0 5.6V7.4M-7.4 0H-5.6M5.6 0H7.4M-5.2 -5.2L-4 -4M4 4L5.2 5.2M-5.2 5.2L-4 4M4 -4L5.2 -5.2"/></g><circle r="4.2" fill="url(#itk-gold)" stroke="#b86d06" stroke-width=".5"/><circle cx="-1.2" cy="-1.3" r="1.2" fill="#fff" opacity=".6"/></g>' +
    /* cab: side window, door, mirror, headlight, grille */
    '<path d="M90.5 28H97L104 40.5H90.5Z" fill="url(#itk-glass)" stroke="#0b1630" stroke-width=".9" stroke-linejoin="round"/>' +
    '<path d="M93 29.2L95.4 29.2L91.8 37.6L91.8 32.4Z" fill="#fff" opacity=".55"/>' +
    '<path d="M98 26.2L106 40" stroke="#0b1630" stroke-width="1.6" stroke-linecap="round"/>' +                  /* windshield edge */
    '<path d="M88.6 27V66" stroke="#7d89a6" stroke-width=".8"/><path d="M106.6 42V66" stroke="#7d89a6" stroke-width=".6"/>' +
    '<rect x="91.5" y="45" width="4.4" height="1.4" rx=".7" fill="#5e6b88"/>' +
    '<path d="M104.6 33.5h2.8v6.4h-2.8z" fill="url(#itk-navy)" stroke="#0b1630" stroke-width=".4"/><path d="M104 37h-2" stroke="#0b1630" stroke-width=".7"/>' +
    '<rect x="118.6" y="50" width="2.6" height="7" rx=".6" fill="#1a2440"/>' +
    '<ellipse cx="124" cy="47.4" rx="7" ry="5" fill="url(#itk-head)"/>' +
    '<rect x="116.6" y="45" width="4.6" height="4.4" rx="1.2" fill="#fff8d6" stroke="#b9a253" stroke-width=".4"/>' +
    '<rect x="117" y="52" width="2.6" height="2" rx=".5" fill="#ffb347"/>' +
    /* outline */
    '<path d="M6 66V28Q6 22 12 22H91Q96 22 98 26L106 40L116 42.5Q121 43.6 121 49V64Q121 69.5 115.5 69.5H8.5Q6 69.5 6 66Z" fill="none" stroke="#0b1630" stroke-width="1.5" stroke-linejoin="round"/>' +
    /* bumpers */
    '<rect x="111" y="64.6" width="13.4" height="4.4" rx="1.6" fill="url(#itk-chrome)" stroke="#0b1630" stroke-width=".7"/>' +
    '<rect x="3" y="64.6" width="10" height="4.4" rx="1.6" fill="url(#itk-chrome)" stroke="#0b1630" stroke-width=".7"/>' +
    /* wheel wells + wheels */
    '<path d="M17.5 69.6A12.5 12.5 0 0 1 42.5 69.6Z" fill="#0a1226"/><path d="M87.5 69.6A12.5 12.5 0 0 1 112.5 69.6Z" fill="#0a1226"/>' +
    '<g transform="translate(30 70)"><circle r="9.6" fill="url(#itk-tire)"/><circle r="9.6" fill="none" stroke="#05080f" stroke-width=".8"/><path d="M-6.6 -5.2A8.4 8.4 0 0 1 3.4 -7.8" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2" stroke-linecap="round"/><circle r="5.4" fill="#0e1424"/><circle r="4.6" fill="url(#itk-rim)"/><circle r="1.7" fill="#2a3556"/><g fill="#55627f"><circle cx="0" cy="-3" r=".6"/><circle cx="2.85" cy="-.93" r=".6"/><circle cx="1.76" cy="2.43" r=".6"/><circle cx="-1.76" cy="2.43" r=".6"/><circle cx="-2.85" cy="-.93" r=".6"/></g></g>' +
    '<g transform="translate(100 70)"><circle r="9.6" fill="url(#itk-tire)"/><circle r="9.6" fill="none" stroke="#05080f" stroke-width=".8"/><path d="M-6.6 -5.2A8.4 8.4 0 0 1 3.4 -7.8" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2" stroke-linecap="round"/><circle r="5.4" fill="#0e1424"/><circle r="4.6" fill="url(#itk-rim)"/><circle r="1.7" fill="#2a3556"/><g fill="#55627f"><circle cx="0" cy="-3" r=".6"/><circle cx="2.85" cy="-.93" r=".6"/><circle cx="1.76" cy="2.43" r=".6"/><circle cx="-1.76" cy="2.43" r=".6"/><circle cx="-2.85" cy="-.93" r=".6"/></g></g>' +
    '</svg>';

  /* The floating cone. viewBox 40 x 66. Scoop shape is one path, reused 3x at different sizes/colors. */
  var SCOOP = "M8.5 37C7 31 11 24.5 20 24.5S33 31 31.5 37C30.6 38.9 28.6 38.5 27.4 37.4C26 39.6 23.2 39.6 21.8 37.9C20.4 39.9 17.6 39.9 16.2 37.9C14.8 39.5 12.2 39.3 11.6 37.4C10.6 38.8 9 38.5 8.5 37Z";
  var DRIPS = [ // x, max length, width
    [11.2, 9, 2.2], [15.6, 15, 2.6], [22.6, 11, 2.4], [28.4, 19, 2.4]
  ];
  var CONE =
    '<svg class="cone" viewBox="0 0 40 66" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<radialGradient id="itk-bg" cx=".5" cy=".5" r=".5"><stop class="g0" offset="0"/><stop class="g1" offset="1"/></radialGradient>' +
    '<linearGradient id="itk-cone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6b13a"/><stop offset=".45" stop-color="#ffd987"/><stop offset="1" stop-color="#c97a0a"/></linearGradient>' +
    '<radialGradient id="itk-s1" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffc2de"/><stop offset=".55" stop-color="#ff5fa2"/><stop offset="1" stop-color="#c2125a"/></radialGradient>' +
    '<radialGradient id="itk-s2" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#fff0d8"/><stop offset="1" stop-color="#e3be86"/></radialGradient>' +
    '<radialGradient id="itk-s3" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffd6ea"/><stop offset=".55" stop-color="#ff8fc4"/><stop offset="1" stop-color="#d43d7f"/></radialGradient>' +
    '<clipPath id="itk-cc"><path d="M8.6 37.5H31.4L20 64.5Z"/></clipPath>' +
    '</defs>' +
    '<circle class="glow" cx="20" cy="30" r="21" fill="url(#itk-bg)"/>' +
    /* cone */
    '<path d="M8.6 37.5H31.4L20 64.5Z" fill="url(#itk-cone)" stroke="#8a4f05" stroke-width=".7" stroke-linejoin="round"/>' +
    '<g clip-path="url(#itk-cc)" stroke="#a8620a" stroke-width=".7" opacity=".75"><path d="M6 40L30 66M6 47L26 68M6 54L22 70M12 37L36 61M18 37L38 56M24 37L38 50"/><path d="M34 40L10 66M34 47L14 68M34 54L18 70M28 37L4 61M22 37L2 56M16 37L2 50"/></g>' +
    '<path d="M11.4 38.4L19.4 60" stroke="#fff" stroke-opacity=".35" stroke-width="1.1" stroke-linecap="round"/>' +
    /* drips (behind the bottom scoop edge, running down the cone) */
    '<g class="drips" fill="#ff5fa2">' +
    DRIPS.map(function (d, i) {
      return '<g class="drip" data-i="' + i + '"><rect x="' + (d[0] - d[2] / 2) + '" y="34.5" width="' + d[2] + '" height="' + d[1] + '" rx="' + d[2] / 2 + '" style="transform:scaleY(0)"/>' +
        '<circle cx="' + d[0] + '" cy="35" r="' + (d[2] * 0.72) + '" style="transform:translateY(0)"/></g>';
    }).join("") +
    '</g>' +
    /* scoops: outer <g> = show/hide (CSS), middle = placement, inner .sag = melt sag (CSS) */
    '<g class="sc" data-s="1"><g><g class="sag"><path d="' + SCOOP + '" fill="url(#itk-s1)" stroke="#9b0f4b" stroke-width=".6"/><ellipse cx="15" cy="29" rx="3.6" ry="1.8" fill="#fff" opacity=".6" transform="rotate(-18 15 29)"/></g></g></g>' +
    '<g class="sc" data-s="2"><g transform="translate(20 22.6) scale(.9) translate(-20 -32)"><g class="sag"><path d="' + SCOOP + '" fill="url(#itk-s2)" stroke="#b8894a" stroke-width=".65"/><ellipse cx="15" cy="29" rx="3.6" ry="1.8" fill="#fff" opacity=".85" transform="rotate(-18 15 29)"/></g></g></g>' +
    '<g class="sc" data-s="3"><g transform="translate(20 14.2) scale(.8) translate(-20 -32)"><g class="sag"><path d="' + SCOOP + '" fill="url(#itk-s3)" stroke="#a5195a" stroke-width=".7"/><ellipse cx="15" cy="29" rx="3.6" ry="1.8" fill="#fff" opacity=".7" transform="rotate(-18 15 29)"/>' +
    '<g stroke-width="1.6" stroke-linecap="round"><path d="M14 31.4l2.2-1" stroke="#ffd166"/><path d="M19.6 28.6l1.8 1.4" stroke="#7ff0d0"/><path d="M24 31.6l2-1.2" stroke="#3fa9ff"/><path d="M21.6 34l-2 .6" stroke="#fff"/></g>' +
    '<circle cx="20.6" cy="23.6" r="2.6" fill="#e0213f" stroke="#7a0014" stroke-width=".5"/><path d="M20.8 21.2c.6-2 2-3 3.6-3.4" fill="none" stroke="#2f7a3a" stroke-width=".7" stroke-linecap="round"/><circle cx="19.8" cy="22.8" r=".7" fill="#fff" opacity=".8"/></g></g></g>' +
    /* falling droplets (only animate while melting) */
    '<g fill="#ff5fa2"><circle class="drop d1" cx="28.4" cy="55" r="1.3"/><circle class="drop d2" cx="15.6" cy="51.5" r="1.1"/><circle class="drop d3" cx="20" cy="63" r="1.2"/></g>' +
    '</svg>';

  function html() {
    injectCss();
    return '<div class="itk" data-n="1"><div class="gp"></div>' +
      '<div class="blimp"><div class="bl-in"><span class="bl-lbl"></span>' + CONE + '</div></div>' +
      '<div class="van">' + VAN + '</div></div>';
  }

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  function Blimp(root, opts) {
    opts = opts || {};
    this.root = root;
    this.near = (opts.near || 0.25) * MI;   // 3 scoops within this
    this.mid = (opts.mid || 1.0) * MI;      // 2 scoops within this, else 1
    this.hereM = opts.hereM || 90;          // "It's here!" label within this
    this.t = opts.t || function (k) { return k; };
    this.spacing = opts.spacing || 4;       // seconds of feed time between trend samples
    this.keep = opts.keep || 4;             // trend = the last few samples
    this.trendM = opts.trendM || 12;        // meters of change before calling it approach / leave
    this.reset();
  }
  Blimp.prototype.reset = function () {
    this.hist = []; this.leaving = false; this.dMin = Infinity;
    this.state = { n: 1, melt: 0, leaving: false, key: "" };
  };
  Blimp.prototype.update = function (u) {
    var d = u && u.d, clock = u && u.clock != null ? u.clock : Date.now() / 1000;
    if (d == null || !isFinite(d)) { this.reset(); return this.draw(1, 0, "blNoLoc", true); }

    var h = this.hist, last = h[h.length - 1];
    if (!last || clock - last.c >= this.spacing) { h.push({ c: clock, d: d }); if (h.length > this.keep) h.shift(); }
    else if (clock < last.c) { this.reset(); h = this.hist; h.push({ c: clock, d: d }); } // clock went backwards: new lap

    // trend over the last few fixes (plus the current one)
    var first = h[0], dd = d - first.d, dt = Math.max(0.001, clock - first.c), mono = true;
    for (var i = 1; i < h.length; i++) if (h[i].d < h[i - 1].d - 2) mono = false;
    if (h.length >= 2 && dd > this.trendM && mono && d >= h[h.length - 1].d - 2) this.leaving = true;
    else if (h.length >= 2 && dd < -this.trendM) { this.leaving = false; }
    // a parked truck (selling stop) keeps whatever it was doing: no flicker
    if (!this.leaving) this.dMin = Math.min(this.dMin, d);

    var melt = 0;
    if (this.leaving) {
      var gone = clamp((d - this.dMin) / (0.5 * MI), 0, 1);       // further from its closest pass → more melt
      var speed = clamp((dd / dt) / 4.5, 0, 1);                     // ~10 mph (4.5 m/s) away → full speed term
      melt = clamp(0.3 + 0.5 * gone + 0.3 * speed, 0.3, 1);
    }

    // proximity → scoops (30 m hysteresis so a truck sitting on a boundary doesn't flicker)
    var n = this.state.n, hy = 30;
    var want = d <= this.near ? 3 : d <= this.mid ? 2 : 1;
    if (want !== n) {
      if (want > n && d <= (n === 1 ? this.mid : this.near) - hy) n = want;
      else if (want < n && d >= (n === 3 ? this.near : this.mid) + hy) n = want;
      else if (Math.abs(want - n) > 1) n = want;
    }
    var key = this.leaving ? "blMelt" : d <= this.hereM ? "blHere" : n === 3 ? "blNear" : n === 2 ? "blMid" : "blFar";
    return this.draw(n, melt, key, false);
  };
  Blimp.prototype.draw = function (n, melt, key, noloc) {
    var r = this.root, st = this.state;
    if (!r) return st;
    r.setAttribute("data-n", n);
    r.classList.toggle("melting", melt > 0);
    r.classList.toggle("noloc", !!noloc);
    r.style.setProperty("--dop", melt > 0 ? (0.45 + 0.55 * melt).toFixed(2) : "0");
    var scs = r.querySelectorAll(".sc");
    for (var i = 0; i < scs.length; i++) {
      var k = +scs[i].getAttribute("data-s");
      scs[i].classList.toggle("off", k > n);
      var sag = scs[i].querySelector(".sag");
      var m = k === n ? melt : k === n - 1 ? melt * 0.35 : 0;   // the top scoop sags most
      sag.style.transform = m ? "translateY(" + (m * 1.4).toFixed(2) + "px) scale(" + (1 + 0.14 * m).toFixed(3) + "," + (1 - 0.26 * m).toFixed(3) + ")" : "";
    }
    var drips = r.querySelectorAll(".drip");
    for (var j = 0; j < drips.length; j++) {
      var D = DRIPS[j], on = clamp((melt - j * 0.14) / 0.55, 0, 1), len = on * D[1];
      drips[j].firstChild.style.transform = "scaleY(" + on.toFixed(3) + ")";
      drips[j].lastChild.style.transform = "translateY(" + Math.max(0, len - D[2] * 0.6).toFixed(2) + "px)";
      drips[j].lastChild.style.opacity = on > 0.05 ? 1 : 0;
    }
    if (key !== st.key || this._lang !== this.t("blFar")) this.label(key);
    this.state = { n: n, melt: +melt.toFixed(3), leaving: melt > 0, key: key };
    return this.state;
  };
  Blimp.prototype.label = function (key) {
    var el = this.root && this.root.querySelector(".bl-lbl"), txt = this.t(key);
    this._lang = this.t("blFar");
    if (!el) return;
    if (!el.textContent) { el.textContent = txt; return; }
    el.classList.add("swap");
    clearTimeout(this._sw);
    this._sw = setTimeout(function () { el.textContent = txt; el.classList.remove("swap"); }, 180);
  };
  Blimp.prototype.relabel = function () { if (this.state.key) this.label(this.state.key); };

  window.IceTruck = { html: html, Blimp: Blimp, injectCss: injectCss };
})();
