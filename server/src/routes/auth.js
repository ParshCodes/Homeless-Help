import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', (req, res) => {
  const { email, role = 'Volunteer' } = req.body;
  const token = jwt.sign(
    {
      user: { email },
      role,
      org: req.body.org || 'demo-org',
    },
    process.env.JWT_SECRET || 'safespot-secret',
    { expiresIn: '1h' }
  );
  res.json({ token, user: { email }, role });
});

export default router;
