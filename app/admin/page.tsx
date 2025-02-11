'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/app/lib/firebase'
import { Loader } from '@/app/components/Loader'

interface Product {
  id: string
  name: string
  price: number
  description: string
  category: string
  image: string
  model3D: string
  features: string[]
  specifications: {
    dimensions: string
    weight: string
    formFactor: string
    maxGPULength: string
    maxCPUCoolerHeight: string
    includedFans: string
  }
  slug: string
}

const CATEGORIES = ['ATX', 'mATX', 'ITX', 'Full Tower']

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    features: '',
    dimensions: '',
    weight: '',
    formFactor: '',
    maxGPULength: '',
    maxCPUCoolerHeight: '',
    includedFans: '',
    slug: ''
  })
  const [image, setImage] = useState<File | null>(null)
  const [model3D, setModel3D] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string>('')
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' })
  const [editingProductId, setEditingProductId] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'))
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[]
      setProducts(productsData)
      
      if (editingProductId) {
        setEditingProductId(null)
        resetForm()
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      category: '',
      features: '',
      dimensions: '',
      weight: '',
      formFactor: '',
      maxGPULength: '',
      maxCPUCoolerHeight: '',
      includedFans: '',
      slug: ''
    })
    setImage(null)
    setModel3D(null)
    setPreviewImage('')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      description: product.description,
      category: product.category,
      features: product.features.join(', '),
      dimensions: product.specifications.dimensions,
      weight: product.specifications.weight,
      formFactor: product.specifications.formFactor,
      maxGPULength: product.specifications.maxGPULength,
      maxCPUCoolerHeight: product.specifications.maxCPUCoolerHeight,
      includedFans: product.specifications.includedFans,
      slug: product.slug || ''
    })
    setPreviewImage(product.image)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      let imageUrl = ''
      let modelUrl = ''

      if (image) {
        const imageRef = ref(storage, `products/${Date.now()}-${image.name}`)
        await uploadBytes(imageRef, image)
        imageUrl = await getDownloadURL(imageRef)
      }

      if (model3D) {
        const modelFileName = `${Date.now()}-${model3D.name}`
        const modelRef = ref(storage, `models/${modelFileName}`)
        
        console.log('Uploading 3D model:', modelFileName)
        await uploadBytes(modelRef, model3D)
        
        modelUrl = await getDownloadURL(modelRef)
        console.log('Model uploaded successfully:', modelUrl)
      }

      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        category: formData.category,
        image: imageUrl || previewImage,
        model3D: modelUrl || (editingProductId ? products.find(p => p.id === editingProductId)?.model3D || '' : ''),
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        features: formData.features.split('\n').filter(f => f.trim()),
        specifications: {
          dimensions: formData.dimensions,
          weight: formData.weight,
          formFactor: formData.formFactor,
          maxGPULength: formData.maxGPULength,
          maxCPUCoolerHeight: formData.maxCPUCoolerHeight,
          includedFans: formData.includedFans,
        }
      }

      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), productData)
        setSubmitStatus({ 
          type: 'success', 
          message: 'Product updated successfully!' 
        })
      } else {
        await addDoc(collection(db, 'products'), productData)
        setSubmitStatus({ 
          type: 'success', 
          message: 'Product added successfully!' 
        })
      }

      await fetchProducts()
      resetForm()
    } catch (error) {
      console.error('Error saving product:', error)
      setSubmitStatus({ 
        type: 'error', 
        message: `Error ${editingProductId ? 'updating' : 'adding'} product: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', productId))
        await fetchProducts()
      } catch (error) {
        console.error('Error deleting product:', error)
      }
    }
  }

  if (loading) {
    return <Loader />
  }

  // Update the classes for all inputs and textareas with proper text colors
  const inputClasses = "w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
  const selectClasses = "w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"

  return (
    <div className="space-y-10">
      <div className="bg-white shadow-lg rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {editingProductId ? 'Edit Product' : 'Add New Product'}
        </h2>
        
        {submitStatus.type && (
          <div className={`mb-6 p-4 rounded-lg ${
            submitStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {submitStatus.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <input
                type="text"
                required
                className={inputClasses}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                className={inputClasses}
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                required
                className={selectClasses}
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">URL Slug</label>
              <input
                type="text"
                className={inputClasses}
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                placeholder="custom-url-slug (optional)"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              required
              rows={4}
              className={inputClasses}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Features (comma separated)</label>
            <textarea
              required
              rows={4}
              className={inputClasses}
              value={formData.features}
              onChange={(e) => setFormData({...formData, features: e.target.value})}
              placeholder="Feature 1, Feature 2, Feature 3"
            />
          </div>

          {/* Specifications */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
                <input
                  type="text"
                  required
                  className={inputClasses}
                  value={formData.dimensions}
                  onChange={(e) => setFormData({...formData, dimensions: e.target.value})}
                  placeholder="e.g., 450mm x 210mm x 480mm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                <input
                  type="text"
                  required
                  className={inputClasses}
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  placeholder="e.g., 8.5 kg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Form Factor</label>
                <input
                  type="text"
                  required
                  className={inputClasses}
                  value={formData.formFactor}
                  onChange={(e) => setFormData({...formData, formFactor: e.target.value})}
                  placeholder="e.g., ATX, Micro-ATX, Mini-ITX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max GPU Length</label>
                <input
                  type="text"
                  required
                  className={inputClasses}
                  value={formData.maxGPULength}
                  onChange={(e) => setFormData({...formData, maxGPULength: e.target.value})}
                  placeholder="e.g., 380mm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max CPU Cooler Height</label>
                <input
                  type="text"
                  required
                  className={inputClasses}
                  value={formData.maxCPUCoolerHeight}
                  onChange={(e) => setFormData({...formData, maxCPUCoolerHeight: e.target.value})}
                  placeholder="e.g., 170mm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Included Fans</label>
                <input
                  type="text"
                  required
                  className={inputClasses}
                  value={formData.includedFans}
                  onChange={(e) => setFormData({...formData, includedFans: e.target.value})}
                  placeholder="e.g., 3x 120mm RGB fans"
                />
              </div>
            </div>
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full"
              />
              {previewImage && (
                <div className="mt-2">
                  <img src={previewImage} alt="Preview" className="w-48 h-48 object-cover rounded-lg" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">3D Model (GLTF/GLB)</label>
              <input
                type="file"
                accept=".gltf,.glb"
                onChange={(e) => setModel3D(e.target.files?.[0] || null)}
                className="w-full"
              />
              {model3D && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected file: {model3D.name}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
          >
            {loading ? 'Saving...' : editingProductId ? 'Update Product' : 'Add Product'}
          </button>

          {editingProductId && (
            <button
              type="button"
              onClick={resetForm}
              className="mt-4 w-full bg-gray-100 text-gray-600 py-3 px-6 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Cancel Edit
            </button>
          )}
        </form>
      </div>

      {/* Products List */}
      <div className="bg-white shadow-lg rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Products List</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="border rounded-xl p-4 hover:shadow-lg transition-shadow duration-200">
              <div className="relative pt-[100%]">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="absolute inset-0 w-full h-full object-cover rounded-lg"
                />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-800 line-clamp-2">{product.name}</h3>
              <p className="text-blue-600 font-bold mt-2">${product.price}</p>
              <p className="text-gray-600 mt-2 line-clamp-2">{product.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 