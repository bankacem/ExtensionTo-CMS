import { Hono } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { Bindings } from './index';

const admin = new Hono<{ Bindings: Bindings }>();

// --- HTML Templates ---

const loginPage = `
<!DOCTYPE html>
<html>
<head>
  <title>Admin Login</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; background-color: #121212; color: #E0E0E0; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    .container { background-color: #1E1E1E; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); width: 300px; }
    h1 { text-align: center; color: #BB86FC; }
    input { width: 100%; padding: 0.8rem; margin-bottom: 1rem; border: 1px solid #333; background-color: #2C2C2C; color: #E0E0E0; border-radius: 4px; box-sizing: border-box; }
    button { width: 100%; padding: 0.8rem; background-color: #6200EE; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
    button:hover { background-color: #3700B3; }
    .error { color: #CF6679; text-align: center; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Admin Login</h1>
    <form method="POST" action="/admin-new/login">
      <input type="text" name="username" placeholder="Username" required>
      <input type="password" name="password" placeholder="Password" required>
      <button type="submit">Login</button>
    </form>
  </div>
</body>
</html>
`;

const dashboardPage = `
<!DOCTYPE html>
<html>
<head>
  <title>Admin Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; background-color: #121212; color: #E0E0E0; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    .container { text-align: center; }
    h1 { color: #03DAC6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome Admin</h1>
    <p>500K Articles Ready</p>
  </div>
</body>
</html>
`;

// --- Authentication Middleware ---

const authMiddleware = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const adminCookie = getCookie(c, 'admin');
  if (adminCookie === '1') {
    await next();
  } else {
    return c.redirect('/admin-new');
  }
});

// --- Routes ---

// GET / -> Show login form
admin.get('/', (c) => {
  return c.html(loginPage);
});

// POST /login -> Handle login
admin.post('/login', async (c) => {
  const { username, password } = await c.req.parseBody();

  const collator = new Intl.Collator(undefined, { sensitivity: 'accent' });
  const isUsernameMatch = typeof username === 'string' && collator.compare(username, 'BANKACEM') === 0;
  const isPasswordMatch = typeof password === 'string' && password === c.env.ADMIN_PASSWORD;

  if (isUsernameMatch && isPasswordMatch) {
    setCookie(c, 'admin', '1', {
      path: '/admin-new',
      secure: true,
      httpOnly: true,
      sameSite: 'Strict',
      maxAge: 86400, // 24 hours
    });
    return c.redirect('/admin-new/dashboard');
  } else {
    return c.html(loginPage + '<p class="error">Invalid credentials</p>', 401);
  }
});

// GET /dashboard -> Show protected dashboard
admin.get('/dashboard', authMiddleware, (c) => {
  return c.html(dashboardPage);
});

export default admin;
