import assert from "node:assert/strict";
import { analyzeTrainModel } from "../scripts/utils/train-model.js";

// Empty train → zero counts, no warnings about axles
{
  const m = analyzeTrainModel({ sections: [] });
  assert.equal(m.sectionCount, 0);
  assert.equal(m.axleCount, 0);
  assert.equal(m.totalTrainLength, 0);
  assert.equal(m.firstToLastWheelDistance, null);
}

// Two sections, no gap → cumulative starts and total length match
{
  const train = {
    sections: [
      { id: "A", name: "A", length: 50, axles: [{ axleId: "a1", offset: 5, load: 1 }, { axleId: "a2", offset: 45, load: 1 }] },
      { id: "B", name: "B", length: 30, axles: [{ axleId: "b1", offset: 10, load: 1 }] }
    ]
  };
  const m = analyzeTrainModel(train);
  assert.equal(m.sectionCount, 2);
  assert.equal(m.axleCount, 3);
  assert.equal(m.sectionLengthSum, 80);
  assert.equal(m.interSectionGapSum, 0);
  assert.equal(m.totalTrainLength, 80);
  assert.equal(m.sections[0].sectionStart, 0);
  assert.equal(m.sections[0].sectionEnd, 50);
  assert.equal(m.sections[1].sectionStart, 50);
  assert.equal(m.sections[1].sectionEnd, 80);
  // global positions
  assert.equal(m.axles[0].globalPosition, 5);
  assert.equal(m.axles[1].globalPosition, 45);
  assert.equal(m.axles[2].globalPosition, 60);
  assert.equal(m.firstToLastWheelDistance, 55);
}

// Inter-section gap shifts later section
{
  const train = {
    sections: [
      { id: "A", length: 10, gapToNext: 4, axles: [{ axleId: "a1", offset: 2, load: 1 }] },
      { id: "B", length: 10, axles: [{ axleId: "b1", offset: 3, load: 1 }] }
    ]
  };
  const m = analyzeTrainModel(train);
  assert.equal(m.totalTrainLength, 24);
  assert.equal(m.sections[1].sectionStart, 14);
  assert.equal(m.axles[1].globalPosition, 17);
  assert.equal(m.firstToLastWheelDistance, 15);
}

// Wheel pair count from distinct wheelPairId
{
  const train = {
    sections: [{
      id: "A", length: 10, axles: [
        { axleId: "a1", offset: 1, load: 0, wheelPairId: "WP1" },
        { axleId: "a2", offset: 3, load: 0, wheelPairId: "WP1" },
        { axleId: "a3", offset: 6, load: 0, wheelPairId: "WP2" },
        { axleId: "a4", offset: 9, load: 0, wheelPairId: "WP2" }
      ]
    }]
  };
  const m = analyzeTrainModel(train);
  assert.equal(m.wheelPairCount, 2);
}

// Wheel pair count fallback when no wheelPairId
{
  const train = { sections: [{ id: "A", length: 10, axles: [
    { offset: 1, load: 0 }, { offset: 2, load: 0 }, { offset: 3, load: 0 }
  ]}]};
  const m = analyzeTrainModel(train);
  assert.equal(m.wheelPairCount, Math.ceil(3 / 2));
}

// Blocking warning: axle offset outside section length
{
  const train = { sections: [{ id: "A", length: 10, axles: [{ axleId: "a1", offset: 25, load: 0 }] }] };
  const m = analyzeTrainModel(train);
  const blocking = m.warnings.filter((w) => w.severity === "blocking");
  assert.ok(blocking.some((w) => w.message.includes("outside section length")));
}

// Blocking warning: duplicate axle ID — plain language, no developer jargon
{
  const train = { sections: [{ id: "A", length: 10, axles: [
    { axleId: "dup", offset: 1, load: 0 }, { axleId: "dup", offset: 2, load: 0 }
  ]}]};
  const m = analyzeTrainModel(train);
  const blocking = m.warnings.filter((w) => w.severity === "blocking");
  assert.ok(blocking.some((w) => w.message.includes("Two axles share the same ID")));
  assert.ok(!blocking.some((w) => w.message.includes("axleId")));
}

// Info warnings: plain-language messages, no vendor names, no developer jargon
{
  const train = { sections: [{ id: "A", length: 10, axles: [{ offset: 1, load: 0 }] }] };
  const m = analyzeTrainModel(train);
  const info = m.warnings.filter((w) => w.severity === "info");
  assert.ok(info.some((w) => w.message.includes("mass is not yet entered")));
  assert.ok(info.some((w) => w.message.includes("inertia values are not yet entered")));
  assert.ok(info.some((w) => w.message.includes("center of mass height is not yet entered")));
  for (const w of m.warnings) {
    assert.ok(!/BEL|Stengel|placeholder|\bCoM\b|sections\[/.test(w.message), `banned term in: ${w.message}`);
  }
}

// Negative length is blocking
{
  const train = { sections: [{ id: "A", length: -5, axles: [{ offset: 0, load: 0 }] }] };
  const m = analyzeTrainModel(train);
  assert.ok(m.warnings.some((w) => w.severity === "blocking" && w.message.includes("negative length")));
}

// Section label falls back: name → id → "Section N"
{
  const train = { sections: [
    { name: "Lead Car", length: 10, axles: [] },
    { id: "B", length: -1, axles: [] },
    { length: -1, axles: [] }
  ]};
  const m = analyzeTrainModel(train);
  assert.ok(m.warnings.some((w) => w.message.startsWith("B has a negative length")));
  assert.ok(m.warnings.some((w) => w.message.startsWith("Section 3 has a negative length")));
}

console.log("train-model.test.js passed");
