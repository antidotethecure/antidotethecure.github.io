/* Melody Taco Tuesday menu (printed menu 2026-11-11). Data check, no browser:  node tests/melody-taco-tuesday.mjs */
import fs from "fs"; import vm from "vm"; import assert from "assert";
const c = { window: {} }; vm.createContext(c);
vm.runInContext(fs.readFileSync(new URL("../demo/melody-lax/menu-data.js", import.meta.url), "utf8"), c);
const food = c.window.SSAI_MENU["melody-bar-grill"].food, by = id => food.find(x => x.id === id);
const names = food.flatMap(x => x.items.map(it => it[0]));
assert.equal(new Set(names).size, names.length, "every food name is unique (the cart is keyed by name)");
const el = by("tt-elevated"), cl = by("tt-classics");
assert.ok(el.items.length === 3 && el.items.every(it => it[1] === 6.99), "3 elevated tacos at $6.99");
assert.ok(cl.items.length === 9 && cl.items.every(it => it[1] === 4), "9 classic tacos at $4");
for (const x of [el, cl]) assert.ok(x.day === "Tue" && x.only === "Tuesdays only" && /Tuesdays only/.test(x.note), x.id + " is marked Tuesdays only");
assert.ok(food.filter(x => x.day).length === 2, "nothing else is day-only");
for (const it of food.flatMap(x => x.items)) if (it[3]) assert.ok(fs.existsSync(new URL("../demo/melody-lax/img/menu/" + it[3] + ".jpg", import.meta.url)), "picture file exists: " + it[3]);
console.log("ALL OK");
