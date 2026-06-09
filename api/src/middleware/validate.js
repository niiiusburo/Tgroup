/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[NK3 API middleware: api/src/middleware/validate]
 * @crossref:uses[product-map/domains/settings-system.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.issues });
  next();
};
module.exports = { validate };
