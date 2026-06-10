/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[api/src/routes/appointments.js, api/src/routes/partners.js, api/src/routes/payments.js — zod body validation]
 * @crossref:uses[product-map/domains/settings-system.yaml]
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.issues });
  next();
};
module.exports = { validate };
