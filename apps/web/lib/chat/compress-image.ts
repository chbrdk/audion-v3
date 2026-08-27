/** Client-side image compress for chat attachments (max edge + JPEG quality). */

import { paths } from '../paths'

export function compressChatImageFile(
  file: File,
  maxEdgePx: number = paths.chatImageCompressMaxEdgePx,
  quality: number = paths.chatImageCompressQuality,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to decode image'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxEdgePx || height > maxEdgePx) {
          const scale = Math.min(maxEdgePx / width, maxEdgePx / height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            const out = new FileReader()
            out.onerror = () => reject(new Error('Failed to read compressed image'))
            out.onload = () => {
              if (typeof out.result === 'string') resolve(out.result)
              else reject(new Error('Unexpected compress result'))
            }
            out.readAsDataURL(blob)
          },
          'image/jpeg',
          quality,
        )
      }
      if (typeof reader.result === 'string') img.src = reader.result
      else reject(new Error('Unexpected file read result'))
    }
    reader.readAsDataURL(file)
  })
}
