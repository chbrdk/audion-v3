'use client'

import { useEffect, useState } from 'react'
import { paths } from '../lib/paths'

/**
 * Live viewport for a running UX Journey Agent job (JPEG poll fallback).
 * MJPEG stream via <img> when the proxy supports multipart.
 */
export function UxJourneyLivePoll({
  jobId,
  intervalMs = 1200,
}: {
  jobId: string
  intervalMs?: number
}) {
  const [mjpegOk, setMjpegOk] = useState(true)
  const [epoch, setEpoch] = useState(0)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const mjpegSrc = `${paths.routes.apiUxJourneyAgentLiveStream(jobId)}?ts=${epoch}`

  useEffect(() => {
    if (mjpegOk) return
    let cancelled = false
    let objectUrl: string | null = null
    const tick = async () => {
      try {
        const res = await fetch(paths.routes.apiUxJourneyAgentLive(jobId), {
          cache: 'no-store',
        })
        if (!res.ok) return
        const blob = await res.blob()
        if (cancelled) return
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      } catch {
        /* keep last frame */
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), intervalMs)
    const retry = window.setInterval(() => {
      setEpoch((n) => n + 1)
      setMjpegOk(true)
    }, 5000)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.clearInterval(retry)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [jobId, intervalMs, mjpegOk])

  return (
    <div className="audion-ux-live">
      {mjpegOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={epoch}
          src={mjpegSrc}
          alt="Live browser view"
          className="audion-ux-live-frame"
          onError={() => setMjpegOk(false)}
        />
      ) : blobUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={blobUrl} alt="Live browser view" className="audion-ux-live-frame" />
      ) : (
        <p className="audion-muted">Waiting for first frame…</p>
      )}
    </div>
  )
}
