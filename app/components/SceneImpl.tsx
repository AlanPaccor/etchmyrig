'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

interface SceneProps {
  modelPath: string
}

type PanelMesh = THREE.Mesh & {
  isPanel?: boolean
  panelType?: 'front' | 'side' | 'top'
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

// Add these constants at the top of the file for consistent effects
const HOVER_COLOR = 0x2196f3;  // Blue
const SELECTED_COLOR = 0x4caf50;  // Green
const HOVER_INTENSITY = 0.5;
const SELECTED_INTENSITY = 0.8;

// Add this debug helper at the top of the file
const DEBUG = {
  log: (...args: any[]) => {
    console.log('%c[Scene Debug]', 'color: #00ff00', ...args);
  }
};

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

export default function SceneImpl({ modelPath }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [uploading, setUploading] = useState(false)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    raycaster: THREE.Raycaster
    mouse: THREE.Vector2
    selectedPanel: PanelMesh | null
    hoveredPanel: PanelMesh | null
  }>()

  useEffect(() => {
    DEBUG.log('Scene mounting with model path:', modelPath);
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

    // Add mouse event handlers
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    sceneRef.current = {
      scene,
      camera,
      renderer,
      raycaster,
      mouse,
      selectedPanel: null,
      hoveredPanel: null
    }

    // Define functions first
    const resetPanelMaterial = (panel: PanelMesh) => {
      if (!sceneRef.current) return;
      const { scene } = sceneRef.current;  // Get scene from sceneRef

      if (panel.originalMaterial) {
        panel.material = panel.originalMaterial.clone();
      }
      
      // Remove outline effect if it exists
      if (panel.outlineEdges) {
        scene.remove(panel.outlineEdges);
        panel.outlineEdges.geometry.dispose();
        panel.outlineEdges.material.dispose();
        panel.outlineEdges = undefined;
      }

      // Remove glow effect if it exists
      if ((panel as any).glowMesh) {
        scene.remove((panel as any).glowMesh);
        (panel as any).glowMesh.geometry.dispose();
        (panel as any).glowMesh.material.dispose();
        (panel as any).glowMesh = undefined;
      }
    }

    const createOutline = (mesh: THREE.Mesh, color: number) => {
      // Create outline geometry from the mesh's geometry
      const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry);
      const edgesMaterial = new THREE.LineBasicMaterial({ 
        color: color,
        linewidth: 3,
        transparent: false,
        depthTest: false
      });
      
      const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
      
      // Copy transform from mesh to outline
      edges.position.copy(mesh.position);
      edges.rotation.copy(mesh.rotation);
      edges.scale.copy(mesh.scale);
      edges.updateMatrix();
      
      // Slightly scale up the outline to prevent z-fighting
      edges.scale.multiplyScalar(1.01);
      
      return edges;
    }

    const selectPanel = (panel: PanelMesh) => {
      if (!sceneRef.current) return;

      const { scene } = sceneRef.current;  // Get scene from sceneRef

      // Reset previous selection
      if (sceneRef.current.selectedPanel) {
        resetPanelMaterial(sceneRef.current.selectedPanel);
      }

      // Create selection material
      const selectionMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(SELECTED_COLOR),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        emissive: new THREE.Color(SELECTED_COLOR),
        emissiveIntensity: 0.8,
        shininess: 100
      });

      panel.material = selectionMaterial;

      // Create outline
      const outline = createOutline(panel, SELECTED_COLOR);
      outline.renderOrder = 1000;
      scene.add(outline);  // Now scene is properly defined
      panel.outlineEdges = outline;

      sceneRef.current.selectedPanel = panel;

      // Add glow effect
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(SELECTED_COLOR) }
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(color, intensity);
          }
        `,
        transparent: true,
        depthWrite: false
      });

      const glowMesh = new THREE.Mesh(panel.geometry.clone(), glowMaterial);
      glowMesh.position.copy(panel.position);
      glowMesh.rotation.copy(panel.rotation);
      glowMesh.scale.multiplyScalar(1.05);
      scene.add(glowMesh);  // Now scene is properly defined

      // Store reference to glow mesh for cleanup
      (panel as any).glowMesh = glowMesh;
    }

    const highlightHoveredPanel = () => {
      if (!sceneRef.current) return;

      const { scene, camera, raycaster, mouse } = sceneRef.current;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children, true);
      
      const hoveredPanel = intersects.find(intersect => {
        const obj = intersect.object as PanelMesh;
        return obj.isPanel === true;
      })?.object as PanelMesh | undefined;

      // Reset previous hover effect
      if (sceneRef.current.hoveredPanel && 
          sceneRef.current.hoveredPanel !== hoveredPanel && 
          sceneRef.current.hoveredPanel !== sceneRef.current.selectedPanel) {
        resetPanelMaterial(sceneRef.current.hoveredPanel);
      }

      // Apply hover effect to new panel
      if (hoveredPanel && 
          hoveredPanel !== sceneRef.current.hoveredPanel && 
          hoveredPanel !== sceneRef.current.selectedPanel) {
        
        // Create hover material with very obvious effect
        const hoverMaterial = new THREE.MeshPhongMaterial({
          color: new THREE.Color(HOVER_COLOR),
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthTest: true,
          depthWrite: true,
          emissive: new THREE.Color(HOVER_COLOR),
          emissiveIntensity: 0.5,
          shininess: 100
        });

        hoveredPanel.material = hoverMaterial;
        
        // Create outline
        const outline = createOutline(hoveredPanel, HOVER_COLOR);
        outline.renderOrder = 999;
        scene.add(outline);
        hoveredPanel.outlineEdges = outline;

        DEBUG.log('Hover effect applied to:', hoveredPanel.name);
      }

      sceneRef.current.hoveredPanel = hoveredPanel || null;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      mouse.x = (x / rect.width) * 2 - 1
      mouse.y = -(y / rect.height) * 2 + 1
      
      DEBUG.log('🖱️ Mouse position:', {
        screen: { x: event.clientX, y: event.clientY },
        normalized: { x: mouse.x, y: mouse.y }
      });
    }

    const handleClick = () => {
      if (sceneRef.current?.hoveredPanel) {
        selectPanel(sceneRef.current.hoveredPanel)
      }
    }

    // Animation loop
    function animate() {
      requestAnimationFrame(animate)
      controls.update()
      
      if (sceneRef.current) {
        highlightHoveredPanel()
      }
      
      renderer.render(scene, camera)
    }

    // Load model
    const loader = new GLTFLoader()
    loader.load(
      modelPath,
      (gltf: GLTF) => {
        DEBUG.log('🔵 Model loaded successfully');
        scene.add(gltf.scene)
        
        let panelCount = 0;
        
        // Process the model to identify panels
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const meshName = child.name.toLowerCase();
            const worldPosition = new THREE.Vector3();
            child.getWorldPosition(worldPosition);
            
            // Get the size of the mesh
            const boundingBox = new THREE.Box3().setFromObject(child);
            const size = boundingBox.getSize(new THREE.Vector3());
            
            DEBUG.log('📦 Analyzing mesh:', {
              name: child.name,
              position: {
                x: worldPosition.x.toFixed(3),
                y: worldPosition.y.toFixed(3),
                z: worldPosition.z.toFixed(3)
              },
              size: {
                x: size.x.toFixed(3),
                y: size.y.toFixed(3),
                z: size.z.toFixed(3)
              }
            });

            // Adjust panel detection criteria
            const isPotentialPanel = (
              // Large surface area in any dimension
              (size.x * size.y > 0.01 || size.y * size.z > 0.01 || size.x * size.z > 0.01) &&
              // Thin in at least one dimension
              (size.x < 0.1 || size.y < 0.1 || size.z < 0.1)
            );

            if (isPotentialPanel) {
              const panelMesh = child as PanelMesh;
              panelMesh.isPanel = true;
              panelCount++;

              // Store original material
              if (Array.isArray(child.material)) {
                panelMesh.originalMaterial = child.material[0].clone();
                DEBUG.log('Array material found for mesh:', child.name);
              } else {
                panelMesh.originalMaterial = child.material.clone();
              }

              // Make the panel interactive
              panelMesh.userData.isInteractive = true;

              // Determine panel type based on size and position
              if (isSidePanel(worldPosition, size)) {
                panelMesh.panelType = 'side';
              } else if (isFrontPanel(worldPosition, size)) {
                panelMesh.panelType = 'front';
              } else if (isTopPanel(worldPosition, size)) {
                panelMesh.panelType = 'top';
              }

              DEBUG.log('🎯 Panel configured:', {
                name: child.name,
                type: panelMesh.panelType,
                position: {
                  x: worldPosition.x.toFixed(3),
                  y: worldPosition.y.toFixed(3),
                  z: worldPosition.z.toFixed(3)
                },
                size: {
                  x: size.x.toFixed(3),
                  y: size.y.toFixed(3),
                  z: size.z.toFixed(3)
                }
              });
            }
          }
        })

        DEBUG.log(`✅ Total panels configured: ${panelCount}`);
        
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
      (progress) => {
        DEBUG.log('Loading progress:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
      },
      (error) => {
        DEBUG.log('❌ Error loading model:', error);
      }
    )

    // Start animation
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

    // Add event listeners
    containerRef.current.addEventListener('mousemove', (event) => {
      handleMouseMove(event);
      DEBUG.log('Mouse moved:', {
        clientX: event.clientX,
        clientY: event.clientY,
        rect: containerRef.current?.getBoundingClientRect()
      });
    })
    containerRef.current.addEventListener('click', handleClick)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement)
      }
      containerRef.current?.removeEventListener('mousemove', handleMouseMove)
      containerRef.current?.removeEventListener('click', handleClick)
    }
  }, [modelPath])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !sceneRef.current?.selectedPanel) return

    try {
      setUploading(true)
      
      // Create texture from uploaded file
      const textureLoader = new THREE.TextureLoader()
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (typeof e.target?.result === 'string') {
            textureLoader.load(
              e.target.result,
              (texture) => resolve(texture),
              undefined,
              (error) => reject(error)
            )
          }
        }
        reader.readAsDataURL(file)
      })

      // Apply texture to selected panel
      const selectedPanel = sceneRef.current.selectedPanel
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.1,
        roughness: 0.8
      })
      
      // Store original material properties
      selectedPanel.originalMaterial = material
      selectedPanel.material = material

      // Adjust texture settings
      texture.encoding = THREE.sRGBEncoding
      texture.flipY = false
      texture.needsUpdate = true

    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

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
    >
      {/* Upload Button Overlay */}
      <div className="absolute top-4 right-4 z-10">
        <label 
          className={`
            inline-flex items-center px-4 py-2 
            bg-blue-600 hover:bg-blue-700 
            text-white font-medium rounded-lg
            transition-colors duration-200
            cursor-pointer
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {uploading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </span>
          ) : (
            <>
              <svg 
                className="w-5 h-5 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                >
                </path>
              </svg>
              Upload Design
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept=".png,.jpg,.jpeg"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  )
}
