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
const HOVER_OPACITY = 1.0;        // Fully opaque
const SELECTED_OPACITY = 1.0;     // Fully opaque

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);  // Increased intensity
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);  // Increased intensity
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

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
      if (!panel.originalMaterial) {
        DEBUG.log('No original material found for panel:', panel.name);
        return;
      }
      
      // Remove outline if it exists
      if (panel.outlineEdges) {
        panel.remove(panel.outlineEdges);
        panel.outlineEdges = undefined;
      }
      
      // Properly dispose of current material
      if (Array.isArray(panel.material)) {
        panel.material.forEach(m => m.dispose());
      } else {
        panel.material.dispose();
      }
      
      // Apply original material
      panel.material = panel.originalMaterial.clone();
      panel.material.needsUpdate = true;
      
      DEBUG.log('Reset material for panel:', panel.name);
    }

    const createHoverEffect = (panel: PanelMesh) => {
      // Create a more visible hover material
      const hoverMaterial = new THREE.MeshPhongMaterial({
        color: HOVER_COLOR,
        emissive: HOVER_COLOR,
        emissiveIntensity: 1,
        specular: 0xffffff,
        shininess: 100,
        transparent: false,  // Changed to false for full opacity
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true
      });

      // Create a glowing outline effect
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: HOVER_COLOR,
        side: THREE.BackSide,  // Render on back side
      });

      // Create outline mesh
      const outlineMesh = new THREE.Mesh(
        panel.geometry.clone(),
        outlineMaterial
      );
      outlineMesh.scale.multiplyScalar(1.05);  // Make outline slightly larger
      panel.add(outlineMesh);
      
      // Store outline for later removal
      panel.outlineEdges = outlineMesh as any;

      // Apply the hover material
      if (Array.isArray(panel.material)) {
        panel.material.forEach(m => m.dispose());
        panel.material = hoverMaterial;
      } else {
        panel.material.dispose();
        panel.material = hoverMaterial;
      }
      
      panel.material.needsUpdate = true;
      DEBUG.log('Applied enhanced hover effect');
    }

    const selectPanel = (panel: PanelMesh) => {
      if (!sceneRef.current) return;

      // Reset previous selection
      if (sceneRef.current.selectedPanel && sceneRef.current.selectedPanel !== panel) {
        resetPanelMaterial(sceneRef.current.selectedPanel);
      }

      // Create selection material
      const selectionMaterial = new THREE.MeshStandardMaterial({
        color: SELECTED_COLOR,
        emissive: SELECTED_COLOR,
        emissiveIntensity: 1,
        metalness: 0.1,
        roughness: 0.3,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });

      // Apply selection material
      if (Array.isArray(panel.material)) {
        panel.material.forEach(m => m.dispose());
        panel.material = selectionMaterial;
      } else {
        panel.material.dispose();
        panel.material = selectionMaterial;
      }

      panel.material.needsUpdate = true;
      sceneRef.current.selectedPanel = panel;
      
      DEBUG.log('Panel selected:', panel.name);
    }

    const highlightHoveredPanel = () => {
      if (!sceneRef.current) return;

      const { scene, camera, raycaster, mouse, selectedPanel } = sceneRef.current;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children, true);
      
      // Log all intersections for debugging
      DEBUG.log('All intersections:', intersects.map(int => ({
        name: int.object.name,
        isPanel: int.object.userData.isPanel,
        type: int.object.userData.panelType
      })));

      const hoveredPanel = intersects.find(intersect => 
        intersect.object.userData.isPanel === true
      )?.object as PanelMesh | undefined;

      if (hoveredPanel) {
        DEBUG.log('Found hoverable panel:', {
          name: hoveredPanel.name,
          type: hoveredPanel.panelType,
          hasOriginalMaterial: !!hoveredPanel.originalMaterial
        });
      }

      // Only update if we're hovering over a different panel
      if (hoveredPanel !== sceneRef.current.hoveredPanel) {
        // Reset previous hover effect if it exists and isn't selected
        if (sceneRef.current.hoveredPanel && 
            sceneRef.current.hoveredPanel !== selectedPanel) {
          resetPanelMaterial(sceneRef.current.hoveredPanel);
        }

        // Apply hover effect to new panel if it isn't selected
        if (hoveredPanel && hoveredPanel !== selectedPanel) {
          const hoverMaterial = new THREE.MeshStandardMaterial({
            color: HOVER_COLOR,
            emissive: HOVER_COLOR,
            emissiveIntensity: 1,
            metalness: 0.1,
            roughness: 0.3,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
          });

          // Store current material as original if not already stored
          if (!hoveredPanel.originalMaterial) {
            hoveredPanel.originalMaterial = Array.isArray(hoveredPanel.material)
              ? hoveredPanel.material[0].clone()
              : hoveredPanel.material.clone();
          }

          // Apply hover material
          if (Array.isArray(hoveredPanel.material)) {
            hoveredPanel.material.forEach(m => m.dispose());
            hoveredPanel.material = hoverMaterial;
          } else {
            hoveredPanel.material.dispose();
            hoveredPanel.material = hoverMaterial;
          }
          
          hoveredPanel.material.needsUpdate = true;
          DEBUG.log('Applied hover effect to:', hoveredPanel.name);
        }

        sceneRef.current.hoveredPanel = hoveredPanel || null;
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      if (sceneRef.current) {
        sceneRef.current.mouse.x = (x / rect.width) * 2 - 1
        sceneRef.current.mouse.y = -(y / rect.height) * 2 + 1
      }
    }

    const handleClick = () => {
      if (!sceneRef.current) return;

      const { scene } = sceneRef.current;

      // Find the model
      const model = scene.children[0];
      if (!model) {
        DEBUG.log('No model found in scene');
        return;
      }

      // Create a bright red overlay material
      const overlayMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthTest: false  // This ensures it renders on top
      });

      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          // Create an overlay mesh using the same geometry
          const overlayMesh = new THREE.Mesh(
            object.geometry.clone(),
            overlayMaterial
          );

          // Copy the transform
          overlayMesh.position.copy(object.position);
          overlayMesh.rotation.copy(object.rotation);
          overlayMesh.scale.copy(object.scale);
          overlayMesh.matrix.copy(object.matrix);
          overlayMesh.matrixWorld.copy(object.matrixWorld);

          // Add the overlay as a child of the original mesh
          object.add(overlayMesh);
          
          DEBUG.log('Added overlay to:', object.name);
        }
      });

      // Force renderer update
      if (sceneRef.current.renderer) {
        sceneRef.current.renderer.render(scene, sceneRef.current.camera);
      }

      DEBUG.log('Added overlays to model');
    }

    // Update the animation loop to reduce hover checks
    let lastMouseX = 0;
    let lastMouseY = 0;

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      
      if (sceneRef.current) {
        const { mouse } = sceneRef.current;
        // Only check for hover if mouse position has changed
        if (mouse.x !== lastMouseX || mouse.y !== lastMouseY) {
          highlightHoveredPanel();
          lastMouseX = mouse.x;
          lastMouseY = mouse.y;
        }
      }
      
      renderer.render(scene, camera);
    }

    // Load model
    const loader = new GLTFLoader()
    loader.load(
      modelPath,
      (gltf: GLTF) => {
        DEBUG.log('🔵 Model loaded successfully');
        
        // Enable shadows and update materials for the model
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.envMapIntensity = 1;
              child.material.needsUpdate = true;
            }
          }
        });

        scene.add(gltf.scene);
        
        let panelCount = 0;
        
        // Find our panel collections with more detailed logging
        gltf.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            DEBUG.log('Found mesh:', {
              name: object.name,
              parent: object.parent?.name,
              geometry: object.geometry.type,
              material: object.material ? 'yes' : 'no'
            });
          }
        });

        // First find the panel collections
        let backPanelCollection: THREE.Object3D | null = null;
        let glassPanelCollection: THREE.Object3D | null = null;
        
        // Debug the scene structure first
        DEBUG.log('Scene structure:');
        gltf.scene.traverse((object) => {
          DEBUG.log(`- ${object.name} (${object.type})`);
        });

        // Find our panel collections
        gltf.scene.traverse((object) => {
          const name = object.name.toLowerCase();
          if (name.includes('backpanel')) {
            backPanelCollection = object;
            DEBUG.log('Found BackPanel collection:', object.name);
          }
          if (name.includes('glasspanel')) {
            glassPanelCollection = object;
            DEBUG.log('Found GlassPanel collection:', object.name);
          }
        });

        // Process panels within collections
        const processCollection = (collection: THREE.Object3D | null, type: 'back' | 'glass') => {
          if (!collection) {
            DEBUG.log(`⚠️ No ${type} panel collection found`);
            return;
          }
          
          collection.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              DEBUG.log(`Processing ${type} panel mesh:`, child.name);
              
              // Store original material BEFORE setting userData
              const originalMaterial = Array.isArray(child.material) 
                ? child.material[0].clone() 
                : child.material.clone();
              
              // Store panel properties in userData
              child.userData.isPanel = true;
              child.userData.panelType = type;
              
              // Store as PanelMesh properties
              const panelMesh = child as PanelMesh;
              panelMesh.isPanel = true;
              panelMesh.panelType = type;
              panelMesh.originalMaterial = originalMaterial;

              DEBUG.log('✅ Panel configured:', {
                name: child.name,
                type: type,
                hasMaterial: !!panelMesh.originalMaterial
              });

              panelCount++;
            }
          });
        };

        // Process both collections
        processCollection(backPanelCollection, 'back');
        processCollection(glassPanelCollection, 'glass');

        DEBUG.log(`Total panels configured: ${panelCount}`);
        
        // Center and scale model
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const modelCenter = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 2 / maxDim
        gltf.scene.scale.setScalar(scale)
        gltf.scene.position.copy(modelCenter).multiplyScalar(-scale)

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
