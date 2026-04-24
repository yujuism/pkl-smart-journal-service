import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { schools } from './schools.ts'

// Custom roles — bisa dibuat oleh admin
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id),
  name: text('name').notNull(),           // e.g. 'Koordinator Jurusan'
  slug: text('slug').notNull(),           // e.g. 'koordinator-jurusan' (unique per school)
  description: text('description'),
  isSystem: boolean('is_system').default(false), // system roles cannot be deleted
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Permission keys — what actions exist in the system
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(), // e.g. 'journals:read', 'users:manage'
  label: text('label').notNull(),      // Human-readable label
  group: text('group').notNull(),      // e.g. 'Jurnal', 'Pengguna'
})

// Which permissions each role has
export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
})

// Which roles each user has (many-to-many, replaces single role field for custom RBAC)
export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull(),   // references users.id (no FK to avoid circular)
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
})

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert
export type Permission = typeof permissions.$inferSelect
export type RolePermission = typeof rolePermissions.$inferSelect
export type UserRole = typeof userRoles.$inferSelect
