'use client'

import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useState } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Group } from 'three'
import { PrimitiveProps } from '@react-three/fiber'

interface SceneProps {
  modelPath: string
}

export function Scene({ modelPath }: SceneProps) {
  const [scene, setScene] = useState<Group | null>(null)
  const gltf = useLoader(GLTFLoader, modelPath)

  useEffect(() => {
    if (gltf) {
      setScene(gltf.scene)
    }
  }, [gltf])

  if (!scene) {
    return null
  }

  try {
    return (
      <primitive 
        object={scene} 
        scale={1.5} 
        position={[0, 0, 0]} 
      /> as React.ReactElement<PrimitiveProps>
    )
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
          <Scene modelPath={modelPath} />
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