// Garde-fou du registre (change studio-info-registry-cleanup) : la liste
// des types proposés à la création dérive du registre, chaque type
// exactement une fois (aucune clé React dupliquée, aucune option parasite).
import { strict as assert } from "node:assert";
import { typesCreation, MODULE_REGISTRY_BASE } from "./src/game/module-registry.ts";

const types = typesCreation();
assert.equal(new Set(types).size, types.length, `doublon dans ${JSON.stringify(types)}`);
assert.ok(types.includes("INFO"), "INFO proposé via le registre");
assert.ok(!types.some((t) => t.startsWith("$")), "aucune clé technique");
assert.equal(types[0], "INFO", "INFO premier");
assert.equal(types[types.length - 1], "RANDOM_POOL", "RANDOM_POOL en dernier");
assert.deepEqual(
  [...types].sort(),
  [...Object.keys(MODULE_REGISTRY_BASE).filter((t) => !t.startsWith("$")), "RANDOM_POOL"].sort(),
  "couverture exacte du registre + structurel",
);
console.log(`registry.smoke: ALL OK (${types.length} types uniques)`);
