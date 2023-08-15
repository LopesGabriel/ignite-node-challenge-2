import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('meals', (table) => {
    table.uuid('id').primary()
    table.uuid('userSession').after('id').index()
    table.text('name').notNullable()
    table.text('description')
    table.boolean('isInDiet').notNullable()
    table.timestamp('mealDatetime').defaultTo(knex.fn.now()).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('meals')
}
