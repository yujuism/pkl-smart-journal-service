import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { roles, permissions, rolePermissions, userRoles, users } from '../db/schema/index.ts'

// All permission keys defined in the system
export const ALL_PERMISSIONS = [
  { key: 'journals:read',       label: 'Lihat Jurnal Siswa',         group: 'Jurnal' },
  { key: 'journals:write',      label: 'Buat/Edit Jurnal',           group: 'Jurnal' },
  { key: 'feedback:write',      label: 'Beri Feedback',              group: 'Jurnal' },
  { key: 'students:read',       label: 'Lihat Data Siswa',           group: 'Siswa' },
  { key: 'evaluations:read',    label: 'Lihat Evaluasi AI',          group: 'Evaluasi' },
  { key: 'evaluations:write',   label: 'Jalankan Evaluasi AI',       group: 'Evaluasi' },
  { key: 'guidelines:manage',   label: 'Kelola Kompetensi PKL',      group: 'Admin' },
  { key: 'users:manage',        label: 'Kelola Pengguna',            group: 'Admin' },
  { key: 'users:approve',       label: 'Approve Pendaftaran User',   group: 'Admin' },
  { key: 'roles:manage',        label: 'Kelola Role & Hak Akses',   group: 'Admin' },
  { key: 'placements:write',    label: 'Kelola Penempatan PKL',      group: 'Admin' },
] as const

export type PermissionKey = typeof ALL_PERMISSIONS[number]['key']

// Default permissions per system role — used for seeding & JWT resolution
export const SYSTEM_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin:    ['journals:read', 'feedback:write', 'students:read', 'evaluations:read', 'evaluations:write', 'guidelines:manage', 'users:manage', 'users:approve', 'roles:manage', 'placements:write'],
  teacher:  ['journals:read', 'feedback:write', 'students:read', 'evaluations:read', 'evaluations:write'],
  industry: ['journals:read', 'feedback:write', 'students:read'],
  parent:   [],
  student:  ['journals:write'],
}

export const RbacService = {
  // ── Permissions ────────────────────────────────────────────────────

  async listPermissions() {
    return db.select().from(permissions).orderBy(permissions.group, permissions.key)
  },

  async seedPermissions() {
    for (const p of ALL_PERMISSIONS) {
      const [existing] = await db.select({ id: permissions.id }).from(permissions).where(eq(permissions.key, p.key)).limit(1)
      if (!existing) {
        await db.insert(permissions).values(p)
      }
    }
  },

  // ── Roles ──────────────────────────────────────────────────────────

  async listRoles(schoolId?: string) {
    const allRoles = await db.select().from(roles).orderBy(roles.isSystem, roles.name)
    const filtered = schoolId ? allRoles.filter(r => r.isSystem || r.schoolId === schoolId) : allRoles

    // attach permission keys to each role
    return Promise.all(filtered.map(async (role) => {
      const rps = await db
        .select({ key: permissions.key })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, role.id))
      return { ...role, permissions: rps.map(r => r.key) }
    }))
  },

  async getRole(id: string) {
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
    if (!role) return null
    const rps = await db
      .select({ key: permissions.key, id: permissions.id, label: permissions.label, group: permissions.group })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, id))
    return { ...role, permissions: rps }
  },

  async createRole(dto: { name: string; slug: string; description?: string; schoolId?: string; permissionKeys: string[] }) {
    const [role] = await db.insert(roles).values({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      schoolId: dto.schoolId,
      isSystem: false,
    }).returning()

    await RbacService._setRolePermissions(role.id, dto.permissionKeys)
    return role
  },

  async updateRole(id: string, dto: { name: string; description?: string; permissionKeys: string[] }) {
    const [role] = await db.update(roles)
      .set({ name: dto.name, description: dto.description })
      .where(and(eq(roles.id, id), eq(roles.isSystem, false)))
      .returning()
    if (!role) throw new Error('Role tidak ditemukan atau tidak bisa diubah')

    await RbacService._setRolePermissions(id, dto.permissionKeys)
    return role
  },

  async deleteRole(id: string) {
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
    if (!role) throw new Error('Role tidak ditemukan')
    if (role.isSystem) throw new Error('System role tidak bisa dihapus')
    await db.delete(roles).where(eq(roles.id, id))
  },

  async _setRolePermissions(roleId: string, keys: string[]) {
    // delete old
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
    if (!keys.length) return
    // find permission IDs
    const perms = await db.select({ id: permissions.id, key: permissions.key })
      .from(permissions).where(inArray(permissions.key, keys))
    if (!perms.length) return
    await db.insert(rolePermissions).values(perms.map(p => ({ roleId, permissionId: p.id })))
  },

  // ── User ↔ Role assignment ─────────────────────────────────────────

  async getUsersByRole(roleId: string): Promise<string[]> {
    const rows = await db.select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, roleId))
    return rows.map(r => r.userId)
  },

  async getUserRoles(userId: string) {
    return db
      .select({ id: roles.id, name: roles.name, slug: roles.slug, isSystem: roles.isSystem })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId))
  },

  async assignRole(userId: string, roleId: string) {
    // idempotent
    const [existing] = await db.select().from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId))).limit(1)
    if (!existing) {
      await db.insert(userRoles).values({ userId, roleId })
    }
  },

  async removeRole(userId: string, roleId: string) {
    await db.delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
  },

  async setUserRoles(userId: string, roleIds: string[]) {
    await db.delete(userRoles).where(eq(userRoles.userId, userId))
    if (roleIds.length) {
      await db.insert(userRoles).values(roleIds.map(roleId => ({ userId, roleId })))
    }
  },

  // ── Permission resolution (called at login) ───────────────────────

  async resolveUserPermissions(userId: string, systemRole: string): Promise<{ permissions: string[]; customRoles: string[] }> {
    // 1. base permissions from system role
    const base = SYSTEM_ROLE_PERMISSIONS[systemRole] ?? []

    // 2. extra permissions from custom roles
    const assigned = await db
      .select({ slug: roles.slug, key: permissions.key })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId))

    const customRoles = [...new Set(assigned.map(r => r.slug))]
    const extra = assigned.map(r => r.key).filter(Boolean) as string[]

    const merged = [...new Set([...base, ...extra])]
    return { permissions: merged, customRoles }
  },
}
