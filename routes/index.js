import express from 'express'
import pokemonRouter from './pokemonRouter.js'
const router = express.Router()
router.get('/', (req, res, next) => {
  res.send('get Pokemons')
})
router.use('/pokemons', pokemonRouter)
export default router
