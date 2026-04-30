import fs from "node:fs";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const loadFamilyTypes = readJson("shared/data/load-family-types.json");
const loadFamilySchema = readJson("shared/schemas/load-family-profile.schema.json");
const loadFamilyFixture = readJson("app/data/example-load-families.json");

const errors = [];

const lookupIds = new Set((loadFamilyTypes.families ?? []).map((f) => f.id));
const requiredIds = new Set((loadFamilyTypes.families ?? []).filter((f) => f.required).map((f) => f.id));
const fixtureIds = new Set((loadFamilyFixture.families ?? []).map((f) => f.familyId));

const schemaStatusEnum = loadFamilySchema?.properties?.families?.items?.properties?.status?.enum ?? [];
const schemaSourceEnum = loadFamilySchema?.properties?.families?.items?.properties?.sourceType?.enum ?? [];

if (!requiredIds.has("SEISMIC")) {
  errors.push("Required load-family set must include SEISMIC.");
}

requiredIds.forEach((id) => {
  if (!fixtureIds.has(id)) errors.push(`Fixture missing required load family: ${id}`);
});

fixtureIds.forEach((id) => {
  if (!lookupIds.has(id)) errors.push(`Fixture references unknown load family ID: ${id}`);
});

if (!schemaStatusEnum.length) errors.push("Schema status enum is empty.");
if (!schemaSourceEnum.length) errors.push("Schema sourceType enum is empty.");

if (errors.length) {
  console.error("Drift check failed:");
  errors.forEach((e) => console.error(`- ${e}`));
  process.exit(1);
}

console.log("Drift check passed.");
