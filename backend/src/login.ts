import { Hono } from 'hono';
import { Bindings } from './index';

const login = new Hono<{ Bindings: Bindings }>();

login.post('/', async (c) => {
  const { username, password } = await c.req.json();

  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400);
  }

  // Using Intl.Collator for case-insensitive, locale-aware string comparison
  const collator = new Intl.Collator(undefined, { sensitivity: 'accent' });
  const isUsernameMatch = collator.compare(username, 'BANKACEM') === 0;

  // Securely compare the provided password with the secret
  const isPasswordMatch = password === c.env.ADMIN_PASSWORD;

  if (isUsernameMatch && isPasswordMatch) {
    // On successful login, return the session token
    return c.json({ token: c.env.ADMIN_TOKEN });
  }

  return c.json({ error: 'Invalid credentials' }, 401);
});

export default login;
