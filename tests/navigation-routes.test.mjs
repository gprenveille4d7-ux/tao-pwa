import test from "node:test";
import assert from "node:assert/strict";
import { appRoute, parseAppRoute, resolveAppRoute, SECTION_ROUTES } from "../navigation-routes.mjs";

test("les cinq espaces possèdent leurs sous-routes canoniques", () => {
  assert.deepEqual(Object.keys(SECTION_ROUTES), ["today", "theme", "pavilion", "yijing", "profiles"]);
  assert.deepEqual(parseAppRoute("#today"), { view: "today", section: "understand" });
  assert.deepEqual(parseAppRoute("#theme/composition"), { view: "theme", section: "composition" });
  assert.deepEqual(parseAppRoute("#theme/ten-gods"), { view: "theme", section: "structure" });
  assert.deepEqual(parseAppRoute("#yijing/learn"), { view: "yijing", section: "learn" });
  assert.deepEqual(parseAppRoute("#profiles/family"), { view: "profiles", section: "family" });
});

test("les anciens liens sont canonicalisés sans perdre leur rubrique", () => {
  assert.deepEqual(resolveAppRoute("#today/guidance"), {
    view: "today", section: "understand", canonicalHash: "#today/understand", isAlias: true, isInvalid: false, requestedHash: "#today/guidance",
  });
  assert.equal(resolveAppRoute("#theme/ten-gods").canonicalHash, "#theme/structure");
  assert.equal(resolveAppRoute("#pavilion/almanac").canonicalHash, "#today/season");
});

test("une sous-route invalide revient explicitement à la racine de son espace", () => {
  const invalid = resolveAppRoute("#profiles/inconnue");
  assert.equal(invalid.isInvalid, true);
  assert.equal(invalid.canonicalHash, "#profiles");
  assert.deepEqual(parseAppRoute("#profiles/inconnue"), { view: "profiles", section: "me" });
});

test("une route inconnue revient au Pavillon sans écran cassé", () => {
  assert.deepEqual(parseAppRoute("#unknown/missing"), { view: "pavilion", section: "tao" });
  assert.equal(appRoute("profiles", "compatibility"), "#profiles/compatibility");
  assert.equal(appRoute("profiles", "family"), "#profiles/family");
});
