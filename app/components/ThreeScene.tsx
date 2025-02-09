'use client'

import { Suspense, useEffect, useState } from 'react'
import type { Object3D, Group } from 'three'
import type { Canvas as CanvasType } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls'

interface Props {
  modelPath: string
}

interface ThreeComponents {
  Canvas: typeof CanvasType
  OrbitControls: typeof OrbitControlsType
  Stage: any
  useGLTF: any
}

export default function ThreeScene({ modelPath }: Props) {
  const [components, setComponents] = useState<ThreeComponents | null>(null)

  useEffect(() => {
    const loadComponents = async () => {
      const [fiber, drei] = await Promise.all([
        import('@react-three/fiber'),
        import('@react-three/drei')
      ])

      setComponents({
        Canvas: fiber.Canvas,
        OrbitControls: drei.OrbitControls,
        Stage: drei.Stage,
        useGLTF: drei.useGLTF
      })
    }

    loadComponents()
  }, [])

  if (!components) {
    return null
  }

  const { Canvas, OrbitControls, Stage, useGLTF } = components

  function Model() {
    const gltf = useGLTF(modelPath)
    useGLTF.preload(modelPath)
    return <primitive object={gltf.scene} scale={2} />
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ background: '#f0f0f0' }}
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6}>
            <Model />
          </Stage>
          <OrbitControls 
            autoRotate 
            enableZoom={true}
            enablePan={true}
            minDistance={5}
            maxDistance={20}
          />
        </Suspense>
      </Canvas>
    </div>
  )
} 