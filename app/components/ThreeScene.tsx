'use client'

import React, { Suspense, useEffect, useState } from 'react'
import type { Object3D, Group } from 'three'
import type { Canvas as CanvasType } from '@react-three/fiber'
import type { OrbitControlsType } from '@react-three/drei'
import dynamic from 'next/dynamic'

interface Props {
  modelPath: string
}

interface ThreeComponents {
  Canvas: typeof CanvasType
  OrbitControls: any
  Stage: any
  useGLTF: any
}

// Dynamically import components with no SSR
const DynamicCanvas = dynamic(
  () => import('@react-three/fiber').then((mod) => mod.Canvas),
  { ssr: false }
)

const DynamicStage = dynamic(
  () => import('@react-three/drei').then((mod) => mod.Stage),
  { ssr: false }
)

const DynamicOrbitControls = dynamic(
  () => import('@react-three/drei').then((mod) => mod.OrbitControls),
  { ssr: false }
)

export default function ThreeScene({ modelPath }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loadingState, setLoadingState] = useState('initializing')
  const [gltf, setGltf] = useState<any>(null)

  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoadingState('loading-model')
        console.log('Attempting to load model from:', '/3d/Corshair4000D-3d.glb')
        
        const { useGLTF } = await import('@react-three/drei')
        const loadedGltf = await useGLTF('/3d/Corshair4000D-3d.glb')
        
        console.log('Model loaded successfully:', loadedGltf)
        setGltf(loadedGltf)
        setLoadingState('model-loaded')
      } catch (err) {
        console.error('Error loading model:', err)
        setError(`Failed to load 3D model: ${err}`)
        setLoadingState('model-error')
      }
    }

    loadModel()
  }, [])

  // Show loading states
  if (loadingState === 'initializing' || loadingState === 'loading-model') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-blue-600">
          Loading state: {loadingState}...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-red-500 p-4 bg-red-50 rounded">
          Error: {error}
        </div>
      </div>
    )
  }

  function Model() {
    if (!gltf || !gltf.scene) {
      return null
    }

    return (
      <primitive 
        object={gltf.scene} 
        scale={1.5} 
        position={[0, 0, 0]}
        onError={(e: any) => {
          console.error('Error in primitive:', e)
          setError('Failed to render model')
          setLoadingState('render-error')
        }}
      />
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
      <div 
        style={{ 
          position: 'absolute', 
          top: 10, 
          left: 10, 
          zIndex: 1000,
          background: 'rgba(255,255,255,0.8)',
          padding: '5px',
          borderRadius: '4px'
        }}
      >
        Status: {loadingState}
      </div>
      
      <DynamicCanvas
        camera={{ 
          position: [5, 5, 5],
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        style={{ 
          background: '#f0f0f0',
          width: '100%',
          height: '100%'
        }}
        onCreated={() => {
          console.log('Canvas created successfully')
          setLoadingState('canvas-ready')
        }}
      >
        <color attach="background" args={['#f0f0f0']} />
        <ambientLight intensity={1} />
        <hemisphereLight intensity={1} />
        <spotLight 
          position={[10, 10, 10]} 
          angle={0.15} 
          penumbra={1} 
          intensity={1.5}
          castShadow
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Suspense 
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="hotpink" />
            </mesh>
          }
        >
          <DynamicStage
            environment="city"
            intensity={0.6}
            adjustCamera={false}
            shadows
          >
            <Model />
          </DynamicStage>
          <DynamicOrbitControls 
            autoRotate 
            autoRotateSpeed={1}
            enableZoom={true}
            enablePan={true}
            minDistance={2}
            maxDistance={20}
            target={[0, 0, 0]}
          />
        </Suspense>
      </DynamicCanvas>
    </div>
  )
} 