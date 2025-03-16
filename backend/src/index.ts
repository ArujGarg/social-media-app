import { Hono } from 'hono'
import { userRouter } from './routes/userRoutes'
import { postRouter } from './routes/postRoutes'
import { cors } from 'hono/cors'

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string,
    JWT_SECRET: string
  }
}>()

app.use('/*', cors());
app.route('/api/v1/user', userRouter);
app.route('/api/v1/post', postRouter)


export default app


