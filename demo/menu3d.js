/* Second Shift AI — 3D menu for every demo page. Include once: <script src="../menu3d.js"></script>
   - Every menu photo tilts in 3D as you move over it (finger or mouse), with a light sheen.
   - The "3D" badge opens Plate View: the dish drops onto a spinning plate with steam, a 3-second loop.
     Drag to spin it yourself.
   - Optional real clips: window.MENU3D = { clips: { "Hibachi Chicken": "img/chicken.mp4" } } plays that
     short video in Plate View instead of the animated plate. */
(function () {
  "use strict";
  var CLIPS = (window.MENU3D && window.MENU3D.clips) || {};
  var SEL = ".menu img, .items img, .dish img";
  var css = [
    ".m3d-w{position:relative;display:block;perspective:700px;-webkit-tap-highlight-color:transparent}",
    ".m3d-w>img{transition:transform .25s ease-out,box-shadow .25s;transform-style:preserve-3d;will-change:transform}",
    ".m3d-w.m3d-on>img{transition:transform .06s linear,box-shadow .25s;box-shadow:0 18px 30px rgba(0,0,0,.35)}",
    ".m3d-w .m3d-sh{position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:radial-gradient(circle at var(--x,50%) var(--y,30%),rgba(255,255,255,.35),transparent 55%);opacity:0;transition:opacity .25s;mix-blend-mode:soft-light}",
    ".m3d-w.m3d-on .m3d-sh{opacity:1}",
    ".m3d-b{position:absolute;right:8px;bottom:8px;z-index:3;border:0;border-radius:99px;padding:5px 10px;font:800 11px/1 system-ui,-apple-system,sans-serif;letter-spacing:.06em;color:#fff;background:rgba(10,12,18,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);cursor:pointer;box-shadow:0 0 0 1px rgba(255,255,255,.25),0 0 14px rgba(247,192,74,.55)}",
    "#m3d-o{position:fixed;inset:0;z-index:100000;display:none;place-items:center;background:radial-gradient(ellipse at 50% 40%,#232836,#07080c 70%);color:#F2F4F8;font-family:system-ui,-apple-system,sans-serif;touch-action:none}",
    "#m3d-o.on{display:grid}",
    "#m3d-o .stage{position:relative;width:min(78vw,380px);aspect-ratio:1;perspective:900px}",
    "#m3d-o .plate{position:absolute;inset:0;border-radius:50%;transform-style:preserve-3d;animation:m3d-in 3s cubic-bezier(.2,.7,.2,1) infinite}",
    "#m3d-o .plate::before{content:'';position:absolute;inset:-7%;border-radius:50%;background:radial-gradient(circle,#fdfdfd 58%,#e6e8ec 66%,#c9cdd4 70%,#f4f5f7 72%);box-shadow:0 30px 60px rgba(0,0,0,.6);transform:translateZ(-2px)}",
    "#m3d-o .food{position:absolute;inset:4%;border-radius:50%;background-size:cover;background-position:center;box-shadow:inset 0 0 30px rgba(0,0,0,.35);transform:translateZ(10px)}",
    "#m3d-o .shadow{position:absolute;left:10%;right:10%;bottom:-16%;height:16%;border-radius:50%;background:radial-gradient(rgba(0,0,0,.6),transparent 70%);animation:m3d-sh 3s ease infinite}",
    "#m3d-o .steam{position:absolute;left:50%;top:-6%;width:0;height:0}",
    "#m3d-o .steam i{position:absolute;bottom:0;width:18px;height:70px;border-radius:50%;background:linear-gradient(to top,rgba(255,255,255,.35),transparent);filter:blur(6px);animation:m3d-st 3s ease-in infinite;opacity:0}",
    "#m3d-o .steam i:nth-child(1){left:-40px;animation-delay:.9s}#m3d-o .steam i:nth-child(2){left:-8px;animation-delay:1.3s}#m3d-o .steam i:nth-child(3){left:26px;animation-delay:1.7s}",
    "#m3d-o video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:24px;box-shadow:0 30px 60px rgba(0,0,0,.6)}",
    "#m3d-o .cap{text-align:center;margin-top:46px;padding:0 20px}#m3d-o .cap b{display:block;font-size:24px;font-weight:900}#m3d-o .cap span{color:#F7C04A;font-weight:800;font-size:18px}",
    "#m3d-o .hint{color:#9AA6B6;font-size:12px;margin-top:8px;letter-spacing:.06em}",
    "#m3d-o .x{position:absolute;top:max(14px,env(safe-area-inset-top));right:14px;width:44px;height:44px;border-radius:50%;border:1px solid #2A303C;background:#151922;color:#F2F4F8;font-size:20px;cursor:pointer}",
    "#m3d-o.drag .plate{animation:none}",
    "@keyframes m3d-in{0%{transform:translateY(-55%) rotateX(68deg) rotateZ(-40deg) scale(.7);opacity:0}18%{opacity:1}38%{transform:translateY(0) rotateX(52deg) rotateZ(0) scale(1)}100%{transform:translateY(0) rotateX(52deg) rotateZ(220deg) scale(1)}}",
    "@keyframes m3d-sh{0%{opacity:0;transform:scale(.5)}38%,100%{opacity:1;transform:scale(1)}}",
    "@keyframes m3d-st{0%{opacity:0;transform:translateY(0) scaleX(.6)}30%{opacity:.9}100%{opacity:0;transform:translateY(-90px) scaleX(1.6)}}",
    "@media (prefers-reduced-motion:reduce){#m3d-o .plate{animation:none;transform:rotateX(40deg)}#m3d-o .steam i{animation:none}.m3d-w>img{transition:none}}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var O = document.createElement("div"); O.id = "m3d-o"; O.setAttribute("role", "dialog"); O.setAttribute("aria-label", "Plate view");
  O.innerHTML = '<button class="x" type="button" aria-label="Close">✕</button><div><div class="stage"><div class="shadow"></div><div class="plate"><div class="food"></div></div><div class="steam"><i></i><i></i><i></i></div></div>' +
    '<div class="cap"><b></b><span></span><div class="hint">DRAG TO SPIN · TAP ✕ TO CLOSE</div></div></div>';
  document.body.appendChild(O);
  var plate = O.querySelector(".plate"), food = O.querySelector(".food"), stage = O.querySelector(".stage");
  O.querySelector(".x").onclick = close;
  O.addEventListener("click", function (ev) { if (ev.target === O) close(); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") close(); });
  function close() { O.classList.remove("on", "drag"); var v = O.querySelector("video"); if (v) v.remove(); plate.style.transform = ""; }

  // drag to spin
  var dragging = false, sx = 0, rz = 0, base = 0;
  stage.addEventListener("pointerdown", function (ev) { dragging = true; sx = ev.clientX; base = rz; O.classList.add("drag"); stage.setPointerCapture(ev.pointerId); });
  stage.addEventListener("pointermove", function (ev) { if (!dragging) return; rz = base + (ev.clientX - sx) * .8; plate.style.transform = "rotateX(52deg) rotateZ(" + rz + "deg)"; });
  stage.addEventListener("pointerup", function () { dragging = false; });

  function itemInfo(img) {
    var card = img.closest(".item,.dish,li,article,.card") || img.parentNode;
    var name = img.alt || "";
    var price = "";
    if (card) {
      var m = (card.textContent || "").match(/\$\s?\d+(?:\.\d{2})?|\bMP\b/);
      if (m) price = m[0];
    }
    return { name: name, price: price };
  }
  function open(img) {
    var info = itemInfo(img);
    O.querySelector(".cap b").textContent = info.name;
    O.querySelector(".cap span").textContent = info.price;
    var clip = CLIPS[info.name];
    var old = O.querySelector("video"); if (old) old.remove();
    plate.style.display = clip ? "none" : ""; O.querySelector(".shadow").style.display = clip ? "none" : "";
    O.querySelector(".steam").style.display = clip ? "none" : "";
    if (clip) {
      var v = document.createElement("video"); v.src = clip; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true; v.setAttribute("playsinline", "");
      stage.appendChild(v);
    } else {
      food.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
      plate.style.animation = "none"; void plate.offsetWidth; plate.style.animation = "";
    }
    rz = 0; O.classList.remove("drag"); O.classList.add("on");
  }

  function tilt(w, img, x, y) {
    var r = w.getBoundingClientRect(), px = (x - r.left) / r.width, py = (y - r.top) / r.height;
    if (px < 0 || px > 1 || py < 0 || py > 1) return reset(w, img);
    w.classList.add("m3d-on");
    img.style.transform = "rotateY(" + ((px - .5) * 18) + "deg) rotateX(" + ((.5 - py) * 18) + "deg) scale(1.04)";
    w.style.setProperty("--x", px * 100 + "%"); w.style.setProperty("--y", py * 100 + "%");
  }
  function reset(w, img) { w.classList.remove("m3d-on"); img.style.transform = ""; }

  function enhance(img) {
    if (img.dataset.m3d || /logo/i.test(img.className + img.id + img.src)) return;
    img.dataset.m3d = "1";
    var w = document.createElement("span"); w.className = "m3d-w";
    var cs = getComputedStyle(img); w.style.borderRadius = cs.borderRadius;
    if (cs.display === "block" || cs.width === "100%") w.style.width = "100%";
    img.parentNode.insertBefore(w, img); w.appendChild(img);
    var sh = document.createElement("span"); sh.className = "m3d-sh"; w.appendChild(sh);
    var b = document.createElement("button"); b.type = "button"; b.className = "m3d-b"; b.textContent = CLIPS[img.alt] ? "▶ CLIP" : "◉ 3D";
    b.setAttribute("aria-label", "Open 3D plate view of " + (img.alt || "this dish"));
    b.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); open(img); });
    w.appendChild(b);
    w.addEventListener("pointermove", function (ev) { tilt(w, img, ev.clientX, ev.clientY); });
    w.addEventListener("pointerleave", function () { reset(w, img); });
    w.addEventListener("touchmove", function (ev) { var t = ev.touches[0]; tilt(w, img, t.clientX, t.clientY); }, { passive: true });
    w.addEventListener("touchend", function () { reset(w, img); }, { passive: true });
  }
  function scan() { document.querySelectorAll(SEL).forEach(enhance); }
  scan();
  new MutationObserver(function () { scan(); }).observe(document.body, { childList: true, subtree: true });
})();
