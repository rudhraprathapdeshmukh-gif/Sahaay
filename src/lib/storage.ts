import { supabase } from './supabase'

export const uploadFile = async (
  bucket: string,
  file: File,
  folder: string,
  id: string
): Promise<string | null> => {
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${id}-${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (!error) {
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)
      if (urlData?.publicUrl) {
        return urlData.publicUrl
      }
    } else {
      console.warn(`Supabase Storage upload warning (${bucket}):`, error.message)
      // If bucket not found or policy error, fall back to base64 data URI
      if (error.message?.includes('Bucket not found') || error.message?.includes('row-level security') || error.message?.includes('violates')) {
        console.warn('Storage bucket/policy error, using base64 fallback:', error.message)
        return await fileToDataUrl(file)
      }
      // Don't throw - use fallback instead to prevent registration failures
      console.warn('Storage upload error, using base64 fallback:', error.message)
      return await fileToDataUrl(file)
    }
  } catch (err: any) {
    console.warn('Storage upload exception, using base64 fallback:', err)
    // Fallback to base64 data URL so user registration never fails due to missing buckets
    return await fileToDataUrl(file)
  }

  return await fileToDataUrl(file)
}

// Convert File to base64 Data URL (real image data fallback)
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
    reader.readAsDataURL(file)
  })
}

export const BUCKETS = {
  PROVIDER_PHOTOS: 'provider-photos',
  PROVIDER_CERTIFICATES: 'provider-certificates',
}
