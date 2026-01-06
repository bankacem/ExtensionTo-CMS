import { Hono } from 'hono'

const seo = new Hono()

seo.get('/sitemap.xml', async (c) => {
    const dbs = [c.env.DB_1, c.env.DB_2, c.env.DB_3]
    const promises = dbs.map(db => db.prepare("SELECT id FROM posts WHERE status = 'published'").all())
    const results = await Promise.all(promises)
    const posts = results.flatMap(result => result.results)

    const baseUrl = new URL(c.req.url).origin
    let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    posts.forEach((post: any) => {
        xml += `<url><loc>${baseUrl}/blog/${post.id}</loc></url>`
    })
    xml += '</urlset>'

    return c.text(xml, 200, { 'Content-Type': 'application/xml' })
})

seo.get('/robots.txt', async (c) => {
    const baseUrl = new URL(c.req.url).origin
    const txt = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml`

    return c.text(txt, 200, { 'Content-Type': 'text/plain' })
})

export default seo
