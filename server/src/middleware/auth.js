import { verifyToken } from '../utils/tokenService.js';
import { Author } from '../models/index.js';
import { errorResponse } from '../utils/apiResponse.js';

export function authenticate(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json(errorResponse('Authentication required', null, 401));
  }
  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json(errorResponse('Invalid or expired token', null, 401));
  }
}

export async function loadUser(req, res, next) {
  try {
    const user = await Author.findById(req.userId).select('-passwordHash');
    if (!user || !user.isActive) {
      return res.status(401).json(errorResponse('User not found or inactive', null, 401));
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json(errorResponse('Admin access required', null, 403));
  }
  next();
}

export async function requireAdminUser(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json(errorResponse('Admin access required', null, 403));
  }
  next();
}
