'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { Loader } from '@/app/components/Loader'
import Image from 'next/image'
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore'
import { db, storage } from '@/app/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { ErrorBoundary } from 'react-error-boundary'
import dynamic from 'next/dynamic'

// Dynamically import Scene with no SSR
const Scene = dynamic(() => import('@/app/components/Scene'), {
  ssr: false,
  loading: () => <Loader />
})

interface CaseData {
  id: string
  name: string
  model3D: string
  image: string
}

interface PanelDesign {
  panelType: 'back' | 'glass'
  imageUrl?: string
  position: { x: number, y: number }
  scale: { width: number, height: number }
  rotation: number
}

interface DesignData {
  id?: string
  userId: string
  caseId: string
  name: string
  panels: PanelDesign[]
  createdAt: number
  updatedAt: number
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center text-white">
        <h3 className="text-xl font-semibold mb-2">Failed to load designer</h3>
        <p className="text-gray-400">{error.message}</p>
      </div>
    </div>
  )
}

export default function PersonalizationPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<'back' | 'glass'>('back')
  const [designData, setDesignData] = useState<DesignData | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 })
  const [imageScale, setImageScale] = useState({ width: 100, height: 100 })
  const [imageRotation, setImageRotation] = useState(0)
  const [mode, setMode] = useState<'design' | 'preview'>('design')
  const [saving, setSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const productsRef = collection(db, 'products')
      const querySnapshot = await getDocs(query(
        productsRef,
        where('slug', '==', params.id)
      ))
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data()
        
        setCaseData({
          id: querySnapshot.docs[0].id,
          name: data.name,
          model3D: '/3d/Corsair4000D-3D.glb',  // Using local path
          image: data.image
        })

        // Check if user has an existing design for this case
        if (user) {
          const designsRef = collection(db, 'designs')
          const designQuery = query(
            designsRef,
            where('userId', '==', user.uid),
            where('caseId', '==', querySnapshot.docs[0].id)
          )
          
          const designSnapshot = await getDocs(designQuery)
          
          if (!designSnapshot.empty) {
            // Load existing design
            const existingDesign = designSnapshot.docs[0].data() as DesignData
            existingDesign.id = designSnapshot.docs[0].id
            setDesignData(existingDesign)
            
            // Set initial panel data if available
            const backPanel = existingDesign.panels.find(p => p.panelType === 'back')
            if (backPanel && backPanel.imageUrl) {
              setUploadedImage(backPanel.imageUrl)
              setImagePosition(backPanel.position)
              setImageScale(backPanel.scale)
              setImageRotation(backPanel.rotation)
            }
          } else {
            // Create new design data
            setDesignData({
              userId: user.uid,
              caseId: querySnapshot.docs[0].id,
              name: `${data.name} Design`,
              panels: [
                {
                  panelType: 'back',
                  position: { x: 50, y: 50 },
                  scale: { width: 100, height: 100 },
                  rotation: 0
                },
                {
                  panelType: 'glass',
                  position: { x: 50, y: 50 },
                  scale: { width: 100, height: 100 },
                  rotation: 0
                }
              ],
              createdAt: Date.now(),
              updatedAt: Date.now()
            })
          }
        }
      } else {
        setError('Case not found')
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load case data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id && user) {
      fetchData()
    }
  }, [params.id, user])

  // Apply designs to 3D model when switching to preview mode
  useEffect(() => {
    if (mode === 'preview' && designData && window && (window as any).applyDesignTexture) {
      designData.panels.forEach(panel => {
        if (panel.imageUrl) {
          (window as any).applyDesignTexture(panel.panelType, panel.imageUrl);
        }
      });
    }
  }, [mode, designData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    try {
      // Create a temporary URL for preview
      const tempUrl = URL.createObjectURL(file)
      setUploadedImage(tempUrl)
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `designs/${user.uid}/${Date.now()}_${file.name}`)
      const snapshot = await uploadBytes(storageRef, file)
      const downloadUrl = await getDownloadURL(snapshot.ref)
      
      // Update design data
      if (designData) {
        const updatedPanels = designData.panels.map(panel => {
          if (panel.panelType === activePanel) {
            return {
              ...panel,
              imageUrl: downloadUrl,
              position: imagePosition,
              scale: imageScale,
              rotation: imageRotation
            }
          }
          return panel
        })
        
        setDesignData({
          ...designData,
          panels: updatedPanels,
          updatedAt: Date.now()
        })
      }
      
      // Revoke the temporary URL
      URL.revokeObjectURL(tempUrl)
      
      // Set the permanent URL
      setUploadedImage(downloadUrl)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image. Please try again.')
    }
  }

  const handleSaveDesign = async () => {
    if (!designData || !user) return
    
    try {
      setSaving(true)
      
      // Update the current panel data
      const updatedPanels = designData.panels.map(panel => {
        if (panel.panelType === activePanel) {
          return {
            ...panel,
            position: imagePosition,
            scale: imageScale,
            rotation: imageRotation
          }
        }
        return panel
      })
      
      const updatedDesign = {
        ...designData,
        panels: updatedPanels,
        updatedAt: Date.now()
      }
      
      // Save to Firestore
      if (designData.id) {
        // Update existing design
        await setDoc(doc(db, 'designs', designData.id), updatedDesign, { merge: true })
      } else {
        // Create new design
        const designRef = doc(collection(db, 'designs'))
        await setDoc(designRef, updatedDesign)
        updatedDesign.id = designRef.id
      }
      
      setDesignData(updatedDesign)
      
      // Switch to preview mode
      setMode('preview')
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save design. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!uploadedImage || !imageRef.current) return;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current || !uploadedImage) return;
    
    const container = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - container.left) / container.width) * 100;
    const y = ((e.clientY - container.top) / container.height) * 100;
    
    setImagePosition({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handlePanelChange = (panel: 'back' | 'glass') => {
    setActivePanel(panel)
    
    // Load panel data if available
    if (designData) {
      const panelData = designData.panels.find(p => p.panelType === panel)
      if (panelData) {
        setUploadedImage(panelData.imageUrl || null)
        setImagePosition(panelData.position)
        setImageScale(panelData.scale)
        setImageRotation(panelData.rotation)
      } else {
        setUploadedImage(null)
        setImagePosition({ x: 50, y: 50 })
        setImageScale({ width: 100, height: 100 })
        setImageRotation(0)
      }
    }
  }

  const handleBackToDesign = () => {
    setMode('design');
  };

  // Add this useEffect to listen for the backToDesign event
  useEffect(() => {
    window.addEventListener('backToDesign', handleBackToDesign);
    
    return () => {
      window.removeEventListener('backToDesign', handleBackToDesign);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-400">{error || 'Failed to load case data'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">{caseData.name} Customization</h1>
        </div>

        {mode === 'design' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Panel Selection */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Select Panel</h2>
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => handlePanelChange('back')}
                  className={`p-4 rounded-lg flex items-center ${activePanel === 'back' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  <div className="w-8 h-8 bg-gray-600 rounded mr-3"></div>
                  <span>Back Panel</span>
                </button>
                <button
                  onClick={() => handlePanelChange('glass')}
                  className={`p-4 rounded-lg flex items-center ${activePanel === 'glass' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  <div className="w-8 h-8 bg-gray-500 rounded mr-3"></div>
                  <span>Glass Panel</span>
                </button>
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-semibold text-white mb-4">Upload Image</h2>
                <label className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center cursor-pointer">
                  Upload Image
                  <input
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              {uploadedImage && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-white mb-4">Adjust Image</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-300 mb-2">Width</label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min="20"
                          max="300"
                          value={imageScale.width}
                          onChange={(e) => setImageScale({...imageScale, width: parseInt(e.target.value)})}
                          className="w-full mr-3"
                        />
                        <span className="text-gray-300 w-12 text-right">{imageScale.width}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 mb-2">Height</label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min="20"
                          max="300"
                          value={imageScale.height}
                          onChange={(e) => setImageScale({...imageScale, height: parseInt(e.target.value)})}
                          className="w-full mr-3"
                        />
                        <span className="text-gray-300 w-12 text-right">{imageScale.height}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 mb-2">Rotation</label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={imageRotation}
                          onChange={(e) => setImageRotation(parseInt(e.target.value))}
                          className="w-full mr-3"
                        />
                        <span className="text-gray-300 w-12 text-right">{imageRotation}°</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-700">
                      <p className="text-gray-400 text-sm mb-3">
                        Drag the image to position it on the panel. Use the sliders to adjust size and rotation.
                      </p>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setImageScale({width: 100, height: 100})}
                          className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm"
                        >
                          Reset Size
                        </button>
                        <button 
                          onClick={() => setImageRotation(0)}
                          className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm"
                        >
                          Reset Rotation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveDesign}
                disabled={saving || !uploadedImage}
                className="w-full mt-8 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Finish & Preview'}
              </button>
            </div>

            {/* Design Canvas */}
            <div className="lg:col-span-2">
              <div 
                ref={canvasRef}
                className="bg-gray-700 rounded-xl overflow-hidden relative"
                style={{ height: '600px' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Case panel outline */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className={`border-2 ${activePanel === 'back' ? 'border-blue-500' : 'border-purple-500'} rounded-lg`}
                    style={{ 
                      width: activePanel === 'back' ? '80%' : '60%', 
                      height: activePanel === 'back' ? '90%' : '80%',
                      backgroundColor: activePanel === 'back' ? '#222' : '#333',
                    }}
                  >
                    <div className="absolute top-0 left-0 p-2 bg-gray-800 text-white text-sm rounded-br-lg">
                      {activePanel === 'back' ? 'Back Panel' : 'Glass Panel'}
                    </div>
                  </div>
                </div>

                {/* Uploaded image with laser etching effect */}
                {uploadedImage && (
                  <div 
                    ref={imageRef}
                    className="absolute cursor-move"
                    style={{
                      left: `${imagePosition.x}%`,
                      top: `${imagePosition.y}%`,
                      width: `${imageScale.width}px`,
                      height: `${imageScale.height}px`,
                      transform: `translate(-50%, -50%) rotate(${imageRotation}deg)`,
                    }}
                    onMouseDown={handleMouseDown}
                  >
                    <img
                      src={uploadedImage}
                      alt="Uploaded design"
                      className={`w-full h-full object-contain ${
                        activePanel === 'back' 
                          ? 'mix-blend-overlay brightness-200 contrast-200' 
                          : 'mix-blend-multiply opacity-80'
                      }`}
                      draggable="false"
                    />
                  </div>
                )}

                {/* Instructions */}
                {!uploadedImage && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <p>Upload an image to begin designing</p>
                      <p className="text-sm mt-2">Your design will be laser etched onto the {activePanel} panel</p>
                    </div>
                  </div>
                )}

                {/* Drag instructions */}
                {uploadedImage && isDragging && (
                  <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white text-sm px-3 py-1 rounded">
                    Dragging image...
                  </div>
                )}
              </div>

              {/* Preview of how it will look */}
              {uploadedImage && (
                <div className="mt-4 bg-gray-800 rounded-lg p-4">
                  <h3 className="text-white text-sm font-medium mb-2">Preview: How it will look when laser etched</h3>
                  <p className="text-gray-400 text-xs mb-2">
                    {activePanel === 'back' 
                      ? 'The image will be etched into the metal panel, creating a permanent design.' 
                      : 'The image will be etched onto the glass panel with a frosted appearance.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <div className="h-[700px] bg-gray-800 rounded-xl overflow-hidden relative">
              <Scene modelPath={caseData.model3D} designData={designData} />
              
              <div className="absolute bottom-6 right-6">
                <button
                  onClick={() => router.push('/checkout')}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-lg"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
            <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">Your Custom Design</h2>
              <p className="text-gray-400 mb-6">This is how your design will look when laser etched onto your case</p>
            </div>
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
} 