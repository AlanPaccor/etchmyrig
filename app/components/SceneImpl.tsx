'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

interface SceneProps {
  modelPath: string
}

export default function SceneImpl({ modelPath }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(3, 2, 3)

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 10
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5
    controls.target.set(0, 0, 0)
    controls.enablePan = false

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2)
    keyLight.position.set(5, 5, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 2048
    keyLight.shadow.mapSize.height = 2048
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x9090ff, 1.2)
    fillLight.position.set(-5, 0, -5)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 1)
    rimLight.position.set(0, 5, -5)
    scene.add(rimLight)

    const extraLight = new THREE.PointLight(0xffffff, 2, 10)
    extraLight.position.set(2, 3, 2)
    scene.add(extraLight)

    const sideLightLeft = new THREE.PointLight(0xffffff, 1.5, 10)
    sideLightLeft.position.set(-5, 2, 0)
    scene.add(sideLightLeft)

    const sideLightRight = new THREE.PointLight(0xffffff, 1.5, 10)
    sideLightRight.position.set(5, 2, 0)
    scene.add(sideLightRight)

    const cameraLight = new THREE.PointLight(0xffffff, 2, 10)
    camera.add(cameraLight)
    scene.add(camera)

    // Load model
    const loader = new GLTFLoader()
    loader.load(
      modelPath,
      (gltf) => {
        scene.add(gltf.scene)
        
        // Center and scale model
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const modelCenter = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 2 / maxDim
        gltf.scene.scale.setScalar(scale)
        gltf.scene.position.copy(modelCenter).multiplyScalar(-scale)

        // Enable shadows for the model
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
            if (child.material) {
              child.material.envMapIntensity = 1
              child.material.needsUpdate = true
            }
          }
        })

        // Adjust camera to fit model
        const boundingBox = new THREE.Box3().setFromObject(gltf.scene)
        const cameraTarget = boundingBox.getCenter(new THREE.Vector3())
        controls.target.copy(cameraTarget)
        camera.position.set(
          cameraTarget.x + 3,
          cameraTarget.y + 2,
          cameraTarget.z + 3
        )
        camera.lookAt(cameraTarget)
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error)
      }
    )

    // Animation loop
    function animate() {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    function handleResize() {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const height = window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)
    handleResize()

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [modelPath])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100vh',
        background: 'linear-gradient(to bottom, #1a1a1a, #000000)',
        position: 'relative',
        overflow: 'hidden'
      }} 
    />
  )
}
