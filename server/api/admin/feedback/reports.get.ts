import { serverReportListSchema, toReportRow, type FeedbackReportList } from '#shared/schemas/feedback'
import { parseUpstream, readListQuery } from '../../../utils/request-input'
import { serverApi } from '../../../utils/server-api'
import { toBffError } from '../../../utils/upstream'

/** GET /api/admin/feedback/reports (Server: admin.access). El Server no admite búsqueda ni filtros. */
export default defineEventHandler(async (event): Promise<FeedbackReportList> => {
  try {
    const { page, limit } = readListQuery(event, { allowedLimits: [20, 50, 100], escapeSearch: false })
    const data = parseUpstream(
      serverReportListSchema,
      await serverApi(event, '/api/admin/feedback/reports', { query: { page, limit } }),
      'GET /admin/feedback/reports',
    )
    return { items: data.items.map(toReportRow), pagination: data.pagination }
  } catch (error) {
    toBffError(error)
  }
})
