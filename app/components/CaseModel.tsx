'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Loading component
function LoadingFallback() {
  return (
    <div className="w-full h-[500px] flex items-center justify-center bg-gray-50">
      <div className="text-blue-600">Loading 3D viewer...</div>
    </div>
  )
}

// Dynamic import for ThreeScene component
const ThreeScene = dynamic(
  () => import('./ThreeScene'),
  {
    ssr: false,
    loading: LoadingFallback,
  }
)

// Main component
export default function CaseModel({ modelPath }: { modelPath: string }) {
  return (
    <div className="w-full h-[500px] relative bg-gray-50 rounded-lg overflow-hidden">
      <Suspense fallback={<LoadingFallback />}>
        <ThreeScene modelPath={modelPath} />
      </Suspense>
    </div>
  )
} 