
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

type ImageItem = {
  id: string
  filename: string
  url: string
  browser?: ImageElementInfo
}

interface ImageResponse {
  filename: string
  url: string
}

type ImageElementInfo = {
  currentSrc: string
  naturalWidth: number
  naturalHeight: number
  renderedWidth: number
  renderedHeight: number
  complete: boolean
  loading: string
  decoding: string
  fetchPriority: string
  crossOrigin: string
  referrerPolicy: string
  sizes: string
  srcset: string
  isMap: boolean
  useMap: string
}

const API_URL = import.meta.env.VITE_API_URL || '/bucket'
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

function isAcceptedImageFile(file: File) {
  const normalizedType = file.type.toLowerCase()
  const normalizedName = file.name.toLowerCase()
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp']

  return allowedMimeTypes.includes(normalizedType)
    || /\.(png|jpe?g|gif|webp|bmp)$/i.test(normalizedName)
}

function normalizeImages(items: ImageResponse[]): ImageItem[] {
  return items.map((image, index) => ({
    id: `${index}-${image.url}`,
    filename: image.filename,
    url: image.url,
  }))
}

function ImageInfo({ image }: { image: ImageItem }) {
  const browser = image.browser

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
      <div className="col-span-2 min-w-0 sm:col-span-1"><dt className="text-slate-400">Filename</dt><dd className="truncate font-medium" title={image.filename}>{image.filename}</dd></div>
      <div className="col-span-2 min-w-0 sm:col-span-3"><dt className="text-slate-400">Response URL</dt><dd className="truncate font-medium" title={image.url}>{image.url}</dd></div>
      <div><dt className="text-slate-400">Intrinsic size</dt><dd className="font-medium">{browser ? `${browser.naturalWidth} x ${browser.naturalHeight}` : 'Loading...'}</dd></div>
      <div><dt className="text-slate-400">Rendered size</dt><dd className="font-medium">{browser ? `${browser.renderedWidth} x ${browser.renderedHeight}` : 'Loading...'}</dd></div>
      <div><dt className="text-slate-400">Loaded</dt><dd className="font-medium">{browser?.complete ? 'Yes' : 'Loading...'}</dd></div>
      <div><dt className="text-slate-400">Loading mode</dt><dd className="font-medium">{browser?.loading || 'default'}</dd></div>
      <div><dt className="text-slate-400">Decoding</dt><dd className="font-medium">{browser?.decoding || 'auto'}</dd></div>
      <div><dt className="text-slate-400">Fetch priority</dt><dd className="font-medium">{browser?.fetchPriority || 'auto'}</dd></div>
      <div><dt className="text-slate-400">Cross-origin</dt><dd className="font-medium">{browser?.crossOrigin || 'Not set'}</dd></div>
      <div><dt className="text-slate-400">Referrer policy</dt><dd className="font-medium">{browser?.referrerPolicy || 'Not set'}</dd></div>
      <div><dt className="text-slate-400">Image map</dt><dd className="font-medium">{browser?.isMap ? 'Yes' : 'No'}</dd></div>
      <div className="col-span-2 min-w-0 sm:col-span-4"><dt className="text-slate-400">Sizes</dt><dd className="truncate font-medium" title={browser?.sizes}>{browser?.sizes || 'Not set'}</dd></div>
      <div className="col-span-2 min-w-0 sm:col-span-4"><dt className="text-slate-400">Srcset</dt><dd className="truncate font-medium" title={browser?.srcset}>{browser?.srcset || 'Not set'}</dd></div>
      <div className="col-span-2 min-w-0 sm:col-span-4"><dt className="text-slate-400">Current source</dt><dd className="truncate font-medium" title={browser?.currentSrc}>{browser?.currentSrc || 'Loading...'}</dd></div>
    </dl>
  )
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [processedImages, setProcessedImages] = useState<ImageItem[]>([])
  const [selectedProcessedImage, setSelectedProcessedImage] = useState<ImageItem | null>(null)
  const [images, setImages] = useState<ImageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [lastUploaded, setLastUploaded] = useState<ImageItem | null>(null)
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)

  const handleImageLoad = (element: HTMLImageElement, image: ImageItem, list: 'original' | 'processed' | 'uploaded' = 'original') => {
    const loadedImage = {
      ...image,
      browser: {
        currentSrc: element.currentSrc,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
        renderedWidth: element.width,
        renderedHeight: element.height,
        complete: element.complete,
        loading: element.loading,
        decoding: element.decoding,
        fetchPriority: element.fetchPriority,
        crossOrigin: element.crossOrigin ?? '',
        referrerPolicy: element.referrerPolicy,
        sizes: element.sizes,
        srcset: element.srcset,
        isMap: element.isMap,
        useMap: element.useMap,
      },
    }

    const updateImages = (items: ImageItem[]) => items.map((item) => item.id === image.id ? loadedImage : item)
    if (list === 'uploaded') {
      setLastUploaded(loadedImage)
    } else if (list === 'processed') {
      setProcessedImages(updateImages)
      setSelectedProcessedImage((current) => current?.id === image.id ? loadedImage : current)
    } else {
      setImages(updateImages)
      setSelectedImage((current) => current?.id === image.id ? loadedImage : current)
    }
  }

  const loadImages = async () => {
    setIsLoading(true)
    setMessage('')
    try {
      const response = await axios.get<{ originais: ImageResponse[], processadas: ImageResponse[] }>(API_URL)
      setImages(normalizeImages(response.data.originais))
      setProcessedImages(normalizeImages(response.data.processadas))
    } catch {
      setMessage('Could not load your images. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadImages()
  }, [])

  useEffect(() => {
    if (!selectedFile) {
      setPreview('')
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedFile])

  const chooseFile = (file?: File) => {
    if (!file) return

    const isImage = isAcceptedImageFile(file)
    const isTooLarge = file.size > MAX_IMAGE_SIZE_BYTES

    if (!isImage) {
      setMessage('Please choose a valid image file (PNG, JPG, GIF, WebP, or BMP).')
      return
    }

    if (isTooLarge) {
      setMessage('Please choose an image smaller than 5MB.')
      return
    }

    setMessage('')
    setSelectedFile(file)
  }

  const uploadImage = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setMessage('')
    const formData = new FormData()
    formData.append('image', selectedFile)

    try {
      const response = await axios.post(API_URL, formData)
      const uploadedImage = normalizeImages([response.data as ImageResponse])[0]
      setLastUploaded(uploadedImage)
      setSelectedFile(null)
      await loadImages()
    } catch {
      setMessage('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="min-h-screen px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Image bucket</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your images, in one place.</h1>
          </div>
          <button
            type="button"
            onClick={() => void loadImages()}
            disabled={isLoading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-wait disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh list'}
          </button>
        </header>

        <section className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => { event.preventDefault(); setIsDragging(false); chooseFile(event.dataTransfer.files[0]) }}
              className={`relative flex min-h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed p-8 text-center transition ${isDragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white/70 hover:border-teal-400 hover:bg-white'}`}
            >
              {preview ? (
                <img src={preview} alt="Selected preview" className="absolute inset-0 h-full w-full object-contain p-4" />
              ) : (
                <>
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-2xl text-teal-700">+</span>
                  <p className="font-medium">Drop an image here</p>
                  <p className="mt-2 text-sm text-slate-500">or click to browse your files</p>
                </>
              )}
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="min-w-0 truncate text-sm text-slate-500">{selectedFile?.name ?? 'PNG, JPG or GIF up to 5MB'}</p>
              <button
                type="button"
                onClick={() => void uploadImage()}
                disabled={!selectedFile || isUploading}
                className="shrink-0 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isUploading ? 'Uploading...' : 'Upload image'}
              </button>
            </div>
            {message && <p className="mt-3 text-sm text-rose-600" role="alert">{message}</p>}
            {lastUploaded && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Last uploaded</p>
                <img src={lastUploaded.url} alt="" className="hidden" onLoad={(event) => handleImageLoad(event.currentTarget, lastUploaded, 'uploaded')} />
                <ImageInfo image={lastUploaded} />
              </div>
            )}
          </div>


          <section aria-labelledby="gallery-title">
            <div className="mb-4 flex items-baseline justify-between border-b border-slate-200 pb-3">
              <h2 id="gallery-title" className="text-lg font-semibold">Image library</h2>
              <span className="text-sm text-slate-500">{images.length} {images.length === 1 ? 'image' : 'images'}</span>
            </div>
            {isLoading ? (
              <p className="py-16 text-center text-sm text-slate-500">Fetching images...</p>
            ) : images.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white/50 px-6 py-16 text-center text-sm text-slate-500">Your uploaded images will appear here.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    aria-pressed={selectedImage?.id === image.id}
                    className={`group overflow-hidden rounded-xl border bg-white text-left transition ${selectedImage?.id === image.id ? 'border-teal-600 ring-2 ring-teal-100' : 'border-slate-200 hover:border-teal-300'}`}
                  >
                    <img src={image.url} alt={image.filename} onLoad={(event) => handleImageLoad(event.currentTarget, image)} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105" />
                    <figcaption className="truncate px-3 py-2 text-xs text-slate-500">{image.filename}</figcaption>
                  </button>
                ))}
              </div>
            )}
            {selectedImage && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Selected image</p>
                <ImageInfo image={selectedImage} />
              </div>
            )}
          </section>


          <section aria-labelledby="gallery-title">
            <div className="mb-4 flex items-baseline justify-between border-b border-slate-200 pb-3">
              <h2 id="gallery-title" className="text-lg font-semibold">Processed images</h2>
              <span className="text-sm text-slate-500">{processedImages.length} {processedImages.length === 1 ? 'image' : 'images'}</span>
            </div>
            {isLoading ? (
              <p className="py-16 text-center text-sm text-slate-500">Fetching images...</p>
            ) : processedImages.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white/50 px-6 py-16 text-center text-sm text-slate-500">Your processed images will appear here.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {processedImages.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedProcessedImage(image)}
                    aria-pressed={selectedProcessedImage?.id === image.id}
                    className={`group overflow-hidden rounded-xl border bg-white text-left transition ${selectedProcessedImage?.id === image.id ? 'border-teal-600 ring-2 ring-teal-100' : 'border-slate-200 hover:border-teal-300'}`}
                  >
                    <img src={image.url} alt={image.filename} onLoad={(event) => handleImageLoad(event.currentTarget, image, 'processed')} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105" />
                    <figcaption className="truncate px-3 py-2 text-xs text-slate-500">{image.filename}</figcaption>
                  </button>
                ))}
              </div>
            )}
            {selectedProcessedImage && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Selected image</p>
                <ImageInfo image={selectedProcessedImage} />
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  )
}
