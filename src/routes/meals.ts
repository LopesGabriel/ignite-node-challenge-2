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
      mealDateTime: z.coerce.date().optional(),
      isInDiet: z.boolean(),
    })

    const { isInDiet, mealDateTime, name, description } = bodySchema.parse(
      req.body,
    )

    const transaction = await knex('meals')
      .insert({
        id: randomUUID(),
        name,
        description,
        meal_datetime: mealDateTime?.toISOString(),
        is_in_diet: isInDiet,
        user_session: userSession,
      })
      .returning('*')
      .first()

    return reply.status(201).send({ data: transaction })
  })

  app.put('/', { preHandler: validateUserSession }, async (req, reply) => {
    const { userSession } = req.cookies
  })
}
