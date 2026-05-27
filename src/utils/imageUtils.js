import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { firebaseStorage } from '../firebase'
import { uid } from './storage'

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

// Compress and upload a photo to Firebase Storage, returns the download URL
export const uploadPhoto = async (dataUrl, freightId) => {
  const photoRef = ref(firebaseStorage, `freights/${freightId}/${uid()}.jpg`)
  const snapshot = await uploadString(photoRef, dataUrl, 'data_url')
  return getDownloadURL(snapshot.ref)
}
