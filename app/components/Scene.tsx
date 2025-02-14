'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const SceneImpl = dynamic(() => import('./SceneImpl'), {
  ssr: false,
  loading: () => null
})

interface SceneProps {
  modelPath: string
}

export default function Scene({ modelPath }: SceneProps) {
  return (
    <Suspense fallback={null}>
      <SceneImpl modelPath={modelPath} />
    </Suspense>
  )
} 