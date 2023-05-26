import express from 'express'
import * as dotenv from 'dotenv'
import indexRouter from './routes/index.js'
import cors from 'cors'
dotenv.config()
const app = express()
app.use(express.json())
app.use(cors())
app.use(express.static('public'))
app.use('/', indexRouter)
const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
app.use((err, req, res, next) => {
  console.log('ERROR', err.message)
  const statusCode = err.statusCode || 500
  res.status(statusCode).send(err.message)
})
