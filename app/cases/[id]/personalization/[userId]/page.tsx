'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { Loader } from '@/app/components/Loader'
import dynamic from 'next/dynamic'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/app/lib/firebase'
import { ErrorBoundary } from 'react-error-boundary'

// Dynamically import ThreeScene with no SSR
const ThreeScene = dynamic(() => import('@/app/components/ThreeScene'), {
  ssr: false,
  loading: () => <Loader />
})

interface CaseData {
  id: string
  name: string
  model3D: string
  image: string
}

interface PanelSelection {
  id: string
  name: string
  position: [number, number, number]
}

// Define available panels as a constant
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AVAILABLE_PANELS: PanelSelection[] = [
  { id: 'front', name: 'Front Panel', position: [0, 0, 1] },
  { id: 'side', name: 'Side Panel', position: [1, 0, 0] },
  { id: 'top', name: 'Top Panel', position: [0, 1, 0] },
]

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center text-white">
        <h3 className="text-xl font-semibold mb-2">Failed to load 3D viewer</h3>
        <p className="text-gray-400">{error.message}</p>
      </div>
    </div>
  )
}

export default function PersonalizationPage() {
  const params = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Move fetchData inside useCallback to fix dependency warning
  const fetchData = useCallback(async () => {
    try {
      const productsRef = collection(db, 'products')
      const querySnapshot = await getDocs(query(
        productsRef,
        where('slug', '==', params.id)
      ))
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data()
        console.log('Model3D URL:', data.model3D)
        
        if (!data.model3D) {
          throw new Error('No 3D model path found')
        }

        try {
          const modelResponse = await fetch(data.model3D)
          if (!modelResponse.ok) {
            throw new Error('3D model file not accessible')
          }
          console.log('3D model file is accessible')
        } catch (err) {
          console.error('Error accessing 3D model:', err)
          throw new Error('3D model file not accessible')
        }

        setCaseData({
          id: querySnapshot.docs[0].id,
          name: data.name,
          model3D: data.model3D,
          image: data.image
        })
      } else {
        setError('Case not found')
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load case data')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (params.id && user) {
      fetchData()
    }
  }, [params.id, user, fetchData])

  const handlePanelSelect = (panelId: string) => {
    setSelectedPanel(panelId)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleApplyDesign = () => {
    if (previewImage && selectedPanel) {
      setUploadedImage(previewImage)
    }
  }

  useEffect(() => {
    if (selectedPanel) {
      // Do something with selectedPanel
    }
  }, [selectedPanel])

  if (loading) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-400">{error || 'Failed to load case data'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-gray-900">
      <div className="p-4">
        {/* Panel Selection */}
        <div className="mb-4">
          {AVAILABLE_PANELS.map((panel) => (
            <button
              key={panel.id}
              onClick={() => handlePanelSelect(panel.id)}
              className={`mr-2 px-4 py-2 rounded ${
                selectedPanel === panel.id ? 'bg-blue-600' : 'bg-gray-700'
              } text-white`}
            >
              {panel.name}
            </button>
          ))}
        </div>

        {/* Image Upload */}
        <div className="mb-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="text-white"
          />
        </div>

        {/* Preview and Apply */}
        {previewImage && selectedPanel && (
          <div className="mb-4">
            <img
              src={previewImage}
              alt="Preview"
              className="w-48 h-48 object-cover rounded"
            />
            <button
              onClick={handleApplyDesign}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Apply Design
            </button>
          </div>
        )}

        {/* Display uploaded image if available */}
        {uploadedImage && (
          <div className="mb-4">
            <h3 className="text-white mb-2">Applied Design:</h3>
            <img
              src={uploadedImage}
              alt="Applied Design"
              className="w-48 h-48 object-cover rounded"
            />
          </div>
        )}
      </div>

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ThreeScene modelPath={caseData.model3D} />
      </ErrorBoundary>
    </div>
  )
} 