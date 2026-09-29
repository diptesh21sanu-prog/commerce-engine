import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { queryOne } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'commerce-engine-super-secret-key-2026';

export interface AuthUser {
  id: string;
  email: string;
  role: 'customer' | 'seller' | 'admin';
  fullName: string;
  sellerId?: string;
  sellerStatus?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  sellerId?: string;
}

export function hashPassword(plain: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plain, salt);
}

export function comparePassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function generateToken(user: { id: string; email: string; role: string; fullName: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName,
    };

    if (decoded.role === 'seller') {
      const seller = queryOne<{ id: string; status: string }>(
        'SELECT id, status FROM seller_profiles WHERE user_id = ?',
        [decoded.id]
      );
      if (seller) {
        req.user.sellerId = seller.id;
        req.user.sellerStatus = seller.status;
        req.sellerId = seller.id;
      }
    }
  } catch (err) {
    // Invalid token, treat as guest
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function requireRole(allowedRoles: Array<'customer' | 'seller' | 'admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: role '${req.user.role}' not permitted` });
    }
    next();
  };
}

export function requireApprovedSeller(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Seller account required' });
  }
  if (!req.user.sellerId) {
    return res.status(403).json({ error: 'No seller profile associated with this account' });
  }
  if (req.user.sellerStatus !== 'approved') {
    return res.status(403).json({ 
      error: `Seller account is not approved (Current status: ${req.user.sellerStatus || 'pending'})` 
    });
  }
  req.sellerId = req.user.sellerId;
  next();
}
