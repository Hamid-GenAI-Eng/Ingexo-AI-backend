import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

/**
 * Global Authorization Guard
 * Secures private API routes, verifying JSON Web Tokens
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Extract token from HttpOnly cookies or Bearer Authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to gain access.', 401));
    }

    // 2. Verify token integrity
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Check if user still exists in database
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 4. Grant access and mount user model to request context
    req.user = currentUser;
    next();
  } catch (error) {
    next(error); // Pushes jwt.verify or MongoDB lookup errors to global handler
  }
};

/**
 * Role-Based Access Control (RBAC) Guard
 * Restricts route access to specific roles (e.g. ['owner', 'editor'])
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};
