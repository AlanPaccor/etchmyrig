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
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    let mounted = true
    console.log('Initializing Three.js scene with model:', modelPath)

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

    console.log('Starting to load model from:', modelPath)

    loader.load(
      modelPath,
      (gltf) => {
        if (!mounted) return
        console.log('Model loaded successfully:', gltf)
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

        // Update camera position
        const distance = 4
        camera.position.set(distance, distance, distance)
        controls.target.copy(new THREE.Vector3(0, 0, 0))
        controls.update()
        
        setIsLoading(false)
      },
      (progress) => {
        const percentComplete = (progress.loaded / progress.total) * 100
        console.log('Loading progress:', percentComplete.toFixed(2) + '%')
        setLoadingProgress(percentComplete)
      },
      (error) => {
        console.error('Error loading model:', error)
        setError(error.message)
        setIsLoading(false)
      }
    )

    // Animation loop
    function animate() {
      if (!mounted) return
      requestAnimationFrame(animate)
      cube.rotation.x += 0.01
      cube.rotation.y += 0.01
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      if (!mounted) return
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      mounted = false
      window.removeEventListener('resize', handleResize)
      
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement)
      }
      
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      dracoLoader.dispose()
    }
  }, [modelPath])

  return (
    <div className="relative w-full h-full">
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
            <p>Error loading model: {error}</p>
          </div>
        </div>
      )}
    </div>
  )
} 