'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'

function Model({ modelPath }: { modelPath: string }) {
  const gltf = useGLTF(modelPath)
  return <primitive object={gltf.scene} scale={1.5} position={[0, 0, 0]} />
}

export default function Scene({ modelPath }: { modelPath: string }) {
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
    </Canvas>
  )
} 