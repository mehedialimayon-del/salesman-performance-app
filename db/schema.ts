import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const households = sqliteTable('households', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), revision: integer('revision').notNull().default(0), body: text('body').notNull()
});
