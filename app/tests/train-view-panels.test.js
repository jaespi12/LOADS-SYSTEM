import assert from "node:assert/strict";
import { renderTrainView } from "../scripts/views/train-view.js";

const baseTrain = {
  trainId: "TEST-TRAIN",
  trainName: "Test",
  vehicleType: "PASSENGER_RAIL",
  sections: [
    { id: "A", name: "Lead", length: 20, axles: [{ axleId: "a1", offset: 5, load: 10 }] },
    { id: "B", name: "Trailer", length: 15, axles: [{ axleId: "b1", offset: 3, load: 10 }] }
  ]
};

const baseValidation = { valid: true, errors: [] };

// Each section renders three <details> with deterministic data-panel-id values
{
  const html = renderTrainView({ train: baseTrain, validation: baseValidation });
  assert.ok(html.includes('data-panel-id="sec-0-geometry"'));
  assert.ok(html.includes('data-panel-id="sec-0-axles"'));
  assert.ok(html.includes('data-panel-id="sec-0-mass"'));
  assert.ok(html.includes('data-panel-id="sec-1-geometry"'));
  assert.ok(html.includes('data-panel-id="sec-1-axles"'));
  assert.ok(html.includes('data-panel-id="sec-1-mass"'));
}

// Geometry and axle panels open by default; mass panel closed
{
  const html = renderTrainView({ train: baseTrain, validation: baseValidation });
  assert.ok(/<details\s+open\s+data-panel-id="sec-0-geometry"/.test(html));
  assert.ok(/<details\s+open\s+data-panel-id="sec-0-axles"/.test(html));
  assert.ok(/<details\s+data-panel-id="sec-0-mass"/.test(html));
  assert.ok(!/<details\s+open\s+data-panel-id="sec-0-mass"/.test(html));
}

// Panel IDs are unique
{
  const train = {
    trainId: "T", trainName: "T",
    sections: Array.from({ length: 4 }, (_, i) => ({ id: `S${i}`, length: 10, axles: [] }))
  };
  const html = renderTrainView({ train, validation: baseValidation });
  const ids = [...html.matchAll(/data-panel-id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(ids.length, 4 * 3);
}

// Banned wording must not appear in user-facing UI
{
  const train = {
    trainId: "T", trainName: "T",
    sections: [{ id: "A", length: 10, axles: [{ axleId: "a1", offset: 1, load: 0 }] }]
  };
  const html = renderTrainView({ train, validation: baseValidation });
  // Strip data-* attribute values, esc'd entities, and HTML attribute keys before checking
  const visible = html
    .replace(/data-[a-z-]+="[^"]*"/g, "")
    .replace(/\bdata-action\b/g, "")
    .replace(/\bdata-field\b/g, "")
    .replace(/value="[^"]*"/g, "")
    .replace(/<[^>]+>/g, " ");
  for (const banned of [
    "BEL", "Stengel", " CoM ", "placeholder",
    "readiness", "Readiness", "schema", "Schema",
    "section idx", "axle idx", "sectionIdx", "axleIdx",
    "participatesInLoadGen", "dataSource",
    "Validation", "Sections & Axles", "Mass & Inertia Model"
  ]) {
    assert.ok(!visible.includes(banned), `Banned term in visible UI: "${banned}"`);
  }
}

// Required product-language labels are present
{
  const html = renderTrainView({ train: baseTrain, validation: baseValidation });
  for (const label of [
    "Train Details",
    "Train Formation",
    "Train ID",
    "Train Name",
    "Vehicle Type",
    "Section Geometry",
    "Axle / Wheel Layout",
    "Mass &amp; Inertia Inputs",
    "Center of Mass X",
    "Center of Mass Y",
    "Center of Mass Z",
    "Inertia XX",
    "Inertia YY",
    "Inertia ZZ",
    "Used in Calculations",
    "Source",
    "Gap to Next Section",
    "Derived Train Geometry",
    "Checks",
    "Calculation Usage",
    "Used by calculations now",
    "Saved now, used later",
    "Not yet used by calculations",
    "Axle Position Table"
  ]) {
    assert.ok(html.includes(label), `Missing required label: "${label}"`);
  }
}

// KPI/summary cards visually distinguish calculated, count, and input values
{
  const html = renderTrainView({ train: baseTrain, validation: baseValidation });
  assert.ok(html.includes("summary-card-input"));
  assert.ok(html.includes("summary-card-count"));
  assert.ok(html.includes("summary-card-calc"));
  assert.ok(html.includes("kpi-badge-input"));
  assert.ok(html.includes("kpi-badge-count"));
  assert.ok(html.includes("kpi-badge-calc"));
}

// Checks panel: blocking issues use plain language, no field paths
{
  const train = {
    trainId: "T", trainName: "T",
    sections: [{ id: "A", name: "Lead", length: 10, axles: [
      { axleId: "dup", offset: 1, load: 0 }, { axleId: "dup", offset: 2, load: 0 }
    ]}]
  };
  const html = renderTrainView({ train, validation: { valid: true, errors: [] } });
  assert.ok(html.includes("Two axles share the same ID"));
  assert.ok(!html.includes("sections[0]"));
}

// Empty train renders no panel ids and shows the empty hint
{
  const html = renderTrainView({ train: { trainId: "T", trainName: "T", sections: [] }, validation: baseValidation });
  assert.equal([...html.matchAll(/data-panel-id=/g)].length, 0);
  assert.ok(html.includes("No sections defined"));
}

// Larger chevron — uses span with .summary-chevron, not a tiny ::before triangle
{
  const html = renderTrainView({ train: baseTrain, validation: baseValidation });
  assert.ok(html.includes("summary-chevron"));
}

// Axle compact table: all axle fields render, single-row Excel-style table present
{
  const trainWithAxle = {
    trainId: "T", trainName: "T",
    sections: [{ id: "A", length: 10, axles: [{
      axleId: "A1", offset: 5, load: 10, wheelPairId: "WP-1",
      gauge: 4.708, leftWheelId: "WL-1", rightWheelId: "WR-1"
    }] }]
  };
  const html = renderTrainView({ train: trainWithAxle, validation: baseValidation });
  // Excel-style table structure present
  assert.ok(html.includes('class="data-table data-table-axles"'), "data-table-axles table missing");
  assert.ok(html.includes('<thead>'), "thead missing");
  assert.ok(html.includes('<tbody>'), "tbody missing");
  assert.ok(html.includes('Left Wheel ID'), "Left Wheel ID header missing");
  assert.ok(html.includes('Right Wheel ID'), "Right Wheel ID header missing");
  // All field data-* targets present in a single row (no secondary detail row)
  assert.ok(html.includes('field="axleId"'), 'axleId field missing');
  assert.ok(html.includes('field="offset"'), 'offset field missing');
  assert.ok(html.includes('field="load"'), 'load field missing');
  assert.ok(html.includes('field="wheelPairId"'), 'wheelPairId field missing');
  assert.ok(html.includes('field="gauge"'), 'gauge field missing');
  assert.ok(html.includes('field="leftWheelId"'), 'leftWheelId field missing');
  assert.ok(html.includes('field="rightWheelId"'), 'rightWheelId field missing');
  // Remove button still present
  assert.ok(html.includes('data-action="remove-axle"'), 'remove-axle button missing');
  // No old secondary detail row or stacked card layout
  assert.ok(!html.includes('axle-table-detail'), 'old axle-table-detail secondary row still present');
  assert.ok(!html.includes('axle-card'), 'old axle-card stacked layout still present');
}

console.log("train-view-panels.test.js passed");
