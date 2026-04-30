function validateByRule(rule, value, fieldPath) {
  const errors = [];

  if (rule.type === "string") {
    if (typeof value !== "string") return [`${fieldPath}: must be type string`];
    if (typeof rule.minLength === "number" && value.length < rule.minLength) {
      errors.push(`${fieldPath}: must be at least ${rule.minLength} characters`);
    }
  }

  if (rule.type === "number" && typeof value !== "number") {
    return [`${fieldPath}: must be type number`];
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
      }
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
