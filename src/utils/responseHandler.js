/**
 * Standard Success Response Formatter
 * Keep payloads consistent: { status: 'success', results: N, data: { ... } }
 */
export const sendSuccess = (res, statusCode, data = {}, message = null) => {
  const payload = {
    status: 'success'
  };

  if (message) {
    payload.message = message;
  }

  payload.data = data;

  return res.status(statusCode).json(payload);
};
