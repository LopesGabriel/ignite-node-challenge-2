import supertest from 'supertest'
import { app } from '../src/app'
import { execSync } from 'child_process'
import { expect, beforeAll, beforeEach, it, describe, afterAll } from 'vitest'

describe('Meals routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should create an user', async () => {
    const response = await supertest(app.server)
      .post('/meals')
      .send({
        name: 'Breakfest',
        isInDiet: true,
      })
      .expect(201)

    const cookies = response.get('Set-Cookie')
    expect(cookies[0].includes('userSession='))
  })

  it('should create an meal', async () => {
    const mealDatetime = '2023-08-15T12:12:00.000Z'
    const description = 'Café da manhã'
    const name = 'Breakfest'

    const response = await supertest(app.server)
      .post('/meals')
      .send({
        name,
        isInDiet: true,
        description,
        mealDatetime,
      })
      .expect(201)

    const { data } = response.body
    expect(data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name,
        description,
        isInDiet: true,
        mealDatetime,
      }),
    )
  })

  it('should edit a meal and track user', async () => {
    const createMealResponse = await supertest(app.server)
      .post('/meals')
      .send({
        name: 'Breakfesta',
        isInDiet: true,
        description: 'Café da manhã',
      })
      .expect(201)

    const cookies = createMealResponse.get('Set-Cookie')
    const { id } = createMealResponse.body.data
    const regexResult = /userSession=(?<userSession>[a-z0-9-]+);.+/g.exec(
      cookies[0],
    )

    let userSession = ''
    if (regexResult && regexResult.groups) {
      userSession = regexResult.groups.userSession
    }

    const updateMealResponse = await supertest(app.server)
      .put(`/meals/${id}`)
      .set('Cookie', cookies)
      .send({
        name: 'Breakfest',
        description: 'Pão com ovo e café',
      })
      .expect(200)

    expect(updateMealResponse.body.data).toEqual(
      expect.objectContaining({
        id,
        name: 'Breakfest',
        isInDiet: true,
        description: 'Pão com ovo e café',
        userSession,
      }),
    )
  })

  it('should delete a meal', async () => {
    const createMealResponse = await supertest(app.server)
      .post('/meals')
      .send({
        name: 'Breakfest',
        isInDiet: true,
        description: 'Café da manhã',
      })
      .expect(201)

    const cookies = createMealResponse.get('Set-Cookie')
    const { id } = createMealResponse.body.data

    await supertest(app.server)
      .delete(`/meals/${id}`)
      .set('Cookie', cookies)
      .expect(204)
  })

  it('should retrieve a specific meal', async () => {
    const createMealResponse = await supertest(app.server)
      .post('/meals')
      .send({
        name: 'Breakfest',
        isInDiet: true,
        description: 'Café da manhã',
      })
      .expect(201)

    const cookies = createMealResponse.get('Set-Cookie')
    const { id } = createMealResponse.body.data

    const getMealResponse = await supertest(app.server)
      .get(`/meals/${id}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getMealResponse.body.data).toEqual(
      expect.objectContaining({
        id,
        name: 'Breakfest',
        description: 'Café da manhã',
        isInDiet: true,
        mealDatetime: expect.any(String),
      }),
    )
  })

  it('should list all meals from a specific user', async () => {
    const mealsToCreate = [
      {
        name: 'Breakfest',
        description: '2 ovos cozidos e um pão de forma',
        isInDiet: true,
      },
      {
        name: 'Lunch',
        description:
          '1 colher de servir de arroz, 1 colher de servir de feijão, 1 bife e salada',
        isInDiet: true,
      },
    ]

    let userCookie: string[] = []
    for (const meal of mealsToCreate) {
      const response = await supertest(app.server)
        .post('/meals')
        .set('Cookie', userCookie)
        .send(meal)
        .expect(201)

      if (userCookie.length === 0) userCookie = response.get('Set-Cookie')
    }

    const listMealsResponse = await supertest(app.server)
      .get('/meals')
      .set('Cookie', userCookie)
      .expect(200)

    expect(listMealsResponse.body.data).toEqual(
      expect.arrayContaining(
        mealsToCreate.map((meal) =>
          expect.objectContaining({
            id: expect.any(String),
            name: meal.name,
            description: meal.description,
            isInDiet: meal.isInDiet,
          }),
        ),
      ),
    )
  })

  it("should retrieve user's metrics", async () => {
    const mealsToCreate = [
      {
        name: 'Breakfest',
        description: '2 ovos cozidos e um pão de forma',
        isInDiet: true,
        mealDatetime: '2023-08-15T10:30:00.000Z',
      },
      {
        name: 'Lunch',
        description:
          '1 colher de servir de arroz, 1 colher de servir de feijão, 1 bife e salada',
        isInDiet: true,
        mealDatetime: '2023-08-15T15:00:00.000Z',
      },
      {
        name: 'Açaí',
        description: 'Açaí de 500ml com tudo o que tem direito',
        isInDiet: false,
        mealDatetime: '2023-08-15T16:30:00.000Z',
      },
    ]

    let userCookie: string[] = []
    for (const meal of mealsToCreate) {
      const response = await supertest(app.server)
        .post('/meals')
        .set('Cookie', userCookie)
        .send(meal)
        .expect(201)

      if (userCookie.length === 0) userCookie = response.get('Set-Cookie')
    }

    const summaryResponse = await supertest(app.server)
      .get('/meals/summary')
      .set('Cookie', userCookie)
      .expect(200)

    expect(summaryResponse.body.data).toEqual(
      expect.objectContaining({
        mealsAmount: mealsToCreate.length,
        inDietAmount: 2,
        outDietAmount: 1,
        bestInDietSequence: 2,
      }),
    )
  })

  it("should not delete other user's meal", async () => {
    const createMealResponse = await supertest(app.server)
      .post('/meals')
      .send({
        name: 'Breakfest',
        isInDiet: true,
        description: 'Café da manhã',
      })
      .expect(201)

    const cookies = createMealResponse.get('Set-Cookie')

    const otherUserCreateMealResponse = await supertest(app.server)
      .post('/meals')
      .send({
        name: 'Hamburguer',
        isInDiet: false,
      })
      .expect(201)

    const { id } = otherUserCreateMealResponse.body.data

    await supertest(app.server)
      .delete(`/meals/${id}`)
      .set('Cookie', cookies)
      .expect(401)
  })
})
