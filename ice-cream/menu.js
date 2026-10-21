/* SousShift AI — Ice Cream Trucks: the truck menu + specials engine for /ice-cream/demo/.
   Prices are the TRUCK's (sample board for the made-up "Paletas El Sol"), modeled on 2025-2026 US / SoCal truck boards.
   They are not SousShift prices. Generic names only: no brands, logos or product photos.
   IceMenu.CATS · IceMenu.ITEMS · IceMenu.DEALS · IceMenu.price(cart, {friday, happyHour}) -> { lines, deals, sub, save, total } */
(function (root) {
  "use strict";
  var CATS = [
    { id: "ice", e: "🍦", en: "Ice Cream", es: "Helados" },
    { id: "pal", e: "🥭", en: "Paletas", es: "Paletas" },
    { id: "drk", e: "🥤", en: "Drinks", es: "Bebidas" },
    { id: "cnd", e: "🍭", en: "Candy", es: "Dulces" },
    { id: "toy", e: "🫧", en: "Toys", es: "Juguetes" }
  ];
  /* id, cat, emoji, price, [EN name, EN line], [ES name, ES line], hh = counts for Happy Hour ($1 off paletas) */
  function I(id, cat, e, p, en, es, hh) { return { id: id, cat: cat, e: e, p: p, en: en, es: es, hh: !!hh }; }
  var ITEMS = [
    // Ice cream bars + novelties
    I("shortcake", "ice", "🍓", 4.00, ["Strawberry Shortcake Bar", "Vanilla + strawberry center, crunchy cake coating"], ["Barra de Fresa con Pastel", "Vainilla con centro de fresa y costra de pastelito"]),
    I("eclair", "ice", "🍫", 4.00, ["Chocolate Éclair Bar", "Chocolate center, vanilla, cake crunch"], ["Barra Éclair de Chocolate", "Centro de chocolate, vainilla y costra crujiente"]),
    I("cookiebar", "ice", "🍪", 4.00, ["Cookies & Cream Bar", "Vanilla with cookie pieces, cookie crumb coat"], ["Barra de Galleta con Crema", "Vainilla con galleta, cubierta de galleta"]),
    I("dipbar", "ice", "🍨", 3.50, ["Chocolate-Dipped Vanilla Bar", "Classic vanilla in a crackly chocolate shell"], ["Barra de Vainilla con Chocolate", "Vainilla clásica con cubierta de chocolate"]),
    I("rocket", "ice", "🚀", 3.00, ["Red-White-Blue Rocket Pop", "Cherry, lime + blue raspberry ice"], ["Paleta Cohete Tricolor", "Hielo de cereza, limón y frambuesa azul"]),
    I("face", "ice", "🤪", 4.50, ["Cartoon Face Pop", "Fruity character bar with gumball eyes"], ["Paleta Carita de Caricatura", "Paleta de personaje con ojos de chicle"]),
    I("sandwich", "ice", "🥪", 3.50, ["Classic Ice Cream Sandwich", "Vanilla between soft chocolate wafers"], ["Sándwich de Helado Clásico", "Vainilla entre galletas suaves de chocolate"]),
    I("chipsand", "ice", "🍪", 5.00, ["Chocolate Chip Cookie Sandwich", "Vanilla between 2 cookies, rolled in chips"], ["Sándwich de Galleta con Chispas", "Vainilla entre 2 galletas con chispas"]),
    I("conetop", "ice", "🍦", 5.00, ["Sundae Cone", "Crunchy cone, vanilla, fudge + peanuts on top"], ["Cono Sundae", "Cono crujiente, vainilla, chocolate y cacahuate"]),
    I("taco", "ice", "🌮", 5.00, ["Ice Cream Taco", "Waffle taco shell, vanilla, fudge + peanuts"], ["Taco de Helado", "Tortilla de waffle, vainilla, chocolate y cacahuate"]),
    I("pushup", "ice", "🍊", 2.50, ["Orange Sherbet Tube Pop", "Orange sherbet you push up the tube"], ["Tubito de Nieve de Naranja", "Nieve de naranja que empujas del tubo"]),
    I("fudge", "ice", "🟫", 2.50, ["Fudge Bar", "Creamy chocolate on a stick"], ["Barra de Chocolate Fudge", "Chocolate cremoso en palito"]),
    // Paletas + Mexican antojitos (paletero style)
    I("fresa", "pal", "🍓", 2.50, ["Paleta de Fresa", "Fruit paleta with real strawberry pieces"], ["Paleta de Fresa", "Paleta de agua con trozos de fresa"], 1),
    I("mango", "pal", "🥭", 2.50, ["Paleta de Mango con Chile", "Mango fruit paleta with chile-lime"], ["Paleta de Mango con Chile", "Paleta de mango con chile y limón"], 1),
    I("limon", "pal", "🍋", 2.50, ["Paleta de Limón", "Tart lime, super refreshing"], ["Paleta de Limón", "Limón bien fresquecito"], 1),
    I("coco", "pal", "🥥", 3.00, ["Paleta de Coco", "Creamy coconut (paleta de crema)"], ["Paleta de Coco", "Paleta de crema de coco"], 1),
    I("arroz", "pal", "🍚", 3.00, ["Paleta de Arroz con Leche", "Rice pudding + cinnamon, creamy"], ["Paleta de Arroz con Leche", "Arroz con leche y canela, de crema"], 1),
    I("nuez", "pal", "🌰", 3.00, ["Paleta de Nuez", "Creamy pecan paleta"], ["Paleta de Nuez", "Paleta de crema con nuez"], 1),
    I("mangonada", "pal", "🥭", 8.00, ["Mangonada", "Mango sorbet, chamoy, chile-lime + tamarind straw"], ["Mangonada", "Nieve de mango, chamoy, chilito y popote de tamarindo"]),
    I("raspado", "pal", "🍧", 4.00, ["Raspado", "Shaved ice: tamarind, mango, strawberry or blue"], ["Raspado", "Tamarindo, mango, fresa o azul"]),
    I("elotevaso", "pal", "🌽", 5.00, ["Elote en Vaso", "Corn in a cup: mayo, cheese, chile + lime"], ["Elote en Vaso", "Con mayonesa, queso, chile y limón"]),
    I("elote", "pal", "🌽", 4.50, ["Elote on the Cob", "Same toppings, on a stick"], ["Elote Entero", "Los mismos toppings, en palito"]),
    I("chilichips", "pal", "🌶️", 5.00, ["Chili Cheese Chips", "Corn chips, warm chili + nacho cheese"], ["Chips con Chili y Queso", "Chips de maíz con chili calientito y queso"]),
    I("fuegoqueso", "pal", "🔥", 5.00, ["Hot Chips con Queso", "Spicy red chips + warm nacho cheese"], ["Chips Picosos con Queso", "Chips rojos picosos con queso calientito"]),
    // Drinks
    I("mexcola", "drk", "🥤", 3.50, ["Mexican Cola (glass bottle)", "Made with cane sugar, ice cold"], ["Refresco de Cola Mexicano (vidrio)", "Con azúcar de caña, bien frío"]),
    I("fruitsoda", "drk", "🍾", 3.00, ["Mexican Fruit Soda (glass bottle)", "Mandarin, tamarind, lime or pineapple"], ["Refresco de Sabor (vidrio)", "Mandarina, tamarindo, limón o piña"]),
    I("horchata", "drk", "🥛", 3.50, ["Horchata", "Cold rice + cinnamon drink"], ["Horchata", "Bien fría, con canela"]),
    I("can", "drk", "🥫", 2.00, ["Canned Soda", "Cola, lemon-lime or orange"], ["Refresco de Lata", "Cola, lima-limón o naranja"]),
    I("tea", "drk", "🍹", 2.00, ["Big Iced Tea Can (23 oz)", "Green tea or fruit punch"], ["Lata Grande de Té (23 oz)", "Té verde o ponche de frutas"]),
    I("sports", "drk", "⚡", 2.50, ["Sports Drink", "Blue, red or lemon-lime"], ["Bebida Deportiva", "Azul, roja o lima-limón"]),
    I("juice", "drk", "🧃", 1.50, ["Juice Pouch", "Fruit punch or tropical"], ["Juguito en Bolsita", "Ponche de frutas o tropical"]),
    I("water", "drk", "💧", 1.50, ["Bottled Water", "Ice cold, 16.9 oz"], ["Agua Embotellada", "Bien fría, 500 ml"]),
    // Candy + snacks
    I("rolled", "cnd", "🌀", 2.00, ["Spicy Rolled Chips", "Rolled tortilla chips, chile-lime"], ["Chips Enrolladas Picosas", "Tortilla enrollada con chile y limón"]),
    I("hotchips", "cnd", "🔥", 2.00, ["Spicy Red Cheese Puffs", "Crunchy and hot, small bag"], ["Chips Crujientes Picosas", "Bolsita de churritos de queso picosos"]),
    I("chamoy", "cnd", "🌶️", 1.50, ["Chamoy Candy Powder", "Sweet-sour-spicy powder you lick off the spoon"], ["Polvito de Chamoy", "Dulce, agrio y enchilado, con cucharita"]),
    I("tamstraw", "cnd", "🥢", 1.00, ["Tamarind Candy Straw", "Chewy tamarind with chile"], ["Pulpa de Tamarindo en Popote", "Tamarindo con chile"]),
    I("mangololli", "cnd", "🍭", 1.00, ["Chili Mango Lollipop", "Mango lollipop in chile powder"], ["Paleta de Mango Enchilada", "Paleta de mango con chile"]),
    I("swirl", "cnd", "🍭", 3.00, ["Giant Swirl Lollipop", "Rainbow lollipop as big as your hand"], ["Paleta Gigante de Remolino", "Paleta arcoíris del tamaño de tu mano"]),
    I("belts", "cnd", "🌈", 1.50, ["Sour Rainbow Belts", "Sour-sugar candy strips"], ["Tiritas Agridulces Arcoíris", "Tiritas de dulce acidito"]),
    I("gum", "cnd", "🫧", 1.00, ["Bubble Gum Pack", "Blow the biggest bubble on the block"], ["Chicles", "Haz la bomba más grande de la cuadra"]),
    I("cotton", "cnd", "☁️", 3.00, ["Cotton Candy Tub", "Pink + blue, fluffy"], ["Algodón de Azúcar", "Rosa y azul, bien esponjado"]),
    // Toys
    I("bubbles", "toy", "🫧", 3.00, ["Bubble Wand", "Big wand + bottle of bubbles"], ["Varita de Burbujas", "Varita grande con su botella"]),
    I("spinner", "toy", "✨", 8.00, ["Light-Up Spinner Wand", "Spins + flashes colors, batteries in"], ["Varita Giratoria con Luces", "Gira y prende colores, con pilas"]),
    I("blaster", "toy", "🔮", 10.00, ["Light-Up Bubble Blaster", "Shoots streams of bubbles with lights"], ["Lanza Burbujas con Luces", "Echa chorros de burbujas con luces"]),
    I("glow", "toy", "🟢", 3.00, ["Glow Stick Bracelets (10)", "Snap, shake, glow all night"], ["Pulseras Luminosas (10)", "Truénalas, agítalas y brillan toda la noche"]),
    I("slime", "toy", "🟩", 4.00, ["Slime Cup", "Stretchy glitter slime"], ["Vasito de Slime", "Slime elástico con brillitos"]),
    I("squirter", "toy", "💦", 5.00, ["Water Squirter", "Bright-colored, for hot days"], ["Lanza Agua", "De colores, para el calor"]),
    I("ball", "toy", "⚽", 1.00, ["Mini Bouncy Ball", "Super-bouncy, glitter inside"], ["Pelotita Saltarina", "Rebota alto, con brillitos"]),
    I("sticky", "toy", "🖐️", 1.00, ["Sticky Hand", "Stretchy, sticks to anything"], ["Manita Pegajosa", "Se estira y se pega a todo"])
  ];
  var BY = {}; ITEMS.forEach(function (x) { BY[x.id] = x; });

  /* Specials. try = items the "Try it" button drops in the cart so the owner sees the deal apply.
     when: null = always · "fri" = Fridays · "hh" = 3-4 PM. */
  var DEALS = [
    { id: "b2", e: "🍦", c: "#ff8fc4", when: null, try: ["shortcake", "taco", "rocket"],
      en: ["Buy 2, get the 3rd HALF OFF", "Any ice cream bars. Every 3rd one (the cheapest) is half price."],
      es: ["Compra 2 y el 3º a MITAD de precio", "Cualquier helado. Cada 3º (el más barato) va a mitad de precio."] },
    { id: "kid", e: "🧒", c: "#ffd166", when: null, try: ["face", "juice", "swirl"],
      en: ["Kid Combo: $1.50 off", "Any ice cream + any drink + any candy."],
      es: ["Combo Niño: $1.50 menos", "Cualquier helado + cualquier bebida + cualquier dulce."] },
    { id: "fam", e: "👨‍👩‍👧‍👦", c: "#7ff0d0", when: null, try: ["shortcake", "shortcake", "cookiebar", "rocket", "fruitsoda", "fruitsoda", "water", "water"],
      en: ["Family Pack: $5 off", "4 ice creams + 4 drinks. Bring the whole house out."],
      es: ["Paquete Familiar: $5 menos", "4 helados + 4 bebidas. Que salga toda la casa."] },
    { id: "hh", e: "⏰", c: "#3fa9ff", when: "hh", try: ["fresa", "coco"],
      en: ["Happy Hour 3–4 PM: $1 off paletas", "Every fruit and cream paleta, $1 off."],
      es: ["Hora Feliz 3–4 PM: $1 menos en paletas", "Todas las paletas de agua y de crema, $1 menos."] },
    { id: "toy", e: "🎁", c: "#b79bff", when: "fri", try: ["spinner", "slime", "bubbles"],
      en: ["Toy Friday: buy 2 toys, 3rd FREE", "Fridays only. The cheapest toy is on us."],
      es: ["Viernes de Juguetes: compra 2, el 3º GRATIS", "Solo viernes. El juguete más barato va por nuestra cuenta."] },
    { id: "rw", e: "⭐", c: "#34d399", when: null, try: null,
      en: ["5 visits = a treat on us", "Check in 5 times: 10% off or an extra scoop free."],
      es: ["5 visitas = un antojo de regalo", "Registra 5 visitas: 10% menos o una bola extra gratis."] }
  ];
  var r2 = function (n) { return Math.round(n * 100) / 100; };

  /* cart = { itemId: qty }. opts.friday / opts.happyHour turn on the timed deals.
     Each unit is used by at most one bundle deal; the order of the ice cream deals is chosen to save the most. */
  function price(cart, opts) {
    opts = opts || {};
    var units = [], lines = [], sub = 0;
    Object.keys(cart || {}).forEach(function (id) {
      var it = BY[id], q = Math.max(0, Math.floor(cart[id] || 0)); if (!it || !q) return;
      lines.push({ id: id, q: q, each: it.p, total: r2(it.p * q) }); sub += it.p * q;
      for (var i = 0; i < q; i++) units.push({ id: id, cat: it.cat, p: it.p, hh: it.hh });
    });
    units.sort(function (a, b) { return b.p - a.p; });
    function take(pool, cat, n) { // n cheapest unused units of a category (or null): flat-$ bundles leave the pricier ones for "3rd half off"
      var got = []; for (var i = pool.length - 1; i >= 0 && got.length < n; i--) if (!pool[i].used && pool[i].cat === cat) got.push(pool[i]);
      return got.length === n ? got : null;
    }
    var RUN = {
      fam: function (pool, out) {
        var n = 0; for (;;) { var a = take(pool, "ice", 4), b = take(pool, "drk", 4); if (!a || !b) break; a.concat(b).forEach(function (u) { u.used = 1; }); n++; }
        if (n) out.push({ id: "fam", n: n, save: 5 * n });
      },
      kid: function (pool, out) {
        var n = 0; for (;;) { var a = take(pool, "ice", 1), b = take(pool, "drk", 1), c = take(pool, "cnd", 1); if (!a || !b || !c) break; a[0].used = b[0].used = c[0].used = 1; n++; }
        if (n) out.push({ id: "kid", n: n, save: 1.5 * n });
      },
      b2: function (pool, out) {
        var left = pool.filter(function (u) { return !u.used && u.cat === "ice"; }), s = 0, n = 0;
        for (var i = 2; i < left.length; i += 3) { s += left[i].p / 2; n++; left[i - 2].used = left[i - 1].used = left[i].used = 1; }
        if (n) out.push({ id: "b2", n: n, save: r2(s) });
      }
    };
    var orders = [["fam", "kid", "b2"], ["fam", "b2", "kid"], ["kid", "fam", "b2"], ["kid", "b2", "fam"], ["b2", "fam", "kid"], ["b2", "kid", "fam"]];
    var best = null;
    orders.forEach(function (o) {
      var pool = units.map(function (u) { return { id: u.id, cat: u.cat, p: u.p, hh: u.hh }; }), out = [];
      o.forEach(function (k) { RUN[k](pool, out); });
      var s = out.reduce(function (a, d) { return a + d.save; }, 0);
      if (!best || s > best.s + 1e-9) best = { s: s, out: out, pool: pool };
    });
    var deals = best.out.slice();
    if (opts.happyHour) { // $1 off every paleta, stacks with nothing else (paletas are not in the bundles above)
      var h = best.pool.filter(function (u) { return u.hh; }).length;
      if (h) deals.push({ id: "hh", n: h, save: h * 1 });
    }
    if (opts.friday) { // toys: every 3rd (cheapest of each group of 3) free
      var toys = best.pool.filter(function (u) { return u.cat === "toy"; }), ts = 0, tn = 0;
      for (var i = 2; i < toys.length; i += 3) { ts += toys[i].p; tn++; }
      if (tn) deals.push({ id: "toy", n: tn, save: r2(ts) });
    }
    var order = DEALS.map(function (d) { return d.id; });
    deals.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
    var save = r2(deals.reduce(function (a, d) { return a + d.save; }, 0));
    sub = r2(sub);
    return { lines: lines, deals: deals, sub: sub, save: save, total: r2(Math.max(0, sub - save)), count: units.length };
  }

  var api = { CATS: CATS, ITEMS: ITEMS, BY: BY, DEALS: DEALS, price: price };
  if (typeof module === "object" && module.exports) module.exports = api; else root.IceMenu = api;
})(this);
