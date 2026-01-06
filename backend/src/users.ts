import { Hono } from 'hono'

const users = new Hono()

const DEFAULT_USERS = [
    {
      id: 'user_bankacem',
      username: 'BANKACEM',
      email: 'contact@bankacem.com',
      role: 'admin',
      createdAt: '2025-01-01T00:00:00Z',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BANKACEM'
    }
  ];

users.post('/login', async (c) => {
    const { username, password } = await c.req.json()
    const user = DEFAULT_USERS.find(u => u.username === username && password === c.env.USER_PASSWORD)
    if (user) {
        return c.json({ token: c.env.BEARER_TOKEN })
    }
    return c.json({ error: 'Invalid credentials' }, 401)
})

export default users
