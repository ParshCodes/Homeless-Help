import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'safespot-secret');
    req.user = payload.user;
    req.org = payload.org || 'demo-org';
    req.role = payload.role;
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  return next();
}
