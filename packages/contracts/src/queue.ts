/** Queue dashboard — document-processing job fixtures (V2 shape). */

export type QueueJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type QueueJobSummary = {
  id: string
  projectId: string
  documentId: string
  filename: string
  sizeBytes: number | null
  status: QueueJobStatus
  progress: number
  error: string | null
  createdAt: string
  updatedAt: string
}

export type QueueJobDetail = QueueJobSummary

export type QueueJobList = {
  items: QueueJobSummary[]
  total: number
  page: number
  pageSize: number
}

export type QueueStatsResponse = {
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
}

export type QueueJobListQuery = {
  status?: QueueJobStatus | 'all' | null
  projectId?: string | null
  page?: number
  pageSize?: number
}
