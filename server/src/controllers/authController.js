import { Author } from '../models/index.js';
import { comparePassword, hashPassword } from '../utils/passwordService.js';
import { generateToken } from '../utils/tokenService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { COOKIE_OPTIONS } from '../constants.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { config } from '../config/index.js';

export async function register(req, res) {
  const { name, email, password, role, adminKey } = req.bodyValidated;

  const existing = await Author.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json(errorResponse('An account with this email already exists', null, 409));
  }

  if (role === 'admin') {
    const expectedKey = config.adminRegistrationKey;
    if (expectedKey && adminKey !== expectedKey) {
      return res.status(403).json(errorResponse('Invalid admin registration key', null, 403));
    }
  }

  const user = await Author.create({
    sourceAuthorId: `USER${Date.now()}`,
    name,
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    role,
    isActive: true,
  });

  const token = generateToken({ userId: user._id.toString(), role: user.role });
  res.cookie('token', token, COOKIE_OPTIONS);

  return res.status(201).json(successResponse({
    id: user._id.toString(),
    sourceAuthorId: user.sourceAuthorId,
    name: user.name,
    email: user.email,
    role: user.role,
  }, 'Registration successful'));
}

export async function login(req, res) {
  const { email, password } = req.bodyValidated;
  const user = await Author.findOne({ email: email.toLowerCase() });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json(errorResponse('Invalid email or password', null, 401));
  }
  if (!user.isActive) {
    return res.status(403).json(errorResponse('Account is inactive', null, 403));
  }

  const token = generateToken({ userId: user._id.toString(), role: user.role });
  res.cookie('token', token, COOKIE_OPTIONS);

  return res.json(successResponse({
    id: user._id.toString(),
    sourceAuthorId: user.sourceAuthorId,
    name: user.name,
    email: user.email,
    role: user.role,
  }, 'Login successful'));
}

export async function logout(req, res) {
  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
  return res.json(successResponse(null, 'Logout successful'));
}

export async function me(req, res) {
  const user = await Author.findById(req.userId).select('-passwordHash');
  if (!user) {
    return res.status(401).json(errorResponse('User not found', null, 401));
  }
  return res.json(successResponse(user.toPublicJSON(), 'Current user'));
}

export { loginLimiter };
