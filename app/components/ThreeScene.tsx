'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { Loader } from './Loader'

interface ThreeSceneProps {
  modelPath: string
}

export default function ThreeScene({ modelPath }: ThreeSceneProps) {
  console.log('ThreeScene component rendering with modelPath:', modelPath)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    let mounted = true
    console.log('Starting scene initialization with model:', modelPath)

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(2, 2, 2)

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 10

    // Loading cube
    const geometry = new THREE.BoxGeometry()
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    const cube = new THREE.Mesh(geometry, material)
    cube.position.set(0, 0, 0)
    scene.add(cube)

    // Model loading
    const loader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    loader.setDRACOLoader(dracoLoader)

    console.log('Loading model from:', modelPath)
    loader.load(
      modelPath,
      (gltf) => {
        if (!mounted) return
        console.log('Model loaded successfully')
        scene.remove(cube)
        
        const model = gltf.scene
        
        // Center and scale model
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 2 / maxDim
        
        model.scale.setScalar(scale)
        model.position.copy(center).multiplyScalar(-scale)

        scene.add(model)
        setIsLoading(false)
      },
      (progress) => {
        if (progress.total > 0) {
          const percentComplete = (progress.loaded / progress.total) * 100
          setLoadingProgress(percentComplete)
        }
      },
      (error) => {
        console.error('Error loading model:', error)
        setError(`Failed to load model: ${error.message}`)
        setIsLoading(false)
      }
    )

    // Animation loop
    function animate() {
      if (!mounted) return
      requestAnimationFrame(animate)
      if (cube.parent === scene) {
        cube.rotation.x += 0.01
        cube.rotation.y += 0.01
      }
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      mounted = false
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      dracoLoader.dispose()
      rendererRef.current = null
    }
  }, [modelPath])

  return (
    <div className="fixed inset-0 w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="text-center">
            <Loader />
            <p className="text-white mt-4">Loading 3D Model: {loadingProgress.toFixed(0)}%</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75">
          <div className="text-white text-center">
            <p>{error}</p>
            <p className="mt-2 text-sm opacity-75">Model URL: {modelPath}</p>
          </div>
        </div>
      )}
    </div>
  )
} 