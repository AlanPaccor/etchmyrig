'use client'

import { Suspense, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader } from './Loader'

// Dynamically import Three.js components
const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => <Loader />
})

interface CaseModelProps {
  modelPath: string
}

export default function CaseModel({ modelPath }: CaseModelProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Loader />
  }

  return (
    <div className="w-full h-[500px] relative bg-gray-50 rounded-lg overflow-hidden">
      <Suspense fallback={<Loader />}>
        <Scene modelPath={modelPath} />
      </Suspense>
    </div>
  )
} 