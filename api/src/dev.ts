import { serve } from '@hono/node-server'
import { app } from './app'
import { registerScreenshotRoute } from './screenshot-route'

registerScreenshotRoute(app)

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
