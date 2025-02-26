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
  const [uploading, setUploading] = useState(false)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    raycaster: THREE.Raycaster
    mouse: THREE.Vector2
    selectedPanel: PanelMesh | null
    hoveredPanel: PanelMesh | null
  }>({} as any)

  console.log("Loading model from path:", modelPath);

  // You could also try loading a different model to see if the issue is specific to this model
  const fallbackModelPath = '/3d/cube.glb'; // A simple cube model

  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log("Setting up minimal Three.js scene");
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    
    // Add a simple cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    // Add light
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);
    
    // Animation function
    function animate() {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    }
    
    animate();
    
    console.log("Minimal scene setup complete");
    
    // Cleanup
    return () => {
      console.log("Cleaning up Three.js scene");
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

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
        if (backPanel) {
          backPanel.material = material;
        }
        
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

  // Update the applyDesignTexture method to make changes more obvious
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
        // Log all mesh names to help with debugging
        console.log(`Found mesh: ${child.name}`);
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
      
      // As a last resort, try to apply to any large flat mesh
      const largeMeshes = allMeshes.filter(mesh => {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        return size.x > 0.5 && size.y > 0.5;
      });
      
      if (largeMeshes.length > 0) {
        console.log("Trying to apply to a large mesh as fallback:", largeMeshes[0].name);
        targetPanel = largeMeshes[0];
      } else {
        return;
      }
    }
    
    console.log(`Found ${panelType} panel:`, targetPanel.name);
    
    // Use a very simple, high-contrast material for testing
    const material = new THREE.MeshBasicMaterial({
      color: panelType === 'back' ? 0xff0000 : 0x00aaff,  // Red for back, blue for glass
      wireframe: true,  // Make it wireframe to be very obvious
      side: THREE.DoubleSide
    });
    
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
      
      console.log('Material applied and rendered');
    }
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

  // Add a function to reset the model
  const resetModel = () => {
    if (!sceneRef.current) return;
    
    sceneRef.current.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial;
      }
    });
    
    // Force a render update
    if (sceneRef.current?.renderer) {
      sceneRef.current.renderer.render(
        sceneRef.current.scene,
        sceneRef.current.camera
      );
    }
  }

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
      
      {/* Enhanced Debug Panel */}
      <div className="absolute top-4 right-4 z-10 bg-gray-800 p-4 rounded-lg shadow-lg text-white">
        <h3 className="text-lg font-bold mb-2">Debug Tools</h3>
        
        <div className="space-y-2">
          <button 
            onClick={() => {
              // Apply a bright red material to the back panel
              if (sceneRef.current) {
                sceneRef.current.scene.traverse((child) => {
                  if (child instanceof THREE.Mesh && 
                      (child.name === 'Object_44001' || 
                       (child.userData.isPanel && child.userData.panelType === 'back'))) {
                    child.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    
                    // Force a render
                    if (sceneRef.current?.renderer) {
                      sceneRef.current.renderer.render(
                        sceneRef.current.scene,
                        sceneRef.current.camera
                      );
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
                sceneRef.current.scene.traverse((child) => {
                  if (child instanceof THREE.Mesh && 
                      ((child.name === 'Object_42' || child.name === 'Object_43') || 
                       (child.userData.isPanel && child.userData.panelType === 'glass'))) {
                    child.material = new THREE.MeshBasicMaterial({ 
                      color: 0x00aaff,
                      transparent: true,
                      opacity: 0.7
                    });
                    
                    // Force a render
                    if (sceneRef.current?.renderer) {
                      sceneRef.current.renderer.render(
                        sceneRef.current.scene,
                        sceneRef.current.camera
                      );
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
                sceneRef.current.scene.traverse((child) => {
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
            onClick={resetModel}
            className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md"
          >
            Reset Model
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
                sceneRef.current.scene.add(cube);
                
                // Force a render
                if (sceneRef.current.renderer) {
                  sceneRef.current.renderer.render(
                    sceneRef.current.scene,
                    sceneRef.current.camera
                  );
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
                sceneRef.current.camera.position.set(-3, 2, 3);
                
                // Force a render
                if (sceneRef.current.renderer) {
                  sceneRef.current.renderer.render(
                    sceneRef.current.scene,
                    sceneRef.current.camera
                  );
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
