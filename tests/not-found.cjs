// node tests/not-found.cjs : the 404 page's address fixer (js/not-found.js)
const assert = require("assert"), fix = require("../js/not-found.js");
assert.strictEqual(fix("/Valenzo/"), "/valenzo/");
assert.strictEqual(fix("/Valenzo"), "/valenzo/");
assert.strictEqual(fix("/velenzio/"), "/valenzo/");
assert.strictEqual(fix("/Velenzio"), "/valenzo/");
assert.strictEqual(fix("/VALENZIO/index.html"), "/valenzo/index.html");
assert.strictEqual(fix("/valenzo/"), "/valenzo/");                 // already right: no redirect, so no loop
assert.strictEqual(fix("/Western/"), "/western/");
assert.strictEqual(fix("/nope/"), "/nope/");                       // a real dead link stays on the 404 page
assert.strictEqual(fix("//evil.example/Valenzo"), "/evil.example/valenzo");   // never leaves the site
console.log("not-found: ok");
