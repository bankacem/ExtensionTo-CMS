import { Hono } from 'hono'
import { getDbForSlug } from './utils'
import { BlogPost } from './types'
import { authMiddleware } from './middleware'

const posts = new Hono()

posts.get('/', async (c) => {
  const dbs = [c.env.DB_1, c.env.DB_2, c.env.DB_3]
  const promises = dbs.map(db => db.prepare('SELECT * FROM posts').all())
  const results = await Promise.all(promises)
  const posts = results.flatMap(result => result.results)
  return c.json(posts)
})

posts.use('/*', authMiddleware)

import { autolink } from './autolinking'

posts.post('/', async (c) => {
    const post = await c.req.json<BlogPost>()
    const slug = post.title.toLowerCase().replace(/ /g, '-')
    const dbName = getDbForSlug(slug)
    const db = c.env[dbName] as D1Database
    const dbs = [c.env.DB_1, c.env.DB_2, c.env.DB_3]
    post.content = await autolink(post.content, dbs)
    await db.prepare('INSERT INTO posts (id, title, excerpt, content, category, tags, date, publishDate, readTime, image, status, featured, seoTitle, seoDesc, seoKeywords, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(post.id, post.title, post.excerpt, post.content, post.category, post.tags, post.date, post.publishDate, post.readTime, post.image, post.status, post.featured, post.seoTitle, post.seoDesc, post.seoKeywords, post.views || 0)
      .run()
    return c.json(post)
})

posts.put('/:id', async (c) => {
    const id = c.req.param('id')
    const post = await c.req.json<BlogPost>()
    const slug = post.title.toLowerCase().replace(/ /g, '-')
    const dbName = getDbForSlug(slug)
    const db = c.env[dbName] as D1Database
    const dbs = [c.env.DB_1, c.env.DB_2, c.env.DB_3]
    post.content = await autolink(post.content, dbs)
    await db.prepare('UPDATE posts SET title = ?, excerpt = ?, content = ?, category = ?, tags = ?, date = ?, publishDate = ?, readTime = ?, image = ?, status = ?, featured = ?, seoTitle = ?, seoDesc = ?, seoKeywords = ?, views = ? WHERE id = ?')
      .bind(post.title, post.excerpt, post.content, post.category, post.tags, post.date, post.publishDate, post.readTime, post.image, post.status, post.featured, post.seoTitle, post.seoDesc, post.seoKeywords, post.views || 0, id)
      .run()
    return c.json(post)
})

posts.delete('/:id', async (c) => {
    const id = c.req.param('id')
    // Since we don't know the slug, we have to try deleting from all dbs
    const dbs = [c.env.DB_1, c.env.DB_2, c.env.DB_3]
    const promises = dbs.map(db => db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run())
    await Promise.all(promises)
    return c.json({ message: 'Post deleted' })
})

export default posts
