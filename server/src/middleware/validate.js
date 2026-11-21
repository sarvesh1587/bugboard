const ApiError = require('../utils/ApiError');

/**
 * Validates req.body / req.query / req.params against zod schemas.
 * Parsed (coerced + stripped) values replace the originals:
 *   body   → req.body
 *   query  → req.validatedQuery (Express 5 makes req.query read-only)
 *   params → req.params
 */
const validate = (schemas) => (req, _res, next) => {
  const errors = [];

  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        errors.push({ field: [part, ...issue.path].join('.'), message: issue.message });
      });
    } else if (part === 'query') {
      req.validatedQuery = result.data;
    } else {
      req[part] = result.data;
    }
  }

  if (errors.length) throw ApiError.badRequest('Validation failed', errors);
  next();
};

module.exports = validate;
