import { Hono } from 'hono'
import posts from './posts'
import extensions from './extensions'
import users from './users'
import seo from './seo'

const app = new Hono()

app.route('/', seo)
app.route('/posts', posts)
app.route('/extensions', extensions)
app.route('/users', users)

export default app
