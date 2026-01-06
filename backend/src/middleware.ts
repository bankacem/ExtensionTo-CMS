import { createMiddleware } from 'hono/factory'

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || authHeader !== `Bearer ${c.env.BEARER_TOKEN}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})
