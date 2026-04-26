export type PaginationQuery = {
  page: number
  perPage: number
}

export type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

/** Parse ?page= and ?perPage= from query string, with sane defaults & limits */
export function parsePagination(query: Record<string, string | undefined>): PaginationQuery {
  const page = Math.max(1, parseInt(query.page ?? '1') || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '25') || 25))
  return { page, perPage }
}

export function paginate<T>(data: T[], { page, perPage }: PaginationQuery): PaginatedResult<T> {
  const total = data.length
  const totalPages = Math.ceil(total / perPage) || 1
  const start = (page - 1) * perPage
  return {
    data: data.slice(start, start + perPage),
    total,
    page,
    perPage,
    totalPages,
  }
}
