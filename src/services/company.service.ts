import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { companies } from '../db/schema/index.ts'

export const CompanyService = {
  async list() {
    return db.select().from(companies).orderBy(companies.name)
  },
  async create(dto: { name: string; address?: string; phone?: string; contactPerson?: string }) {
    const [row] = await db.insert(companies).values(dto).returning()
    return row
  },
  async update(id: string, dto: { name: string; address?: string; phone?: string; contactPerson?: string }) {
    const [row] = await db.update(companies).set(dto).where(eq(companies.id, id)).returning()
    return row
  },
  async remove(id: string) {
    await db.delete(companies).where(eq(companies.id, id))
  },
}
