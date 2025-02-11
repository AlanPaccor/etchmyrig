'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'
import { Suspense, useState, useEffect } from 'react'

function Model({ modelPath }: { modelPath: string }) {
  const [error, setError] = useState<string | null>(null)

  try {
    // Use the proxy route instead of direct Firebase URL
    const proxyPath = `/api/model?url=${encodeURIComponent(modelPath)}`
    const { scene } = useGLTF(proxyPath)
    return <primitive object={scene} scale={1.5} position={[0, 0, 0]} />
  } catch (err) {
    setError((err as Error).message)
    return null
  }
}

export default function Scene({ modelPath }: { modelPath: string }) {
  const [error, setError] = useState<string | null>(null)

  if (error) {
    return <div className="text-red-500">Error loading model: {error}</div>
  }

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