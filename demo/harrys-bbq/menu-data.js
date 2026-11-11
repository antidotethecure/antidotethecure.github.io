/* Harry's Oklahoma Style Smokehouse BBQ: the real menu + prices from homeofharrysbbq.com (checked 2026-11-09).
   Row = [name, price, description, photo?]. Photo defaults to img/h-<slug>.webp where slug = name lowercased,
   every run of non [a-z0-9] chars -> "-", trimmed. Drop a file with that name in img/ and it shows up; until then
   the card shows a branded placeholder (index.html handles the 404). Only 3 rows override the default name. */
window.HARRYS_SLUG = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); };
window.HARRYS_MENU = [
 {id: "meats", name: "Smoked Meats", note: "Hand-rubbed with Harry's homemade dry rub, hickory smoked 6 to 14 hours, finished with Harry's Original sauce.", items: [
  ["Baby Back Ribs", 33.99, "Fall-off-the-bone tender, hickory smoked low and slow, glazed with Harry's Original sauce.", "h-ribs.webp"],
  ["Beef Ribs", 35.99, "Meaty, tender beef ribs smoked low and slow over hickory.", "h-beef-ribs.webp"],
  ["Brisket Burnt Ends", 31.99, "The bark-heavy brisket ends, caramelized in Harry's sauce."],
  ["Brisket", 34.99, "The heart of Oklahoma-style BBQ: hand-rubbed, smoked 6 to 14 hours."],
  ["Tri-Tip", 37.99, "A West Coast favorite: Harry's rub, slow-smoked over hickory."],
  ["Pulled Pork or Pulled Chicken", 30.99, "Smoked until it falls apart, then hand-pulled."],
  ["Hot Link Sausage (3 links)", 18.99, "All-beef, hickory-smoked, with just the right heat."],
  ["Chicken Wings (12)", 19.99, "Hickory-smoked wings."]]},
 {id: "sandwiches", name: "Sandwiches", items: [
  ["Brisket Sandwich", 18.95, "Hand-sliced hickory brisket piled high on a fresh bun with Harry's Original."],
  ["Tri-Tip Sandwich", 19.95, "Thick-cut smoked tri-tip, carved fresh."],
  ["Pulled Pork Sandwich", 16.95, "Hand-shredded, slow-smoked pork on a fresh bun."],
  ["Pulled Chicken Sandwich", 16.95, "Hickory pulled chicken drizzled with Harry's sauce."],
  ["Sliders (3)", 19.95, "Three buns, your choice of Harry's smoked meats."]]},
 {id: "plates", name: "Plates for Two", items: [
  ["Three Meat Dinner Plate", 52.95, "Any three smoked meats, two sides and a roll with butter."],
  ["Baby Back Rib Dinner Plate (8)", 49.95, "Hickory-smoked baby backs with two sides."],
  ["Beef Rib Dinner Plate (5)", 51.95, "Meaty beef ribs with two sides."],
  ["Brisket Dinner Plate (¾ lb)", 47.95, "Hand-sliced brisket with two sides."],
  ["2 Meat Combo + 1 Side", 27.99, "The daily special: any two meats with a homestyle side."]]},
 {id: "sides", name: "Sides", note: "Dine in and the waffle fries are on the house.", items: [
  ["Mac & Cheese", 8.99, "Creamy, cheesy and downright comforting."],
  ["Mashed Potatoes", 8.99, "Fluffy, buttery and homestyle."],
  ["Molasses Baked Beans", 8.99, "Slow-simmered with molasses and bits of pork."],
  ["Cornbread w/ Honey Butter", 5.99, "Baked fresh, with whipped honey butter."],
  ["Waffle Fries", 8.99, "Crispy waffle-cut fries."],
  ["Oklahoma Red Dirt Potato Wedges", 8.75, "Daily special side."],
  ["Sassy Slaw", 7.99, "Cabbage and carrots in a sweet vinaigrette."],
  ["Fried Okra", 8.99, "Golden-battered, a Southern favorite."]]},
 {id: "sweets", name: "Sweets", items: [
  ["Aunt Cheryl's Peach Cobbler", 9.99, "A family favorite: juicy peaches under a buttery crust, served warm.", "h-cobbler.webp"],
  ["Homemade Bread Pudding", 9.99, "Croissant bread baked with warm spices."],
  ["Margot Dean's Homemade Cookie", 3.49, "Baked in-house."]]},
 {id: "feasts", name: "Feasts", note: "Feeds the crew. Catering is available too: call the restaurant.", items: [
  ["Harry's Tailgate Feast (3-4)", 94.77, "6 baby backs, 1 lb pulled pork, 2 hot links, 2 large sides, cornbread."],
  ["Game Day MVP Combo (2)", 42.77, "½ lb brisket or pulled pork plus 2 Oklahoma hot links."],
  ["Family Feast Platter 1 (up to 5)", 225.99, "Ribs, brisket or tri-tip, chicken and sides."]]}
];
window.HARRYS_MENU.forEach(function (c) { c.items.forEach(function (it) { if (!it[3]) it[3] = "h-" + window.HARRYS_SLUG(it[0]) + ".webp"; }); });
