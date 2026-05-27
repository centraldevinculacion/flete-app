export const compressImage = (file, maxDim = 1024, quality = 0.72) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(1, maxDim / Math.max(img.width, img.height, 1))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })

export const storageUsageMB = () => {
  try {
    let bytes = 0
    for (const k in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, k))
        bytes += (localStorage[k].length + k.length) * 2
    }
    return (bytes / 1024 / 1024).toFixed(1)
  } catch { return '?' }
}
