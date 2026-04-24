import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { majors } from '../db/schema/index.ts'

export const MajorService = {
  async list() {
    return db.select().from(majors).orderBy(majors.code)
  },
  async create(dto: { code: string; name: string }) {
    const [row] = await db.insert(majors).values(dto).returning()
    return row
  },
  async update(id: string, dto: { code: string; name: string }) {
    const [row] = await db.update(majors).set(dto).where(eq(majors.id, id)).returning()
    return row
  },
  async remove(id: string) {
    await db.delete(majors).where(eq(majors.id, id))
  },
}
