import assert from "node:assert/strict";
import { renderTrainView } from "../scripts/views/train-view.js";

const baseTrain = {
  trainId: "TEST-TRAIN",
  trainName: "Test",
  sections: [
    {
      id: "A",
      name: "Lead",
      length: 20,
      axles: [{ axleId: "a1", offset: 5, load: 10 }]
    },
    {
      id: "B",
      name: "Trailer",
      length: 15,
      axles: [{ axleId: "b1", offset: 3, load: 10 }]
    }
  ]
};

const baseValidation = { valid: true, errors: [] };

// Each section renders three <details> with deterministic data-panel-id values
{
  const html = renderTrainView({ train: baseTrain, validation: baseValidation });

  // Section 0
  assert.ok(html.includes('data-panel-id="sec-0-geometry"'), "sec-0-geometry panel id present");
  assert.ok(html.includes('data-panel-id="sec-0-axles"'), "sec-0-axles panel id present");
  assert.ok(html.includes('data-panel-id="sec-0-mass"'), "sec-0-mass panel id present");

  // Section 1
  assert.ok(html.includes('data-panel-id="sec-1-geometry"'), "sec-1-geometry panel id present");
  assert.ok(html.includes('data-panel-id="sec-1-axles"'), "sec-1-axles panel id present");
  assert.ok(html.includes('data-panel-id="sec-1-mass"'), "sec-1-mass panel id present");
}

// Geometry and axle panels are open by default; mass panel is closed
{
  const html = renderTrainView({ train: baseTrain, validation: baseValidation });

  // open attribute appears on geometry and axles details
  assert.ok(
    html.includes('data-panel-id="sec-0-geometry" open') ||
    html.includes('open data-panel-id="sec-0-geometry"'),
    "sec-0-geometry is open by default"
  );
  assert.ok(
    html.includes('data-panel-id="sec-0-axles" open') ||
    html.includes('open data-panel-id="sec-0-axles"'),
    "sec-0-axles is open by default"
  );

  // mass panel does NOT have open by default
  assert.ok(
    !html.includes('data-panel-id="sec-0-mass" open') &&
    !html.includes('open data-panel-id="sec-0-mass"'),
    "sec-0-mass is closed by default"
  );
}

// Panel IDs are unique across all sections
{
  const train = {
    trainId: "T",
    trainName: "T",
    sections: Array.from({ length: 4 }, (_, i) => ({
      id: `S${i}`,
      name: `Section ${i}`,
      length: 10,
      axles: []
    }))
  };
  const html = renderTrainView({ train, validation: baseValidation });
  const ids = [...html.matchAll(/data-panel-id="([^"]+)"/g)].map((m) => m[1]);
  const unique = new Set(ids);
  assert.equal(ids.length, unique.size, "all data-panel-id values are unique");
  assert.equal(ids.length, 4 * 3, "4 sections × 3 panels each = 12 ids");
}

// Empty train renders no section panels
{
  const html = renderTrainView({ train: { trainId: "T", trainName: "T", sections: [] }, validation: baseValidation });
  const ids = [...html.matchAll(/data-panel-id=/g)];
  assert.equal(ids.length, 0, "no panel ids when sections is empty");
}

console.log("train-view-panels.test.js passed");
