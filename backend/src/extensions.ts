import { Hono } from 'hono'
import { Extension } from './types'
import { authMiddleware } from './middleware'

const extensions = new Hono()

extensions.get('/', async (c) => {
  const db = c.env.DB_1 as D1Database
  const { results } = await db.prepare('SELECT * FROM extensions').all()
  return c.json(results)
})

extensions.use('/*', authMiddleware)

extensions.post('/', async (c) => {
    const extension = await c.req.json<Extension>()
    const db = c.env.DB_1 as D1Database
    await db.prepare('INSERT INTO extensions (id, name, description, category, rating, downloads, icon, storeUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(extension.id, extension.name, extension.description, extension.category, extension.rating, extension.downloads, extension.icon, extension.storeUrl)
      .run()
    return c.json(extension)
})

extensions.put('/:id', async (c) => {
    const id = c.req.param('id')
    const extension = await c.req.json<Extension>()
    const db = c.env.DB_1 as D1Database
    await db.prepare('UPDATE extensions SET name = ?, description = ?, category = ?, rating = ?, downloads = ?, icon = ?, storeUrl = ? WHERE id = ?')
      .bind(extension.name, extension.description, extension.category, extension.rating, extension.downloads, extension.icon, extension.storeUrl, id)
      .run()
    return c.json(extension)
})

extensions.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const db = c.env.DB_1 as D1Database
    await db.prepare('DELETE FROM extensions WHERE id = ?').bind(id).run()
    return c.json({ message: 'Extension deleted' })
})

export default extensions
