// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    meals: {
      id: string
      user_session: string
      name: string
      description?: string
      is_in_diet: boolean
      meal_datetime?: string
    }
  }
}
