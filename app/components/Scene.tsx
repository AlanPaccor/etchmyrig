'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'
import { Suspense } from 'react'
import { Object3D } from 'three'
import { PrimitiveProps } from '@react-three/fiber'

// Add Three.js element types to JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: PrimitiveProps
      ambientLight: any
      hemisphereLight: any
      spotLight: any
      pointLight: any
    }
  }
}

interface SceneProps {
  modelPath: string
}

function Model({ modelPath }: SceneProps) {
  const { scene } = useGLTF(`/api/model?url=${encodeURIComponent(modelPath)}`)

  try {
    return <primitive 
      object={scene as unknown as Object3D} 
      scale={1.5} 
      position={[0, 0, 0]} 
    />
  } catch (err) {
    console.error('Error rendering model:', err)
    return null
  }
}

export default function Scene({ modelPath }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [5, 5, 5], fov: 75 }}
      style={{ background: '#f0f0f0' }}
    >
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
      
      <Suspense fallback={null}>
        <Stage
          environment="city"
          intensity={0.6}
          adjustCamera={false}
          shadows
        >
          <Model modelPath={modelPath} />
        </Stage>
        <OrbitControls 
          autoRotate 
          autoRotateSpeed={1}
          enableZoom={true}
          enablePan={true}
          minDistance={2}
          maxDistance={20}
          target={[0, 0, 0]}
        />
      </Suspense>
    </Canvas>
  )
}

// Preload the model to prevent loading issues
useGLTF.preload('/api/model') 