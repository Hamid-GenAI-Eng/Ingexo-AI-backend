import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Service to register a new user in local auth database
 */
export const registerUser = async (fullName, email, password) => {
  // 1. Check if email is already taken
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email address is already in use', 400);
  }

  // 2. Create the user
  const newUser = await User.create({
    fullName,
    email,
    password,
    authProvider: 'local'
  });

  return newUser;
};

/**
 * Service to log in a user with local email & password
 */
export const loginUser = async (email, password) => {
  // 1. Find user and explicitly select password field
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || user.authProvider !== 'local') {
    throw new AppError('Invalid email or password', 401);
  }

  // 2. Verify password match
  const isMatch = await user.comparePassword(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  return user;
};

/**
 * Service to verify Google ID token and find/create OAuth user
 */
export const verifyGoogleIdToken = async (idToken) => {
  let payload;
  try {
    // 1. Verify Google token claims against client ID
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.error('Google ID token verification failed:', error.message);
    throw new AppError('Invalid Google credential token', 400);
  }

  const { sub: googleId, email, name: fullName, picture: avatar } = payload;

  if (!email) {
    throw new AppError('Google account does not provide a valid email address', 400);
  }

  // 2. Check if user already exists with googleId
  let user = await User.findOne({ googleId });

  if (user) {
    return user;
  }

  // 3. Fallback: Check if email exists but without googleId (previously registered via local auth)
  user = await User.findOne({ email });
  
  if (user) {
    // Gracefully upgrade/link local account to Google OAuth provider
    user.googleId = googleId;
    user.avatar = avatar || user.avatar;
    user.authProvider = 'google'; // convert/link
    await user.save();
    return user;
  }

  // 4. If new user, create a Google-linked account
  user = await User.create({
    fullName,
    email,
    googleId,
    avatar,
    authProvider: 'google',
    role: 'owner' // default role for first time signups
  });

  return user;
};
