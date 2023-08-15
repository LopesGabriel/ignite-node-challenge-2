// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    meals: {
      id: string
      userSession: string
      name: string
      description?: string
      isInDiet: boolean
      mealDatetime?: string
    }
  }
}
