export function generateTrainPositions({ positionProfileId, trainId, referenceLineType, stepLength, startStation, endStation, repeatLength }) {
  const step = Math.max(0.001, Number(stepLength) || 5);
  const start = Number(startStation) || 0;
  const end = Number(endStation) || 0;
  const repeat = Number(repeatLength) || 0;

  const positions = [];
  // Float-safe iteration: accumulate as integer multiples of step then scale back
  let i = 0;
  while (true) {
    const station = Math.round((start + i * step) * 1e6) / 1e6;
    if (station > end + 1e-9) break;
    const idNum = String(Math.round(station)).padStart(3, "0");
    positions.push({
      positionId: `P-${idNum}`,
      headStation: station,
      tailStation: Math.round((station - repeat) * 1e6) / 1e6
    });
    i++;
  }

  return {
    positionProfileId: positionProfileId || "TP-001",
    trainId: trainId || "TRN-001",
    referenceLineType: referenceLineType || "TRACK_CENTERLINE",
    stepLength: step,
    startStation: start,
    endStation: end,
    repeatLength: repeat,
    positions
  };
}
