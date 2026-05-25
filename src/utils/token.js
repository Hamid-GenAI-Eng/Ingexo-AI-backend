import jwt from 'jsonwebtoken';

/**
 * Sign JWT Token
 * @param {string} userId - Mongo ID of the user
 * @returns {string} Signed JWT
 */
export const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

/**
 * Send Token via HttpOnly Cookie and return user data in response body
 * Handles standard compliance with secure cookie guidelines
 */
export const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Set secure cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000 // default 7 days matched to expires_in
    ),
    httpOnly: true, // Prevents XSS attacks from reading the cookie
    secure: process.env.NODE_ENV === 'production', // Encrypts transmission over HTTPS
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Cross-site request control
  };

  // Attach token cookie to response
  res.cookie('token', token, cookieOptions);

  // Remove password from output just in case
  user.password = undefined;

  // Send uniform JSON payload response
  res.status(statusCode).json({
    status: 'success',
    token, // Return token inside body as well (flexible for SPAs/mobile clients)
    data: {
      user
    }
  });
};
