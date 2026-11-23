export function notFound(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || (error.name === 'ZodError' ? 400 : 500);
  const code = error.code || (status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');
  const message = status === 500 ? 'An unexpected error occurred.' : error.message;
  if (status >= 500) {
    console.error('API request failed', {
      method: req.method,
      route: req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : 'unmatched',
      errorName: error.name,
      errorCode: error.code || null
    });
  }
  res.status(status).json({ success: false, error: { code, message } });
}
