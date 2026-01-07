import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './auth';
import posts from './posts';
import extensions from './extensions';
import users from './users';
import seo from './seo';
import login from './login';

/**
 * Type-safe bindings for Hono's context.
 * This ensures that c.env has the correct types for your secrets and bindings.
 */
export type Bindings = {
  ADMIN_TOKEN: string;
  ADMIN_PASSWORD: string; // Added for the login endpoint
  VERCEL_STORAGE: R2Bucket; // Assuming you've named your Vercel Blob Storage binding 'VERCEL_STORAGE'
  DB_1: D1Database;
  DB_2: D1Database;
  DB_3: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Global CORS middleware to handle pre-flight OPTIONS requests
app.use('*', cors({
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

// Public login route - does not use authMiddleware
app.route('/api/login', login);

// Re-integrate the original API routes - assuming these should be protected
app.route('/', seo); // SEO routes are typically public
app.use('/api/*', authMiddleware); // Apply auth middleware to all /api routes except login
app.route('/api/posts', posts);
app.route('/api/extensions', extensions);
app.route('/api/users', users);


// Protected route to demonstrate streaming large JSON files from Vercel Blob Storage
app.get('/api/data', async (c) => {
  try {
    // Replace 'large-data.json' with the actual key/name of your file in Vercel Storage
    const object = await c.env.VERCEL_STORAGE.get('large-data.json');

    if (object === null) {
      return c.json({
        type: 'https://example.com/probs/not-found',
        title: 'Not Found',
        detail: 'The requested data file was not found in Vercel Storage.',
        status: 404,
      }, 404);
    }

    // Stream the response directly from Vercel Storage to the client
    c.header('Content-Type', 'application/json');
    return c.stream(async (stream) => {
      await stream.pipe(object.body);
    });

  } catch (err) {
    const error = err as Error;
    return c.json({
      type: 'https://example.com/probs/storage-error',
      title: 'Storage Error',
      detail: `Failed to fetch data from Vercel Storage: ${error.message}`,
      status: 500,
    }, 500);
  }
});


export default app;
