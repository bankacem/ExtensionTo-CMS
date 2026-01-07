import { Hono } from 'hono'
import { cors } from 'hono/cors'
import posts from './posts'
import extensions from './extensions'
import users from './users'
import seo from './seo'

const app = new Hono()

app.use('/api/*', cors())

app.route('/', seo)
app.route('/api/posts', posts)
app.route('/api/extensions', extensions)
app.route('/api/users', users)

export default app
