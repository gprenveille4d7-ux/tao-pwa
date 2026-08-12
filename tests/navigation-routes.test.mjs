import test from "node:test";
import assert from "node:assert/strict";
import { appRoute, parseAppRoute, SECTION_ROUTES } from "../navigation-routes.mjs";

test("les cinq espaces possèdent leurs sous-routes canoniques", () => {
  assert.deepEqual(Object.keys(SECTION_ROUTES), ["today", "theme", "pavilion", "yijing", "profiles"]);
  assert.deepEqual(parseAppRoute("#theme/ten-gods"), { view: "theme", section: "ten-gods" });
  assert.deepEqual(parseAppRoute("#yijing/learn"), { view: "yijing", section: "learn" });
});

test("une route inconnue revient au Pavillon sans écran cassé", () => {
  assert.deepEqual(parseAppRoute("#unknown/missing"), { view: "pavilion", section: "tao" });
  assert.equal(appRoute("profiles", "compatibility"), "#profiles/compatibility");
});
