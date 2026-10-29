export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    req[source === 'query' ? 'queryValidated' : 'bodyValidated'] = result.data;
    next();
  };
}
