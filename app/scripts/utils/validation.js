function matchesPrimitiveType(type, value) {
  if (type === "null") return value === null;
  if (type === "string") return typeof value === "string";
  if (type === "number") return typeof value === "number";
  if (type === "integer") return Number.isInteger(value);
  if (type === "boolean") return typeof value === "boolean";
  return false;
}

function validateByRule(rule, value, fieldPath) {
  const errors = [];

  if (Array.isArray(rule.type)) {
    const ok = rule.type.some((t) => matchesPrimitiveType(t, value));
    if (!ok) return [`${fieldPath}: must be one of types [${rule.type.join(", ")}]`];
    if (Array.isArray(rule.enum) && !rule.enum.includes(value)) {
      errors.push(`${fieldPath}: must be one of [${rule.enum.join(", ")}]`);
    }
    return errors;
  }

  if (rule.type === "string") {
    if (typeof value !== "string") return [`${fieldPath}: must be type string`];
    if (typeof rule.minLength === "number" && value.length < rule.minLength) {
      errors.push(`${fieldPath}: must be at least ${rule.minLength} characters`);
    }
  }

  if (rule.type === "number" && typeof value !== "number") {
    return [`${fieldPath}: must be type number`];
  }

  if (rule.type === "integer") {
    if (!Number.isInteger(value)) return [`${fieldPath}: must be type integer`];
    if (typeof rule.minimum === "number" && value < rule.minimum) {
      errors.push(`${fieldPath}: must be >= ${rule.minimum}`);
    }
  }

  if (rule.type === "boolean" && typeof value !== "boolean") {
    return [`${fieldPath}: must be type boolean`];
  }

  if (Array.isArray(rule.enum) && !rule.enum.includes(value)) {
    errors.push(`${fieldPath}: must be one of [${rule.enum.join(", ")}]`);
  }

  return errors;
}

function validateObject(schema, candidate, pathPrefix = "") {
  if (!schema || schema.type !== "object") return ["Schema is missing or unsupported."];
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return [`${pathPrefix || "value"} must be an object.`];

  const errors = [];
  const required = Array.isArray(schema.required) ? schema.required : [];
  const properties = schema.properties ?? {};
  const allowAdditional = schema.additionalProperties !== false;

  required.forEach((field) => {
    if (!(field in candidate)) errors.push(`${pathPrefix}${field}: missing required field`);
  });

  Object.entries(candidate).forEach(([key, value]) => {
    const rule = properties[key];
    const fieldPath = `${pathPrefix}${key}`;

    if (!rule) {
      if (!allowAdditional) errors.push(`${fieldPath}: unexpected field`);
      return;
    }

    if (rule.type === "array") {
      if (!Array.isArray(value)) {
        errors.push(`${fieldPath}: must be type array`);
        return;
      }
      if (typeof rule.minItems === "number" && value.length < rule.minItems) {
        errors.push(`${fieldPath}: must contain at least ${rule.minItems} items`);
      }
      if (rule.items?.type === "object") {
        value.forEach((item, index) => errors.push(...validateObject(rule.items, item, `${fieldPath}[${index}].`)));
      } else if (rule.items) {
        value.forEach((item, index) => errors.push(...validateByRule(rule.items, item, `${fieldPath}[${index}]`)));
      }
      return;
    }

    if (rule.type === "object") {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        errors.push(`${fieldPath}: must be type object`);
        return;
      }
      errors.push(...validateObject(rule, value, `${fieldPath}.`));
      return;
    }

    errors.push(...validateByRule(rule, value, fieldPath));
  });

  return errors;
}

export function validateAgainstSchema(schema, candidate) {
  const errors = validateObject(schema, candidate);
  return { valid: errors.length === 0, errors };
}

export function validateRequiredLoadFamilies(loadFamilies, requiredFamilyIds = []) {
  const selected = new Set((loadFamilies?.families ?? []).map((f) => f.familyId));
  const missing = requiredFamilyIds.filter((id) => !selected.has(id));

  if (!requiredFamilyIds.length) {
    return { valid: false, errors: ["No required load-family IDs configured."] };
  }

  return {
    valid: missing.length === 0,
    errors: missing.map((id) => `Missing required load family: ${id}`)
  };
}

export function validateGroupedCaseReadiness({ train, geometry, trainPositions }) {
  const blockingIssues = [];
  const warnings = [];

  if (!train || !geometry || !trainPositions) {
    if (!train) blockingIssues.push("Train data is required for grouped-case readiness.");
    if (!geometry) blockingIssues.push("Geometry data is required for grouped-case readiness.");
    if (!trainPositions) blockingIssues.push("Train-position profile is required for grouped-case readiness.");
    return { valid: false, blockingIssues, warnings };
  }

  const totalTrainLength = (train.sections ?? []).reduce((sum, section) => sum + (section.length ?? 0), 0);
  if (typeof trainPositions.repeatLength === "number" && totalTrainLength > 0 && trainPositions.repeatLength !== totalTrainLength) {
    warnings.push(`repeatLength (${trainPositions.repeatLength}) differs from summed train section length (${totalTrainLength}).`);
  }

  const stations = (geometry.stations ?? []).map((s) => s.station);
  if (!stations.length) {
    blockingIssues.push("Geometry stations are required to validate train-position coverage.");
  } else {
    const minStation = Math.min(...stations);
    const maxStation = Math.max(...stations);

    (trainPositions.positions ?? []).forEach((position, index) => {
      if (position.headStation < minStation || position.headStation > maxStation) {
        blockingIssues.push(`positions[${index}].headStation (${position.headStation}) is outside geometry coverage [${minStation}, ${maxStation}].`);
      }
    });

    if (typeof trainPositions.startStation === "number" && (trainPositions.startStation < minStation || trainPositions.startStation > maxStation)) {
      blockingIssues.push(`startStation (${trainPositions.startStation}) is outside geometry coverage [${minStation}, ${maxStation}].`);
    }

    if (typeof trainPositions.endStation === "number" && (trainPositions.endStation < minStation || trainPositions.endStation > maxStation)) {
      blockingIssues.push(`endStation (${trainPositions.endStation}) is outside geometry coverage [${minStation}, ${maxStation}].`);
    }
  }

  return { valid: blockingIssues.length === 0, blockingIssues, warnings };
}
