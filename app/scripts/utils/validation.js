export function validateAgainstSchema(schema, candidate) {
  const errors = [];

  if (!schema || schema.type !== "object") {
    return { valid: false, errors: ["Schema is missing or unsupported."] };
  }

  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { valid: false, errors: ["Value must be an object."] };
  }

  const required = Array.isArray(schema.required) ? schema.required : [];
  const properties = schema.properties ?? {};
  const allowAdditional = schema.additionalProperties !== false;

  required.forEach((field) => {
    if (!(field in candidate)) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  Object.entries(candidate).forEach(([key, value]) => {
    const rule = properties[key];

    if (!rule) {
      if (!allowAdditional) {
        errors.push(`Unexpected field: ${key}`);
      }
      return;
    }

    if (rule.type && typeof value !== rule.type) {
      errors.push(`Field ${key} must be type ${rule.type}`);
    }
  });

  return { valid: errors.length === 0, errors };
}
