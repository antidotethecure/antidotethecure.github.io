/* Unit test for the ELM327 parser + code rules in ../obd.js. Run: node demo/mechanic/test/obd-parser.test.js
   Web Bluetooth itself can't run headless, so this covers everything after the bytes arrive. */
"use strict";
const assert = require("assert");
global.window = global;
require("../obd-codes.js");
const O = require("../obd.js");
let n = 0;
function t(name, fn) { fn(); n++; console.log("ok -", name); }

t("legacy 43 + 3 slots -> P0133 (zero padding ignored)", () => assert.deepStrictEqual(O.parseDTCs("43 01 33 00 00 00 00", "03"), ["P0133"]));
t("legacy, spaces off", () => assert.deepStrictEqual(O.parseDTCs("43013300000000\r\r>", "03"), ["P0133"]));
t("legacy, two ECUs + more than 3 codes over several lines", () =>
  assert.deepStrictEqual(O.parseDTCs("43 01 33 04 20 03 01\r43 01 71 00 00 00 00\r\r>", "03"), ["P0133", "P0420", "P0301", "P0171"]));
t("CAN single frame with count byte -> P0133 + P0420", () => assert.deepStrictEqual(O.parseDTCs("43 02 01 33 04 20", "03"), ["P0133", "P0420"]));
t("CAN no codes", () => assert.deepStrictEqual(O.parseDTCs("43 00\r\r>", "03"), []));
t("CAN multi-frame ISO-TP reply", () =>
  assert.deepStrictEqual(O.parseDTCs("00A\r0: 43 04 01 33 04 20\r1: 03 01 40 35 00 00\r\r>", "03", true), ["P0133", "P0420", "P0301", "C0035"]));
t("SEARCHING... + NO DATA noise", () => assert.deepStrictEqual(O.parseDTCs("SEARCHING...\rNO DATA\r\r>", "03"), []));
t("mode 07 pending uses 47 header", () => assert.deepStrictEqual(O.parseDTCs("47 01 03 02", "07"), ["P0302"]));
t("mode 03 parser ignores a 47 reply", () => assert.deepStrictEqual(O.parseDTCs("47 01 03 02", "03"), []));
t("letter + digit decoding (C/B/U)", () => {
  assert.strictEqual(O.decodeDTC(0x40, 0x35), "C0035");
  assert.strictEqual(O.decodeDTC(0x80, 0x01), "B0001");
  assert.strictEqual(O.decodeDTC(0xC1, 0x00), "U0100");
  assert.strictEqual(O.decodeDTC(0x0A, 0x80), "P0A80");
  assert.strictEqual(O.decodeDTC(0x20, 0x96), "P2096");
  assert.strictEqual(O.decodeDTC(0x11, 0x23), "P1123");
});
t("ATDPN -> CAN?", () => { assert.strictEqual(O.isCanProto("A6"), true); assert.strictEqual(O.isCanProto("3\r>"), false); assert.strictEqual(O.isCanProto("A7\r\r>"), true); });
t("mode 01: RPM / coolant / MIL", () => {
  assert.strictEqual(O.parsePID("41 0C 0B B8", "0C"), 750);
  assert.strictEqual(O.parsePID("41 05 7B", "05"), 83);
  assert.deepStrictEqual(O.parsePID("41 01 83 07 65 00", "01"), { mil: true, count: 3 });
  assert.deepStrictEqual(O.parsePID("41 01 00 07 65 00", "01"), { mil: false, count: 0 });
});
t("ATRV voltage", () => { assert.strictEqual(O.parseVolts("12.6V\r>"), 12.6); assert.strictEqual(O.parseVolts("14.1 V"), 14.1); });
t("code info: P0420 -> ok to drive, O2 + scan job, description", () => {
  const i = O.info("p0420");
  assert.strictEqual(i.code, "P0420"); assert.strictEqual(i.sev, "ok"); assert.ok(/Catalyst/.test(i.desc));
  assert.deepStrictEqual(i.jobs, [["diag", "scan"], ["exhaust", "o2"]]);
});
t("code info: oil pressure + overheat = stop", () => { assert.strictEqual(O.info("P0521").sev, "stop"); assert.strictEqual(O.info("P0217").sev, "stop"); });
t("code info: misfire = soon, plugs + coil", () => { const i = O.info("P0302"); assert.strictEqual(i.sev, "soon"); assert.deepStrictEqual(i.jobs[0], ["engine", "plugs"]); });
t("P0016 hits the crank/cam rule, not VVT", () => assert.ok(/Crank/.test(O.info("P0016").sys.en)));
t("manufacturer-specific codes flagged", () => { ["P1456", "P3000", "B1234", "C1201", "U1000"].forEach((c) => assert.strictEqual(O.info(c).mfr, true, c)); ["P0300", "P3400", "U0100", "C0035"].forEach((c) => assert.strictEqual(O.info(c).mfr, false, c)); });
t("bad input rejected", () => { assert.strictEqual(O.info("hello"), null); assert.strictEqual(O.info("P04200"), null); assert.strictEqual(O.info("X0420"), null); });
t("simulated scan", () => { const s = O.simulate(); assert.deepStrictEqual(s.stored, ["P0420", "P0171"]); assert.deepStrictEqual(s.pending, ["P0302"]); assert.strictEqual(s.status.mil, true); });
t("database size + spot checks", () => {
  const db = global.OBD_CODES; assert.ok(Object.keys(db).length > 2000);
  assert.ok(/Random\/Multiple Cylinder Misfire/.test(db.P0300)); assert.ok(/O2 Sensor Circuit Slow Response/.test(db.P0133)); assert.ok(/System too Lean/i.test(db.P0171));
  assert.ok(!Object.keys(db).some((k) => /^P1/.test(k)), "no manufacturer P1 codes");
});
console.log("\n" + n + " tests passed");
