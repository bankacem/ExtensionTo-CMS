import { createMiddleware } from 'hono/factory';
import { Bindings } from './index'; // Assuming Bindings are defined in index.ts

/**
 * Middleware for authenticating requests.
 * It checks for a valid admin token and a case-insensitive username match.
 */
export const authMiddleware = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const username = c.req.header('X-Username');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      type: 'https://example.com/probs/unauthorized',
      title: 'Unauthorized',
      detail: 'Authorization header is missing or malformed.',
      status: 401,
    }, 401);
  }

  if (!username) {
    return c.json({
      type: 'https://example.com/probs/unauthorized',
      title: 'Unauthorized',
      detail: 'X-Username header is missing.',
      status: 401,
    }, 401);
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Using Intl.Collator for case-insensitive, locale-aware string comparison
  const collator = new Intl.Collator(undefined, { sensitivity: 'accent' });
  const isUsernameMatch = collator.compare(username, 'BANKACEM') === 0;

  if (!isUsernameMatch) {
    return c.json({
      type: 'https://example.com/probs/unauthorized',
      title: 'Unauthorized',
      detail: 'Invalid username provided.',
      status: 401,
    }, 401);
  }

  const isAdmin = token === c.env.ADMIN_TOKEN;

  if (!isAdmin) {
    return c.json({
      type: 'https://example.com/probs/unauthorized',
      title: 'Unauthorized',
      detail: 'Invalid admin token.',
      status: 401,
    }, 401);
  }

  await next();
});
