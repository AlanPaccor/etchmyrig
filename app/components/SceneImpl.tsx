'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

interface SceneProps {
  modelPath: string
  designData?: {
    panels: Array<{
      panelType: 'back' | 'glass'
      imageUrl?: string
      position: { x: number, y: number }
      scale: { width: number, height: number }
      rotation: number
    }>
  }
}

type PanelMesh = THREE.Mesh & {
  isPanel?: boolean
  panelType?: 'back' | 'glass' | 'other'  // Updated panel types
  originalMaterial?: THREE.Material
  outlineEdges?: THREE.LineSegments
}

interface GLTF {
  scene: THREE.Group
  scenes: THREE.Group[]
  cameras: THREE.Camera[]
  animations: THREE.AnimationClip[]
  asset: {
    version: string;
    generator: string;
  }
}

// Update the constants at the top of the file
const HOVER_COLOR = 0x00ffff;    // Bright cyan - more visible
const SELECTED_COLOR = 0xff0000;  // Bright red
const HOVER_OPACITY = 0.5;
const SELECTED_OPACITY = 0.7;

// Add these helper functions at the top
const isSidePanel = (position: THREE.Vector3, size: THREE.Vector3): boolean => {
  // Side panels are tall (y) and deep (z) but thin in width (x)
  return size.y > 0.1 && size.z > 0.1 && size.x < 0.1;
}

const isFrontPanel = (position: THREE.Vector3, size: THREE.Vector3): boolean => {
  // Front panel is tall (y) and wide (x) but thin in depth (z)
  return size.y > 0.1 && size.x > 0.1 && size.z < 0.1;
}

const isTopPanel = (position: THREE.Vector3, size: THREE.Vector3): boolean => {
  // Top panel is wide (x) and deep (z) but thin in height (y)
  return size.x > 0.1 && size.z > 0.1 && size.y < 0.1;
}

export default function SceneImpl({ modelPath, designData }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sceneInitialized, setSceneInitialized] = useState(false)
  
  // Store scene objects in refs
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  // Store panel references
  const backPanelRef = useRef<THREE.Mesh | null>(null)
  const glassPanelRef = useRef<THREE.Mesh | null>(null)

  // Initialize the scene
  useEffect(() => {
    if (!containerRef.current) return
    
    console.log("Setting up Three.js scene")
    
    // Create scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)
    sceneRef.current = scene
    
    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth
    const containerHeight = containerRef.current.clientHeight
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerWidth / containerHeight,
      0.1,
      1000
    )
    camera.position.set(3, 2, 3)
    cameraRef.current = camera
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    })
    renderer.setSize(containerWidth, containerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 2)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)
    
    const backLight = new THREE.DirectionalLight(0xffffff, 1)
    backLight.position.set(-5, -5, -5)
    scene.add(backLight)
    
    // Add a point light near the camera
    const pointLight = new THREE.PointLight(0xffffff, 1)
    camera.add(pointLight)
    scene.add(camera)
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 1.5
    controls.maxDistance = 10
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5
    controls.target.set(0, 0, 0)
    controls.enablePan = false
    controls.enableZoom = true
    controls.enableRotate = true
    controlsRef.current = controls
    
    // Animation function
    const animate = () => {
      if (!controlsRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return
      
      animationFrameRef.current = requestAnimationFrame(animate)
      controlsRef.current.update()
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }
    
    // Load the model
    const loader = new GLTFLoader()
    console.log('Loading model from path:', modelPath)
    
    loader.load(
      modelPath,
      (gltf) => {
        scene.add(gltf.scene)
        
        // Find panels in the model
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            console.log(`Found mesh: ${child.name}`)
            
            // For the Corsair 4000D model specifically
            if (child.name === 'Object_44001' || child.name.includes('back') || child.name.includes('Back')) {
              console.log('Found back panel:', child.name)
              child.userData.isPanel = true
              child.userData.panelType = 'back'
              backPanelRef.current = child
            } 
            else if (child.name === 'Object_42' || child.name === 'Object_43' || 
                    child.name.includes('glass') || child.name.includes('Glass')) {
              console.log('Found glass panel:', child.name)
              child.userData.isPanel = true
              child.userData.panelType = 'glass'
              glassPanelRef.current = child
            }
          }
        })
        
        // Center and scale model
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const modelCenter = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 2 / maxDim
        gltf.scene.scale.setScalar(scale)
        
        // Center the model
        gltf.scene.position.x = -modelCenter.x * scale
        gltf.scene.position.y = -modelCenter.y * scale
        gltf.scene.position.z = -modelCenter.z * scale
        
        // Adjust camera to fit model
        const boundingBox = new THREE.Box3().setFromObject(gltf.scene)
        const cameraTarget = boundingBox.getCenter(new THREE.Vector3())
        controls.target.copy(cameraTarget)
        
        // Position camera to get a good view
        camera.position.set(
          cameraTarget.x + 2,
          cameraTarget.y + 1.5,
          cameraTarget.z + 2
        )
        camera.lookAt(cameraTarget)
        
        // Force a render
        renderer.render(scene, camera)
        
        // Mark scene as initialized
        setSceneInitialized(true)
        
        console.log('Model loaded successfully')
      },
      (progress) => {
        console.log(`Loading progress: ${Math.round(progress.loaded / progress.total * 100)}%`)
      },
      (error) => {
        console.error('Error loading model:', error)
      }
    )
    
    // Start animation
    animate()
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
      
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      
      rendererRef.current.setSize(width, height)
    }
    
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => {
      console.log('Cleaning up Three.js scene')
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose()
        
        if (containerRef.current?.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement)
        }
      }
      
      window.removeEventListener('resize', handleResize)
    }
  }, [modelPath])

  // Function to apply design texture
  const applyDesignTexture = (
    panelType: 'back' | 'glass', 
    imageUrl: string,
    position = { x: 50, y: 50 },
    scale = { width: 100, height: 100 },
    rotation = 0
  ) => {
    console.log(`Applying texture to ${panelType} panel:`, {
      imageUrl,
      position,
      scale,
      rotation
    })
    
    // Get the target panel
    const targetPanel = panelType === 'back' ? backPanelRef.current : glassPanelRef.current
    
    if (!targetPanel) {
      console.error(`No ${panelType} panel found to apply texture`)
      return
    }
    
    console.log(`Found ${panelType} panel:`, targetPanel.name)
    
    // Handle CORS issues by creating a local canvas with the image
    const img = new Image()
    img.crossOrigin = "anonymous"
    
    img.onload = () => {
      console.log('Image loaded successfully')
      
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw image to canvas
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas)
        
        // Apply texture transformations
        texture.center.set(0.5, 0.5)
        texture.repeat.set(scale.width/100, scale.height/100)
        texture.rotation = rotation * Math.PI / 180
        texture.offset.set((position.x - 50)/100, (position.y - 50)/100)
        
        // Create a material appropriate for the panel type
        let material
        
        if (panelType === 'back') {
          // For back panel (metal) - use a material that shows the texture clearly
          material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.7,
            roughness: 0.3,
            color: 0xffffff,
            side: THREE.DoubleSide
          })
        } else {
          // For glass panel - use a transparent material
          material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
          })
        }
        
        // Store original material if needed
        if (!targetPanel.userData.originalMaterial) {
          targetPanel.userData.originalMaterial = targetPanel.material
        }
        
        // Apply to panel
        targetPanel.material = material
        
        // Force a render update
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current)
          console.log('Texture applied and rendered')
        }
      }
    }
    
    img.onerror = (err) => {
      console.error('Error loading image:', err)
      
      // Use a simple colored material as fallback
      const material = new THREE.MeshBasicMaterial({
        color: panelType === 'back' ? 0xff0000 : 0x0000ff,
        wireframe: true,
        side: THREE.DoubleSide
      })
      
      // Apply to panel
      targetPanel.material = material
      
      // Force a render update
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    
    // Set the source to trigger loading
    img.src = imageUrl
  }

  // Make the applyDesignTexture function available globally
  useEffect(() => {
    if (window) {
      (window as any).applyDesignTexture = applyDesignTexture
    }
  }, [])

  // Apply design data when component mounts or changes
  useEffect(() => {
    if (!sceneInitialized || !designData) return
    
    console.log('Design data received:', designData)
    
    // Wait a bit for the model to fully load before applying textures
    const timer = setTimeout(() => {
      designData.panels.forEach(panel => {
        if (panel.imageUrl) {
          console.log(`Applying design for ${panel.panelType} panel:`, panel)
          applyDesignTexture(
            panel.panelType, 
            panel.imageUrl,
            panel.position,
            panel.scale,
            panel.rotation
          )
        }
      })
    }, 1000) // Wait 1 second to ensure model is loaded
    
    return () => clearTimeout(timer)
  }, [designData, sceneInitialized])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        background: 'linear-gradient(to bottom, #1a1a1a, #000000)',
        position: 'relative',
        overflow: 'hidden'
      }} 
    >
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <button 
          onClick={() => {
            // Use a custom event to communicate with the parent component
            if (window) {
              const event = new CustomEvent('backToDesign')
              window.dispatchEvent(event)
            }
          }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-lg flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Design
        </button>
      </div>
      
      {/* Enhanced Debug Panel */}
      <div className="absolute top-4 right-4 z-10 bg-gray-800 p-4 rounded-lg shadow-lg text-white">
        <h3 className="text-lg font-bold mb-2">Debug Tools</h3>
        
        <div className="space-y-2">
          <button 
            onClick={() => {
              // Apply a bright red material to the back panel
              if (sceneRef.current) {
                sceneRef.current.traverse((child) => {
                  if (child instanceof THREE.Mesh && 
                      (child.name === 'Object_44001' || 
                       (child.userData.isPanel && child.userData.panelType === 'back'))) {
                    child.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    
                    // Force a render
                    if (rendererRef.current) {
                      rendererRef.current.render(sceneRef.current, cameraRef.current);
                    }
                  }
                });
              }
            }}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Red Back Panel
          </button>
          
          <button 
            onClick={() => {
              // Apply a bright blue material to the glass panel
              if (sceneRef.current) {
                sceneRef.current.traverse((child) => {
                  if (child instanceof THREE.Mesh && 
                      ((child.name === 'Object_42' || child.name === 'Object_43') || 
                       (child.userData.isPanel && child.userData.panelType === 'glass'))) {
                    child.material = new THREE.MeshBasicMaterial({ 
                      color: 0x00aaff,
                      transparent: true,
                      opacity: 0.7
                    });
                    
                    // Force a render
                    if (rendererRef.current) {
                      rendererRef.current.render(sceneRef.current, cameraRef.current);
                    }
                  }
                });
              }
            }}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Blue Glass Panel
          </button>
          
          <button 
            onClick={() => {
              // List all meshes in the console
              if (sceneRef.current) {
                console.log("All meshes in the scene:");
                sceneRef.current.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    console.log(`Mesh: ${child.name}`, child);
                  }
                });
              }
            }}
            className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
          >
            List All Meshes
          </button>
          
          <button 
            onClick={() => {
              // Apply the custom design with canvas
              applyDesignTexture('back', 'test', {x: 50, y: 50}, {width: 100, height: 100}, 0);
              applyDesignTexture('glass', 'test', {x: 50, y: 50}, {width: 100, height: 100}, 0);
            }}
            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
          >
            Apply Canvas Design
          </button>
          
          <button 
            onClick={() => {
              // Add a simple cube to the scene
              if (sceneRef.current) {
                const cube = new THREE.Mesh(
                  new THREE.BoxGeometry(0.5, 0.5, 0.5),
                  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
                );
                cube.position.set(0, 1, 0);
                sceneRef.current.add(cube);
                
                // Force a render
                if (rendererRef.current) {
                  rendererRef.current.render(sceneRef.current, cameraRef.current);
                }
                console.log("Test cube added");
              }
            }}
            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
          >
            Add Test Cube
          </button>
          
          <button 
            onClick={() => {
              // Move the camera to a different position
              if (sceneRef.current) {
                sceneRef.current.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    child.position.set(-3, 2, 3);
                  }
                });
                
                // Force a render
                if (rendererRef.current) {
                  rendererRef.current.render(sceneRef.current, cameraRef.current);
                }
                console.log("Camera moved");
              }
            }}
            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
          >
            Move Camera
          </button>
        </div>
      </div>
    </div>
  )
}
