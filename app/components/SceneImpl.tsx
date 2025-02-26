'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

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
const HOVER_COLOR = 0x00ff00;    // Bright green
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
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth
    const containerHeight = containerRef.current.clientHeight

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      containerWidth / containerHeight,
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
    renderer.setSize(containerWidth, containerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)

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

    // Simplified reference object - no hover/selection tracking
    sceneRef.current = {
      scene,
      camera,
      renderer,
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      selectedPanel: null,
      hoveredPanel: null
    }

    // Animation function - just update controls and render
    function animate() {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }

    // Load the model
    const loader = new GLTFLoader()
    loader.load(
      modelPath,
      (gltf) => {
        scene.add(gltf.scene)
        
        // Find panels in the model - simplified, no debug logs
        let panelCount = 0
        
        // Collections for different panel types
        const backPanelCollection: THREE.Mesh[] = []
        const glassPanelCollection: THREE.Mesh[] = []
        
        // Find all meshes that could be panels
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // For this example, we'll identify panels by their geometry
            const box = new THREE.Box3().setFromObject(child)
            const size = box.getSize(new THREE.Vector3())
            const position = box.getCenter(new THREE.Vector3())
            
            // Check if it's a back panel (usually flat and at the back)
            if (position.z < -0.5 && isFrontPanel(position, size)) {
              backPanelCollection.push(child)
            }
            
            // Check if it's a glass panel (usually flat and at the front)
            if (position.z > 0.5 && isFrontPanel(position, size)) {
              glassPanelCollection.push(child)
            }
          }
        })
        
        // Process a collection of panels
        const processCollection = (collection: THREE.Mesh[], panelType: 'back' | 'glass') => {
          if (collection.length === 0) {
            // If no panels found by geometry, use a fallback
            gltf.scene.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                // For demo, mark a specific mesh as a panel
                if (panelType === 'back' && child.name === 'Object_44001') {
                  (child as PanelMesh).userData.isPanel = true;
                  (child as PanelMesh).userData.panelType = 'back';
                  panelCount++;
                } else if (panelType === 'glass' && (child.name === 'Object_42' || child.name === 'Object_43')) {
                  (child as PanelMesh).userData.isPanel = true;
                  (child as PanelMesh).userData.panelType = 'glass';
                  panelCount++;
                }
              }
            });
            return;
          }
          
          // Mark all meshes in the collection as panels
          collection.forEach((mesh) => {
            (mesh as PanelMesh).userData.isPanel = true;
            (mesh as PanelMesh).userData.panelType = panelType;
            panelCount++;
          });
        }
        
        // Process both collections
        processCollection(backPanelCollection, 'back')
        processCollection(glassPanelCollection, 'glass')
        
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
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error)
      }
    )
    
    // Start animation
    animate()
    
    // Handle resize
    function handleResize() {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !sceneRef.current) return

    try {
      setUploading(true)
      
      // Find the BackPanel mesh
      let backPanel: PanelMesh | null = null;
      sceneRef.current.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && 
            child.userData.isPanel && 
            child.userData.panelType === 'back') {
          backPanel = child as PanelMesh;
        }
      });

      if (!backPanel) return;

      // Create a simple URL for the image
      const url = URL.createObjectURL(file);
      
      // Load the texture directly
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(url, (texture) => {
        // Create the simplest possible material
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide
        });

        // Apply it directly to the mesh
        backPanel.material = material;
        
        // Clean up
        URL.revokeObjectURL(url);
      });

    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  }

  const changeColorToBlue = () => {
    if (!sceneRef.current) return;
    
    // Create a super bright blue material
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,  // Cyan
      side: THREE.DoubleSide,
    });

    // Apply to all meshes
    sceneRef.current.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Store original material if we haven't already
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
        }
        
        // Apply new material
        child.material = material;
      }
    });

    // Force render
    sceneRef.current.renderer.render(
      sceneRef.current.scene,
      sceneRef.current.camera
    );
  }

  // Update the applyDesignTexture method to handle CORS issues
  const applyDesignTexture = (
    panelType: 'back' | 'glass', 
    imageUrl: string,
    position = { x: 50, y: 50 },
    scale = { width: 100, height: 100 },
    rotation = 0
  ) => {
    if (!sceneRef.current) {
      console.error('Scene reference not available');
      return;
    }
    
    console.log(`Applying texture to ${panelType} panel:`, {
      imageUrl,
      position,
      scale,
      rotation
    });
    
    // Find all meshes in the scene
    const allMeshes: THREE.Mesh[] = [];
    sceneRef.current.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        allMeshes.push(child);
      }
    });
    
    // Try to find the panel by name first (most reliable)
    let targetPanel: THREE.Mesh | null = null;
    
    // For the Corsair 4000D model specifically
    if (panelType === 'back') {
      // Try specific object names for back panel
      targetPanel = allMeshes.find(mesh => 
        mesh.name === 'Object_44001' || 
        mesh.name === 'BackPanel' || 
        mesh.name.includes('back')
      ) || null;
    } else if (panelType === 'glass') {
      // Try specific object names for glass panel
      targetPanel = allMeshes.find(mesh => 
        mesh.name === 'Object_42' || 
        mesh.name === 'Object_43' || 
        mesh.name === 'GlassPanel' || 
        mesh.name.includes('glass')
      ) || null;
    }
    
    // If not found by name, try by userData
    if (!targetPanel) {
      targetPanel = allMeshes.find(mesh => 
        mesh.userData.isPanel && 
        mesh.userData.panelType === panelType
      ) || null;
    }
    
    // If still not found, try by position and size
    if (!targetPanel) {
      for (const mesh of allMeshes) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const position = box.getCenter(new THREE.Vector3());
        
        if (panelType === 'back' && position.z < -0.5 && isFrontPanel(position, size)) {
          targetPanel = mesh;
          break;
        } else if (panelType === 'glass' && position.z > 0.5 && isFrontPanel(position, size)) {
          targetPanel = mesh;
          break;
        }
      }
    }
    
    if (!targetPanel) {
      console.error(`No ${panelType} panel found to apply texture`);
      return;
    }
    
    console.log(`Found ${panelType} panel:`, targetPanel.name);
    
    // Handle CORS issues by creating a local canvas with the image
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    // Create a canvas to draw the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image to canvas
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Apply texture transformations
        texture.center.set(0.5, 0.5);
        texture.repeat.set(scale.width/100, scale.height/100);
        texture.rotation = rotation * Math.PI / 180;
        texture.offset.set((position.x - 50)/100, (position.y - 50)/100);
        
        // Create a material appropriate for the panel type
        let material;
        
        if (panelType === 'back') {
          // For back panel (metal) - use a material that shows the texture clearly
          material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.7,
            roughness: 0.3,
            color: 0xffffff,
            side: THREE.DoubleSide
          });
        } else {
          // For glass panel - use a transparent material
          material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
          });
        }
        
        // Store original material if needed
        if (!targetPanel.userData.originalMaterial) {
          targetPanel.userData.originalMaterial = targetPanel.material;
        }
        
        // Apply to panel
        targetPanel.material = material;
        
        // Force a render update
        if (sceneRef.current?.renderer) {
          sceneRef.current.renderer.render(
            sceneRef.current.scene,
            sceneRef.current.camera
          );
          
          console.log('Texture applied and rendered');
        }
      }
    };
    
    img.onerror = (err) => {
      console.error('Error loading image:', err);
      
      // Try an alternative approach - use a proxy or convert to data URL
      console.log('Trying alternative approach for image loading...');
      
      // For Firebase Storage URLs, we can try using a proxy or a different approach
      if (imageUrl.includes('firebasestorage.googleapis.com')) {
        // Option 1: Try using a local image as a fallback
        const fallbackImage = '/placeholder-image.png';
        console.log('Using fallback image:', fallbackImage);
        
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          fallbackImage,
          (texture) => {
            // Create a simple material with the texture
            const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              side: THREE.DoubleSide
            });
            
            // Apply to panel
            targetPanel.material = material;
            
            // Force a render update
            if (sceneRef.current?.renderer) {
              sceneRef.current.renderer.render(
                sceneRef.current.scene,
                sceneRef.current.camera
              );
            }
          }
        );
      }
    };
    
    // Set the source to trigger loading
    img.src = imageUrl;
  }

  // Update the useEffect to apply design data when component mounts or changes
  useEffect(() => {
    if (window) {
      (window as any).applyDesignTexture = applyDesignTexture;
    }
    
    // Apply design data if provided
    if (designData) {
      console.log('Design data received:', designData);
      
      // Wait a bit for the model to fully load before applying textures
      setTimeout(() => {
        designData.panels.forEach(panel => {
          if (panel.imageUrl) {
            console.log(`Applying design for ${panel.panelType} panel:`, panel);
            applyDesignTexture(
              panel.panelType, 
              panel.imageUrl,
              panel.position,
              panel.scale,
              panel.rotation
            );
          }
        });
      }, 1000); // Wait 1 second to ensure model is loaded
    }
  }, [designData]);

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
              const event = new CustomEvent('backToDesign');
              window.dispatchEvent(event);
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
    </div>
  )
}
