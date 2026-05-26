/**
 * Client-side image compression utility using native HTML5 Canvas.
 * Compresses static images to WebP for optimal size and quality, preserves GIFs.
 */
export async function compressImage(
  file: File,
  maxDimension: number = 1200,
  quality: number = 0.8
): Promise<File> {
  // Only compress images, skip GIFs to preserve animations
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calculate new dimensions keeping aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        const exportType = 'image/webp'
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }

            // Generate webp filename
            const lastDot = file.name.lastIndexOf('.')
            const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name
            const compressedName = `${baseName}.webp`

            const compressedFile = new File([blob], compressedName, {
              type: exportType,
              lastModified: Date.now(),
            })

            // Fallback to original if compression didn't help (e.g. very small image already)
            if (compressedFile.size > file.size) {
              resolve(file)
            } else {
              resolve(compressedFile)
            }
          },
          exportType,
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
