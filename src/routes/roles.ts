import { Hono } from 'hono'
import { requireAuth, requirePermission } from '../middleware/auth.ts'
import { RbacService } from '../services/rbac.service.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

// ── Permissions ────────────────────────────────────────────────────────────

router.get('/permissions', requirePermission('roles:manage'), async (c) => {
  const perms = await RbacService.listPermissions()
  return c.json(perms)
})

// ── Roles CRUD ─────────────────────────────────────────────────────────────

router.get('/', requirePermission('roles:manage'), async (c) => {
  const user = c.get('user')
  const roles = await RbacService.listRoles(user.schoolId ?? undefined)
  return c.json(roles)
})

router.get('/:id', requirePermission('roles:manage'), async (c) => {
  const role = await RbacService.getRole(c.req.param('id') as string)
  if (!role) return c.json({ error: 'Not found' }, 404)
  return c.json(role)
})

router.post('/', requirePermission('roles:manage'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const role = await RbacService.createRole({
    name: body.name,
    slug: body.slug,
    description: body.description,
    schoolId: user.role === 'admin' ? (body.schoolId ?? user.schoolId ?? undefined) : (user.schoolId ?? undefined),
    permissionKeys: body.permissionKeys ?? [],
  })
  return c.json(role, 201)
})

router.put('/:id', requirePermission('roles:manage'), async (c) => {
  const body = await c.req.json()
  const role = await RbacService.updateRole(c.req.param('id') as string, {
    name: body.name,
    description: body.description,
    permissionKeys: body.permissionKeys ?? [],
  })
  return c.json(role)
})

router.delete('/:id', requirePermission('roles:manage'), async (c) => {
  await RbacService.deleteRole(c.req.param('id') as string)
  return c.json({ success: true })
})

// Users that have a specific role — returns userId[]
router.get('/:id/users', requirePermission('roles:manage'), async (c) => {
  const userIds = await RbacService.getUsersByRole(c.req.param('id') as string)
  return c.json(userIds)
})

// ── User ↔ Role assignment ─────────────────────────────────────────────────

router.get('/user/:userId', requirePermission('roles:manage'), async (c) => {
  const roles = await RbacService.getUserRoles(c.req.param('userId') as string)
  return c.json(roles)
})

router.post('/user/:userId/assign', requirePermission('roles:manage'), async (c) => {
  const { roleId } = await c.req.json()
  await RbacService.assignRole(c.req.param('userId') as string, roleId)
  return c.json({ success: true })
})

router.post('/user/:userId/set', requirePermission('roles:manage'), async (c) => {
  const { roleIds } = await c.req.json()
  await RbacService.setUserRoles(c.req.param('userId') as string, roleIds ?? [])
  return c.json({ success: true })
})

router.delete('/user/:userId/remove', requirePermission('roles:manage'), async (c) => {
  const { roleId } = await c.req.json()
  await RbacService.removeRole(c.req.param('userId') as string, roleId)
  return c.json({ success: true })
})

export default router
