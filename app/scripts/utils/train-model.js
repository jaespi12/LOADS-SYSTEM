/*
 * Train-model analysis — derived vehicle-model geometry and engineering warnings.
 *
 * Pure data assembly. No engineering formulas. Read by the Train view to
 * surface derived positions, totals, and inline warnings.
 *
 * Engine note: the wheel-load and grouping engines compute axle stations from
 * `section.length` only (no inter-section gaps). This module exposes a
 * gap-aware "train-coordinate" view used by the UI for first-to-last wheel
 * distance and global axle positions. The two views agree exactly when
 * gapToNext is zero or absent for every section.
 */

function sectionLabel(section, idx) {
  return section?.name || section?.id || `Section ${idx + 1}`;
}

export function analyzeTrainModel(train) {
  const sections = train?.sections ?? [];
  const warnings = [];
  const sectionInfo = [];

  // Cumulative section starts (with gaps)
  let cursor = 0;
  sections.forEach((section, idx) => {
    const length = typeof section.length === "number" ? section.length : 0;
    const gap = typeof section.gapToNext === "number" ? section.gapToNext : 0;
    const start = cursor;
    const end = start + length;
    const label = sectionLabel(section, idx);
    sectionInfo.push({
      index: idx,
      id: section.id ?? `SEC-${idx}`,
      name: section.name ?? "",
      label,
      type: section.type ?? null,
      length,
      gapToNext: gap,
      sectionStart: start,
      sectionEnd: end,
      axleCount: (section.axles ?? []).length,
      mass: section.mass ?? null,
      centerOfMass: section.centerOfMass ?? null,
      inertia: section.inertia ?? null,
      participatesInLoadGen: section.participatesInLoadGen !== false,
      dataSource: section.dataSource ?? "PENDING"
    });
    cursor = end + gap;

    if (typeof section.length !== "number") {
      warnings.push({ severity: "blocking", scope: `section:${idx}`, message: `${label} is missing a length.` });
    } else if (length < 0) {
      warnings.push({ severity: "blocking", scope: `section:${idx}`, message: `${label} has a negative length (${length}).` });
    }
    if (gap < 0) {
      warnings.push({ severity: "blocking", scope: `section:${idx}`, message: `${label} has a negative gap to the next section (${gap}).` });
    }
    if (section.mass == null) {
      warnings.push({ severity: "info", scope: `section:${idx}:mass`, message: `${label}: mass is not yet entered.` });
    }
    if (!section.inertia || (section.inertia.Ixx == null && section.inertia.Iyy == null && section.inertia.Izz == null)) {
      warnings.push({ severity: "info", scope: `section:${idx}:inertia`, message: `${label}: inertia values are not yet entered.` });
    }
    if (!section.centerOfMass || section.centerOfMass.z == null) {
      warnings.push({ severity: "info", scope: `section:${idx}:com`, message: `${label}: center of mass height is not yet entered.` });
    }
  });

  // Total length excluding the trailing gap of the last section.
  // Gaps to next only apply between sections.
  const sectionLengthSum = sectionInfo.reduce((s, si) => s + si.length, 0);
  const interSectionGapSum = sectionInfo.slice(0, -1).reduce((s, si) => s + (si.gapToNext || 0), 0);
  const totalTrainLength = sectionLengthSum + interSectionGapSum;

  // Axle assembly with global positions
  const axles = [];
  const seenAxleIds = new Set();
  sections.forEach((section, sIdx) => {
    const sStart = sectionInfo[sIdx].sectionStart;
    const sLength = sectionInfo[sIdx].length;
    const sLabel = sectionInfo[sIdx].label;
    (section.axles ?? []).forEach((axle, aIdx) => {
      const offset = typeof axle.offset === "number" ? axle.offset : 0;
      const globalPosition = sStart + offset;
      const id = axle.axleId ?? `A-${sIdx}-${aIdx}`;
      axles.push({
        sectionIndex: sIdx,
        axleIndex: aIdx,
        axleId: id,
        wheelPairId: axle.wheelPairId ?? null,
        offset,
        load: axle.load ?? null,
        gauge: axle.gauge ?? null,
        leftWheelId: axle.leftWheelId ?? null,
        rightWheelId: axle.rightWheelId ?? null,
        sectionId: section.id ?? `SEC-${sIdx}`,
        sectionLabel: sLabel,
        globalPosition
      });
      if (axle.axleId) {
        if (seenAxleIds.has(axle.axleId)) {
          warnings.push({ severity: "blocking", scope: `axle:${sIdx}:${aIdx}`, message: `Two axles share the same ID: "${axle.axleId}".` });
        }
        seenAxleIds.add(axle.axleId);
      }
      if (typeof axle.offset === "number" && (axle.offset < 0 || (sLength > 0 && axle.offset > sLength))) {
        warnings.push({
          severity: "blocking",
          scope: `axle:${sIdx}:${aIdx}`,
          message: `Axle "${id}" is positioned outside section length (offset ${offset}, section length ${sLength}).`
        });
      }
    });
  });

  // Wheel pairs (distinct wheelPairId values, falling back to axle pairing)
  const wheelPairIds = new Set(
    axles.filter((a) => a.wheelPairId).map((a) => a.wheelPairId)
  );
  const wheelPairCount = wheelPairIds.size > 0 ? wheelPairIds.size : Math.ceil(axles.length / 2);

  // First-to-last wheel distance
  const firstToLastWheelDistance = axles.length >= 2
    ? axles[axles.length - 1].globalPosition - axles[0].globalPosition
    : null;

  return {
    sectionCount: sections.length,
    sections: sectionInfo,
    axles,
    axleCount: axles.length,
    wheelPairCount,
    sectionLengthSum,
    interSectionGapSum,
    totalTrainLength,
    firstToLastWheelDistance,
    warnings
  };
}
