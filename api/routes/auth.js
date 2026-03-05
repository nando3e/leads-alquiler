import { login, createToken } from '../auth.js';

export async function postLogin(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    const user = await login(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const token = createToken({ id: user.id, username: user.username, role: user.role });
    return res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('postLogin', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
