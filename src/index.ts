import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { api as providerApi } from './providers'
import { api as adminApi } from './admin'
import { fromHono } from 'chanfana';

const app = new Hono<HonoCustomType>()
const openapi = fromHono(app, {
  schema: {
    info: {
      title: 'Awsl One API',
      version: '1.0.0',
    }
  },
  docs_url: '/api/docs',
  redoc_url: '/api/redocs',
  openapi_url: '/api/openapi.json'
});

// cors
openapi.use('/*', cors());
// global error handler
openapi.onError((err, c) => {
  console.error(err)
  return c.text(`${err.name} ${err.message}`, 500)
})

openapi.route('/', providerApi)
openapi.route('/', adminApi)

export default app
