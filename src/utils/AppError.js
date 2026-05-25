/**
 * Custom Operational Error Class
 * Used to throw formatted and controlled HTTP errors throughout the application
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // Flag to mark operational errors (vs structural/system programmatic bugs)
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
