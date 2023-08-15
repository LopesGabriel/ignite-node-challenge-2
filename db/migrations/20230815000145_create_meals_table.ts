import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('meals', (table) => {
    table.uuid('id').primary()
    table.uuid('user_session').after('id').index()
    table.text('name').notNullable()
    table.text('description')
    table.boolean('is_in_diet').notNullable()
    table.timestamp('meal_datetime').defaultTo(knex.fn.now()).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('meals')
}
