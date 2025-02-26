'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const SceneImpl = dynamic(() => import('./SceneImpl'), {
  ssr: false,
  loading: () => null
})

interface SceneProps {
  modelPath: string
  designData?: {
    panels: Array<{
      panelType: 'back' | 'glass'
      imageUrl?: string
      position: { x: number, y: number }
      scale: { width: number, height: number }
      rotation: number
    }>
  }
}

export default function Scene({ modelPath, designData }: SceneProps) {
  return (
    <Suspense fallback={null}>
      <SceneImpl modelPath={modelPath} designData={designData} />
    </Suspense>
  )
} 