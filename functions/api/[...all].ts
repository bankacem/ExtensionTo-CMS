import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Types for Cloudflare D1
interface D1Result<T = any> {
  results: T[];
  success: boolean;
}
interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  all<T = any>(): Promise<D1Result<T>>;
  run<T = any>(): Promise<D1Result<T>>;
  first<T = any>(): Promise<T | null>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

type Bindings = {
  DB_1: D1Database;
  DB_2: D1Database;
  DB_3: D1Database;
  ADMIN_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const allowedOrigins = [
  'https://www.extensionto.com',
  'https://extensionto.com',
  'http://localhost:3000', // Vite dev server
  'http://localhost:8787', // Wrangler dev server
  'http://localhost:8788', // Wrangler pages dev server
  'http://127.0.0.1:8788', // Alternative for localhost
];

app.use('*', cors({
  origin: (origin) => {
    // Allow Vercel preview domains
    if (origin.endsWith('.vercel.app')) {
      return origin;
    }
    return allowedOrigins.includes(origin) ? origin : undefined;
  },
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  maxAge: 600,
}));

// --- SHARDING LOGIC ---
const simpleHash = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

const getDBs = (c: any): D1Database[] => [c.env.DB_1, c.env.DB_2, c.env.DB_3];

const getDBForSlug = (c: any, slug: string): D1Database => {
  const dbs = getDBs(c);
  const hash = simpleHash(slug);
  const index = hash % dbs.length;
  return dbs[index];
};
// --- END SHARDING LOGIC ---

async function applyInternalLinking(content: string, dbs: D1Database[], currentId: string) {
    const query = "SELECT title, slug FROM articles WHERE status = 'published' AND id != ? LIMIT 50";
    const resultsPromises = dbs.map(db => db.prepare(query).bind(currentId).all());
    const allResults = await Promise.all(resultsPromises);
    const articles = allResults.flatMap(res => res.results);

    let linkedContent = content;
    articles.forEach((article: any) => {
        const titleRegex = new RegExp(`\\b(${article.title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})\\b`, 'gi');
        if (!content.includes(`href="/post/${article.slug}"`)) {
          linkedContent = linkedContent.replace(titleRegex, `<a href="/post/${article.slug}" class="internal-link text-indigo-600 hover:underline font-bold">$1</a>`);
        }
    });
    return linkedContent;
}

// SEO: Sitemap (Served at /api/sitemap.xml)
app.get('/sitemap.xml', async (c) => {
    const dbs = getDBs(c);
    const query = "SELECT slug, updated_at FROM articles WHERE status = 'published'";
    const resultsPromises = dbs.map(db => db.prepare(query).all());
    const allResults = await Promise.all(resultsPromises);
    const allArticles = allResults.flatMap(res => res.results);
    
    const urls = allArticles.map((r: any) => `<url><loc>https://www.extensionto.com/post/${r.slug}</loc><lastmod>${(r.updated_at as string).split(' ')[0]}</lastmod></url>`).join('');
    return c.text(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, 200, { 'Content-Type': 'application/xml' });
});

// SEO: Robots.txt (Served at /api/robots.txt)
app.get('/robots.txt', (c) => {
    return c.text("User-agent: *\nAllow: /\nSitemap: https://www.extensionto.com/sitemap.xml");
});

// PUBLIC: Fetch articles
app.get('/posts', async (c) => {
    const dbs = getDBs(c);
    const query = "SELECT id, title, slug, excerpt, image, category, published_at as publishDate FROM articles WHERE status = 'published' AND published_at <= CURRENT_TIMESTAMP";
    
    const resultsPromises = dbs.map(db => db.prepare(query).all());
    const allResults = await Promise.all(resultsPromises);
    const allPosts = allResults.flatMap(res => res.results);

    allPosts.sort((a: any, b: any) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
    
    return c.json(allPosts);
});

// PUBLIC: Single post with auto-linking
app.get('/posts/:slug', async (c) => {
    const slug = c.req.param('slug');
    const db = getDBForSlug(c, slug); // Direct to correct shard
    const article: any = await db.prepare("SELECT * FROM articles WHERE slug = ?").bind(slug).first();
    if (!article) return c.json({ error: "Not Found" }, 404);
    
    article.content = await applyInternalLinking(article.content, getDBs(c), article.id);
    article.publishDate = article.published_at; // Map for frontend
    return c.json(article);
});

// ADMIN: Secure routes
app.use('/admin/*', async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (token !== c.env.ADMIN_TOKEN) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
});

app.get('/admin/posts', async (c) => {
    try {
        const dbs = getDBs(c);
        const query = "SELECT *, published_at as publishDate FROM articles";
        const resultsPromises = dbs.map(db => db.prepare(query).all());
        const allResults = await Promise.all(resultsPromises);
        const allPosts = allResults.flatMap(res => res.results);

        allPosts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return c.json(allPosts);
    } catch (e: any) {
        return c.json({ error: 'Failed to fetch posts', details: e.message }, 500);
    }
});

app.post('/admin/posts', async (c) => {
    try {
        const body = await c.req.json();
        const { id, title, content, slug, excerpt, image, category, status, publishDate } = body;

        if (!title || !slug) {
            return c.json({ error: 'Title and slug are required' }, 400);
        }

        const db = getDBForSlug(c, slug);
        const published_at = publishDate || new Date().toISOString();

        await db.prepare(
            "INSERT INTO articles (id, title, content, slug, excerpt, image, category, status, published_at) VALUES (?,?,?,?,?,?,?,?,?)"
        ).bind(id || crypto.randomUUID(), title, content, slug, excerpt, image, category, status, published_at).run();

        return c.json({ success: true }, 201);
    } catch (e: any) {
        // Check for unique constraint violation
        if (e.message?.includes('UNIQUE constraint failed')) {
            return c.json({ error: 'A post with this slug already exists.' }, 409);
        }
        return c.json({ error: 'Failed to create post', details: e.message }, 500);
    }
});

app.put('/admin/posts/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { title, content, slug, excerpt, image, category, status, publishDate } = body;

        if (!title || !slug) {
            return c.json({ error: 'Title and slug are required' }, 400);
        }

        const db = getDBForSlug(c, slug);

        await db.prepare(
            "UPDATE articles SET title=?, content=?, slug=?, excerpt=?, image=?, category=?, status=?, published_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).bind(title, content, slug, excerpt, image, category, status, publishDate, id).run();

        return c.json({ success: true });
    } catch (e: any) {
        if (e.message?.includes('UNIQUE constraint failed')) {
            return c.json({ error: 'A post with this slug already exists.' }, 409);
        }
        return c.json({ error: 'Failed to update post', details: e.message }, 500);
    }
});

// This is the standard export for Cloudflare Pages Functions.
export const onRequest = app.fetch;