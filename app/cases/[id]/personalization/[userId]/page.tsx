'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { Loader } from '@/app/components/Loader'
import dynamic from 'next/dynamic'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/app/lib/firebase'
import { ErrorBoundary } from 'react-error-boundary'

// Dynamically import Scene with no SSR
const Scene = dynamic(() => import('@/app/components/Scene'), {
  ssr: false,
  loading: () => <Loader />
})

interface CaseData {
  id: string
  name: string
  model3D: string
  image: string
}

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

  const fetchData = async () => {
    try {
      const productsRef = collection(db, 'products')
      const querySnapshot = await getDocs(query(
        productsRef,
        where('slug', '==', params.id)
      ))
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data()
        
        setCaseData({
          id: querySnapshot.docs[0].id,
          name: data.name,
          model3D: '/3d/Corsair4000D-3D.glb',  // Using local path
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
  }

  useEffect(() => {
    if (params.id && user) {
      fetchData()
    }
  }, [params.id, user])

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
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Scene modelPath={caseData.model3D} />
      </ErrorBoundary>
    </div>
  )
} 