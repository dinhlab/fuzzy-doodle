import express from 'express'
import csv from 'csvtojson'
import fs from 'fs'
import { faker } from '@faker-js/faker'
import dotenv from 'dotenv'
dotenv.config()
const router = express.Router()
const imageBaseUrl = process.env.IMAGE_BASE_URL || 'http://localhost:3001/images/'
console.log('imageBaseUrl ', imageBaseUrl)
const JSON_FILE_PATH = './db.json'
const getPokemonData = async () => {
  try {
    const jsonArray = await csv().fromFile('./poke.csv')
    const pokemonArray = jsonArray.map((pokemon, index) => ({
      id: index + 1,
      name: pokemon.name.toLowerCase(),
      types: [pokemon.Type1.toLowerCase(), pokemon.Type2.toLowerCase()].filter(Boolean),
      url: `${imageBaseUrl}${index + 1}.png`,
      category: pokemon.classfication.toLowerCase(),
      abilities: JSON.parse(pokemon.abilities.replace(/'/g, '"')),
      height: faker.number.float({ min: 1, max: 10, precision: 0.01 }) + ' m',
      weight: faker.number.float({ min: 10, max: 50, precision: 0.01 }) + ' kg'
    }))
    const jsonContent = JSON.stringify({ data: pokemonArray, totalPokemons: pokemonArray.length })
    fs.writeFileSync(JSON_FILE_PATH, jsonContent)
  } catch (error) {
    console.error(error)
    throw new Error('An error occurred while reading the CSV file')
  }
}
const getJsonData = async () => {
  try {
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8')
    if (!fileContent) {
      await getPokemonData()
      const jsonData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'))
      return jsonData
    }
    return JSON.parse(fileContent)
  } catch (error) {
    throw new Error('Failed to read JSON data: ' + error.message)
  }
}
router.get('/', async (req, res, next) => {
  const allowedFilter = ['search', 'type', 'page', 'limit']
  try {
    let { page = 1, limit = 10, ...filterQuery } = req.query
    page = Number(page)
    limit = Number(limit)
    const filterKeys = Object.keys(filterQuery)
    filterKeys.forEach(key => {
      if (!allowedFilter.includes(key)) {
        const error = new Error(`Query ${key} is not allowed`)
        error.statusCode = 401
        throw error
      }
      if (!filterQuery[key]) delete filterQuery[key]
    })
    const jsonData = await getJsonData()
    const pokemons = jsonData.data
    let result = pokemons
    if (filterKeys.includes('search')) {
      const searchQuery = filterQuery.search.toLowerCase()
      console.log('searchQuery: ' + searchQuery)
      result = result.filter(pokemon =>
        pokemon.name.toLowerCase().includes(searchQuery)
      )
    }
    if (filterKeys.includes('type')) {
      const typeQuery = filterQuery.type.toLowerCase()
      result = result.filter((pokemon) =>
        pokemon.types.includes(typeQuery)
      )
    }
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    result = result.slice(startIndex, endIndex)
    res.send(result)
  } catch (error) {
    next(error)
  }
})
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const jsonData = await getJsonData()
    const pokemons = jsonData.data
    const index = id - 1
    const pokemon = pokemons[index]
    if (!pokemon) {
      const error = new Error(`Pokemon with ID ${id} not found`)
      error.statusCode = 404
      throw error
    }
    const previousPokemon = pokemons[index - 1] || pokemons[pokemons.length - 1]
    const nextPokemon = pokemons[index + 1] || pokemon[0]
    const result = {
      pokemon, previousPokemon, nextPokemon
    }
    res.send(result)
  } catch (error) {
    next(error)
  }
})
router.post('/', async (req, res, next) => {
  const validPokemonTypes = ['grass', 'fire', 'water', 'electric', 'rock', 'ground', 'ice', 'bug', 'normal', 'poison', 'psychic', 'ghost', 'fighting', 'flying', 'dragon', 'steel', 'fairy']
  try {
    const { name, id, types, url } = req.body
    if (!name || !id || !types || !url) {
      const error = new Error('Missing required data.')
      error.statusCode = 400
      throw error
    }
    if (types.length > 2) {
      const error = new Error('Pokemon can only have one or two types.')
      error.statusCode = 400
      throw error
    }
    const invalidTypes = types.filter(type => !validPokemonTypes.includes(type))
    if (invalidTypes.length > 0) {
      const error = new Error('Pokemon\'s type is invalid.')
      error.statusCode = 400
      throw error
    }
    const jsonData = await getJsonData()
    const pokemons = jsonData.data
    const existingPokemon = pokemons.find(pokemon => pokemon.id === id || pokemon.name === name)
    if (existingPokemon) {
      const error = new Error('The Pokemon already exists.')
      error.statusCode = 400
      throw error
    }
    const newPokemon = {
      id,
      name: name.toLowerCase(),
      types: types.map(type => type.toLowerCase()),
      url,
      category: '',
      abilities: [],
      height: faker.number.float({ min: 1, max: 10, precision: 0.01 }),
      weight: faker.number.float({ min: 10, max: 50, precision: 0.01 })
    }
    pokemons.push(newPokemon)
    jsonData.totalPokemons++
    const jsonContent = JSON.stringify(jsonData)
    fs.writeFileSync(JSON_FILE_PATH, jsonContent)
    res.status(201).json(newPokemon)
  } catch (error) {
    next(error)
  }
})
router.put('/:id', async (req, res, next) => {
  const validPokemonTypes = ['grass', 'fire', 'water', 'electric', 'rock', 'ground', 'ice', 'bug', 'normal', 'poison', 'psychic', 'ghost', 'fighting', 'flying', 'dragon', 'steel', 'fairy']
  try {
    const pokemonId = parseInt(req.params.id)
    const { name, types, url } = req.body
    if (!name || !types || !url) {
      throw new Error('Missing required data.')
    }
    if (types.length > 2) {
      throw new Error('Pokemon can only have one or two types.')
    }
    const invalidTypes = types.filter(type => !validPokemonTypes.includes(type))
    if (invalidTypes.length > 0) {
      throw new Error("Pokemon's type is invalid.")
    }
    const jsonData = await getJsonData()
    const pokemons = jsonData.data
    const existingPokemonIndex = pokemons.findIndex(pokemon => pokemon.id === pokemonId)
    if (existingPokemonIndex === -1) {
      throw new Error('The Pokemon does not exist.')
    }
    const updatedPokemon = {
      ...pokemons[existingPokemonIndex],
      name: name.toLowerCase(),
      types: types.map(type => type.toLowerCase()),
      url
    }
    pokemons[existingPokemonIndex] = updatedPokemon
    const jsonContent = JSON.stringify(jsonData)
    fs.writeFileSync(JSON_FILE_PATH, jsonContent)
    res.json(updatedPokemon)
  } catch (error) {
    error.statusCode = error.statusCode || 500
    next(error)
  }
})
router.delete('/:id', async (req, res, next) => {
  try {
    const pokemonId = Number(req.params.id)
    const jsonData = await getJsonData()
    const pokemons = jsonData.data
    const existingPokemonIndex = pokemons.findIndex(pokemon => pokemon.id === pokemonId)
    if (existingPokemonIndex === -1) {
      const error = new Error('The Pokémon does not exist.')
      error.statusCode = 404
      throw error
    }
    const deletedPokemon = pokemons[existingPokemonIndex]
    pokemons.splice(existingPokemonIndex, 1)
    jsonData.totalPokemons--
    const jsonContent = JSON.stringify(jsonData)
    fs.writeFileSync(JSON_FILE_PATH, jsonContent)
    res.json(deletedPokemon)
  } catch (error) {
    next(error)
  }
})
export default router
