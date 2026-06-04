import AppError from '../utils/AppError.js';

// Send details on development environment
const sendErrorDev = (err, res) => {
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err
  });
};

// Send masked message in production environment
const sendErrorProd = (err, res) => {
  // Operational errors: trusted exceptions (e.g. invalid password, validation fails)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
  
  // Programmatic/Unknown developer errors: hide details from client
  console.error('🔥 CRITICAL ERROR:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong on our end. Please try again later.'
  });
};

// Formatter for specific Mongoose Database validation/indexing issues
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateKeyDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate value: ${value}. Please use a different value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Your login token has expired. Please log in again.', 401);
};

// Global Express Error Middleware
export default (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Temporarily expose full error details to diagnose Vercel connection issues
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err
  });
};
