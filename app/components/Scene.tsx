'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import type { Object3D } from 'three'

// Dynamically import Three.js components
const Canvas = dynamic(
  () => import('@react-three/fiber').then((mod) => mod.Canvas),
  { ssr: false }
)

const Stage = dynamic(
  () => import('@react-three/drei').then((mod) => mod.Stage),
  { ssr: false }
)

const OrbitControls = dynamic(
  () => import('@react-three/drei').then((mod) => mod.OrbitControls),
  { ssr: false }
)

// Type declaration for the GLTF result
interface GLTFResult extends Object3D {
  nodes: Record<string, Object3D>
  materials: Record<string, unknown>
}

function Model({ modelPath }: { modelPath: string }) {
  // Dynamic import for useGLTF
  const { useGLTF } = require('@react-three/drei')
  const { scene } = useGLTF<GLTFResult>(modelPath)
  
  // Preload the model
  useGLTF.preload(modelPath)
  
  return <primitive object={scene} />
}

export default function Scene({ modelPath }: { modelPath: string }) {
  return (
    <Canvas>
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.6}>
          <Model modelPath={modelPath} />
        </Stage>
        <OrbitControls autoRotate />
      </Suspense>
    </Canvas>
  )
} 