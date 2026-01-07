import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware as apiAuthMiddleware } from './auth'; // Renamed to avoid conflict
import posts from './posts';
import extensions from './extensions';
import users from './users';
import seo from './seo';
import admin from './admin'; // Import the new admin module

/**
 * Type-safe bindings for Hono's context.
 */
export type Bindings = {
  ADMIN_TOKEN: string;
  ADMIN_PASSWORD: string;
  VERCEL_STORAGE: R2Bucket;
  DB_1: D1Database;
  DB_2: D1Database;
  DB_3: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// --- NEW Admin Dashboard ---
app.route('/admin-new', admin);

// --- API Routes ---

// Global CORS middleware for API
app.use('/api/*', cors({
  origin: 'https://extensionto.com',
  allowHeaders: ['Authorization', 'X-Username', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// RFC 9457-compliant error handler
app.onError((err, c) => {
  console.error(`Unhandled error: ${err.message}`);
  return c.json({
    type: 'https://example.com/probs/internal-server-error',
    title: 'Internal Server Error',
    detail: err.message,
    status: 500,
  }, 500);
});

// --- DIAGNOSTIC ROUTE ---
app.get('/api/debug-env', (c) => {
  const envKeys = Object.keys(c.env);
  const bindings: Record<string, string> = {};

  for (const key of envKeys) {
    const value = c.env[key];
    if (typeof value === 'string') bindings[key] = 'Secret (string)';
    else if (typeof value === 'object' && value !== null) {
      if ('id' in value) bindings[key] = 'D1 Database';
      else if ('get' in value) bindings[key] = 'R2 Bucket / KV Namespace';
      else bindings[key] = 'Other Object/Service';
    } else {
      bindings[key] = 'Unknown Type';
    }
  }

  return c.json({
    message: 'Live Environment Bindings Check',
    availableBindings: bindings,
    expectedBindings: [
      'ADMIN_TOKEN',
      'ADMIN_PASSWORD',
      'VERCEL_STORAGE',
      'DB_1', 'DB_2', 'DB_3'
    ]
  });
});

// Original API routes
app.route('/', seo);

// Apply auth middleware to all subsequent /api routes
app.use('/api/*', apiAuthMiddleware);
app.route('/api/posts', posts);
app.route('/api/extensions', extensions);
app.route('/api/users', users);

// Protected route for streaming large JSON files
app.get('/api/data', async (c) => {
  try {
    const object = await c.env.VERCEL_STORAGE.get('large-data.json');
    if (object === null) {
      return c.json({
        type: 'https://example.com/probs/not-found',
        title: 'Not Found',
        detail: 'The requested data file was not found in Vercel Storage.',
        status: 404,
      }, 404);
    }
    c.header('Content-Type', 'application/json');
    return c.stream(async (stream) => {
      await stream.pipe(object.body);
    });
  } catch (err) {
    const error = err as Error;
    return c.json({
      type: 'https://example.com/probs/storage-error',
      title: 'Storage Error',
      detail: `Failed to fetch from Vercel Storage: ${error.message}`,
      status: 500,
    }, 500);
  }
});

export default app;
