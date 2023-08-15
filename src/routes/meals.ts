import { randomUUID } from 'crypto'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { knex } from '../database'
import { validateUserSession } from '../middlewares/validate-user-session'

export async function mealsRoutes(app: FastifyInstance) {
  app.post('/', async (req, reply) => {
    let { userSession } = req.cookies

    if (!userSession) {
      userSession = randomUUID()
      reply.cookie('userSession', userSession, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Days
      })
    }

    const bodySchema = z.object({
      name: z.string(),
      description: z.string().optional(),
      mealDatetime: z.string().default(new Date().toISOString()),
      isInDiet: z.boolean(),
    })

    const { isInDiet, mealDatetime, name, description } = bodySchema.parse(
      req.body,
    )

    console.log({ mealDatetime })

    const transaction = await knex('meals')
      .insert({
        id: randomUUID(),
        name,
        description,
        mealDatetime,
        isInDiet,
        userSession,
      })
      .returning('*')

    return reply.status(201).send({
      data: {
        ...transaction[0],
        isInDiet: Boolean(transaction[0].isInDiet),
      },
    })
  })

  app.put('/:id', { preHandler: validateUserSession }, async (req, reply) => {
    const bodySchema = z.object({
      id: z.string(),
      userSession: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      mealDatetime: z.coerce.date().optional(),
      isInDiet: z.boolean().optional(),
    })

    const { id, description, isInDiet, mealDatetime, name, userSession } =
      bodySchema.parse({
        ...(req.body as object),
        ...(req.params as object),
        ...(req.cookies as object),
      })

    const existingTransaction = await knex('meals')
      .select('*')
      .where({
        id,
        userSession,
      })
      .first()

    if (!existingTransaction) {
      return reply.status(404).send({ message: 'Meal not found' })
    }

    const updatedTransaction = await knex('meals')
      .where({ id })
      .update({
        description,
        isInDiet,
        mealDatetime: mealDatetime?.toISOString(),
        name,
      })
      .returning('*')

    return {
      data: {
        ...updatedTransaction[0],
        isInDiet: Boolean(updatedTransaction[0].isInDiet),
      },
    }
  })

  app.delete(
    '/:id',
    { preHandler: validateUserSession },
    async (req, reply) => {
      const { id } = req.params as Record<string, string>
      const { userSession } = req.cookies

      const existingTransaction = await knex('meals')
        .select('*')
        .where({ id })
        .first()

      if (!existingTransaction) {
        return reply.status(404).send({ message: 'Meal not found' })
      }

      if (existingTransaction.userSession !== userSession) {
        return reply.status(401).send()
      }

      await knex('meals').where({ id }).del()

      return reply.status(204).send()
    },
  )

  app.get('/', { preHandler: validateUserSession }, async (req) => {
    const { userSession } = req.cookies

    const meals = await knex('meals').where({ userSession }).select('*')

    return {
      data: meals.map((meal) => {
        meal.isInDiet = Boolean(meal.isInDiet)
        return meal
      }),
    }
  })

  app.get('/:id', { preHandler: validateUserSession }, async (req, reply) => {
    const { id } = req.params as Record<string, string>
    const { userSession } = req.cookies

    const meal = await knex('meals').select('*').where({ id }).first()

    if (!meal) {
      return reply.status(404).send({ message: 'Meal not found' })
    }

    if (meal.userSession !== userSession) {
      return reply.status(401).send()
    }

    return {
      data: { ...meal, isInDiet: Boolean(meal.isInDiet) },
    }
  })

  app.get('/summary', { preHandler: validateUserSession }, async (req) => {
    const { userSession } = req.cookies

    const meals = await knex('meals')
      .where({ userSession })
      .select('*')
      .orderBy('mealDatetime', 'desc')

    let inDietAmount = 0
    let outDietAmount = 0
    let currentDietSequence = 0
    let bestInDietSequence = 0

    for (const meal of meals) {
      if (meal.isInDiet) {
        inDietAmount++
        currentDietSequence++
      } else {
        outDietAmount++
        if (currentDietSequence > bestInDietSequence)
          bestInDietSequence = currentDietSequence
        currentDietSequence = 0
      }
    }

    return {
      mealsAmount: meals.length,
      inDietAmount,
      outDietAmount,
      bestInDietSequence,
    }
  })
}
