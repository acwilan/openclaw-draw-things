#!/usr/bin/env node
import { readFileSync } from "node:fs";

const catalogPath = "src/model-catalog.generated.json";
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

if (!Array.isArray(catalog.models) || catalog.models.length === 0) {
  fail("catalog.models must be a non-empty array");
}

for (const [index, model] of catalog.models.entries()) {
  for (const field of ["model", "name", "source", "baseType", "purpose"]) {
    if (typeof model[field] !== "string" || model[field].trim() === "") {
      fail(`models[${index}].${field} must be a non-empty string`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(model, "downloaded")) {
    fail(`models[${index}] must not include local downloaded state`);
  }
}

console.log(`Model catalog OK: ${catalog.models.length} models`);

function fail(message) {
  console.error(`Invalid ${catalogPath}: ${message}`);
  process.exit(1);
}
