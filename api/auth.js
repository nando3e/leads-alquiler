import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function login(username, password) {
  const superUser = process.env.SUPER_ADMIN_USERNAME;
  const superHash = process.env.SUPER_ADMIN_PASSWORD_HASH;
  const superPasswordPlain = process.env.SUPER_ADMIN_PASSWORD;

  if (superUser && username === superUser) {
    if (superHash) {
      const ok = await bcrypt.compare(password, superHash);
      if (ok) {
        return { id: 'super_admin', username: superUser, role: 'super_admin' };
      }
    } else if (superPasswordPlain && password === superPasswordPlain) {
      return { id: 'super_admin', username: superUser, role: 'super_admin' };
    }
  }

  const res = await query(
    'SELECT id, username, password_hash, role FROM users WHERE username = $1 AND active = true',
    [username]
  );
  const user = res.rows[0];
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  req.user = payload;
  next();
}
