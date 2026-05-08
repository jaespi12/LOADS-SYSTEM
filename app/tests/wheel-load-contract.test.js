import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateAgainstSchema } from "../scripts/utils/validation.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const j = (rel) => JSON.parse(readFileSync(resolve(repoRoot, rel), "utf8"));

const wheelLoadSchema = j("shared/schemas/wheel-load-result.schema.json");
const envelopeSchema = j("shared/schemas/envelope-result.schema.json");
const codeSets = j("shared/data/code-sets.json");
const fixture = j("app/data/example-wheel-load-result.json");

// Fixture conforms to schema
{
  const result = validateAgainstSchema(wheelLoadSchema, fixture);
  assert.equal(result.valid, true, `Fixture failed schema validation: ${result.errors.join("; ")}`);
}

// Computation context is fully PENDING_APPROVAL — no formula leakage
{
  assert.equal(fixture.computationContext.computationStatus, "PENDING_APPROVAL");
  assert.equal(fixture.computationContext.formulaScopeId, "WHEEL_LOAD_V0");
}

// All numeric forces and moments are null until math approval
{
  for (const axle of fixture.axleResults) {
    assert.equal(axle.forces.vertical, null);
    assert.equal(axle.forces.lateral, null);
    assert.equal(axle.forces.longitudinal, null);
    assert.equal(axle.moments.rolling, null);
    assert.equal(axle.moments.pitching, null);
    assert.equal(axle.moments.yawing, null);
    for (const contrib of axle.contributions ?? []) {
      assert.equal(contrib.vertical, null);
      assert.equal(contrib.lateral, null);
      assert.equal(contrib.longitudinal, null);
    }
  }
}

// codeSetId references an actual code in code-sets.json
{
  const ids = codeSets.codes.map((c) => c.id);
  assert.ok(ids.includes(fixture.computationContext.codeSetId),
    `codeSetId ${fixture.computationContext.codeSetId} is not in code-sets.json`);
}

// formulaScopeId references a known scope in code-sets.json
{
  const scopeIds = (codeSets.formulaScopes ?? []).map((s) => s.id);
  assert.ok(scopeIds.includes(fixture.computationContext.formulaScopeId),
    `formulaScopeId ${fixture.computationContext.formulaScopeId} is not registered in code-sets.formulaScopes`);
}

// formulaScopes WHEEL_LOAD_V0 and ENVELOPE_V0 are both PENDING_APPROVAL
{
  const wl = (codeSets.formulaScopes ?? []).find((s) => s.id === "WHEEL_LOAD_V0");
  const env = (codeSets.formulaScopes ?? []).find((s) => s.id === "ENVELOPE_V0");
  assert.ok(wl, "WHEEL_LOAD_V0 scope must be present");
  assert.ok(env, "ENVELOPE_V0 scope must be present");
  assert.equal(wl.status, "PENDING_APPROVAL");
  assert.equal(env.status, "PENDING_APPROVAL");
  assert.deepEqual(wl.approvedCodeIds, []);
  assert.deepEqual(env.approvedCodeIds, []);
}

// Schema correctly rejects bogus computationStatus
{
  const bad = JSON.parse(JSON.stringify(fixture));
  bad.computationContext.computationStatus = "PUBLISHED";
  const result = validateAgainstSchema(wheelLoadSchema, bad);
  assert.equal(result.valid, false);
}

// Schema correctly rejects a non-numeric, non-null force
{
  const bad = JSON.parse(JSON.stringify(fixture));
  bad.axleResults[0].forces.vertical = "12 kips";
  const result = validateAgainstSchema(wheelLoadSchema, bad);
  assert.equal(result.valid, false);
}

// Envelope schema accepts a minimal pending-approval envelope shape
{
  const env = {
    envelopeId: "ENV-DEMO-001",
    computationContext: {
      codeSetId: "ASCE-SEI-7-22",
      designBasisId: "DB-001",
      formulaScopeId: "ENVELOPE_V0",
      computationStatus: "PENDING_APPROVAL"
    },
    stationStations: [0, 25, 50],
    components: [
      {
        componentId: "VERTICAL-AXLE-MAX",
        channel: "FORCE_VERTICAL",
        stations: [
          { station: 0,  max: null, min: null },
          { station: 25, max: null, min: null },
          { station: 50, max: null, min: null }
        ]
      }
    ],
    readiness: { status: "PENDING_APPROVAL", blockingIssues: [], warnings: [] }
  };
  const result = validateAgainstSchema(envelopeSchema, env);
  assert.equal(result.valid, true, `Envelope schema rejected the minimal shape: ${result.errors.join("; ")}`);
}

console.log("wheel-load-contract.test.js passed");
