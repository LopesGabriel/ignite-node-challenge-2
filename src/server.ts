import { app } from './app'

app.ready().then(() => {
  app.listen({
    host: '0.0.0.0',
    port: 3333,
  })
})
