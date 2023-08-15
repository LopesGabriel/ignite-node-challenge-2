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
})
