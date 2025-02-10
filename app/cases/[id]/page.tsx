'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/app/lib/firebase'
import { Loader } from '@/app/components/Loader'

interface CaseData {
  id: string
  name: string
  price: number
  description: string
  category: string
  image: string
  features: string[]
  specifications: {
    dimensions: string
    weight: string
    formFactor: string
    maxGPULength: string
    maxCPUCoolerHeight: string
    includedFans: string
  }
}

export default function CasePage() {
  const params = useParams()
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCase = async () => {
      try {
        console.log('Fetching case with ID:', params.id)
        setLoading(true)
        setError(null)

        const productsRef = collection(db, 'products')
        console.log('Fetching products collection...')
        
        const querySnapshot = await getDocs(productsRef)
        console.log('Products fetched:', querySnapshot.size)
        
        const product = querySnapshot.docs.find(doc => {
          const data = doc.data()
          console.log('Checking product:', data.slug)
          return data.slug === params.id
        })

        if (product) {
          console.log('Found product:', product.data())
          setCaseData({
            id: product.id,
            ...product.data() as Omit<CaseData, 'id'>
          })
        } else {
          console.log('Product not found')
          setError('Product not found')
        }
      } catch (err) {
        console.error('Error fetching case:', err)
        setError(err instanceof Error ? err.message : 'An error occurred while fetching the case')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchCase()
    }
  }, [params.id])

  if (loading) {
    return <Loader />
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md mx-4">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">Case not found</h1>
          <p className="text-gray-600 mb-6">
            {error || "The case you're looking for doesn't exist or has been removed."}
          </p>
          <Link 
            href="/cases" 
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
          >
            ← Back to all cases
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="pt-16 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto px-4 py-12"
      >
        <Link 
          href="/cases" 
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8 group"
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span className="ml-2">Back to all cases</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 p-8">
            {/* Image Section */}
            <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden">
              <Image
                src={caseData.image}
                alt={caseData.name}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Details Section */}
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold font-cairo mb-4 text-gray-800">{caseData.name}</h1>
              <p className="text-3xl font-bold text-blue-600 mb-6">${caseData.price}</p>
              <p className="text-gray-600 mb-8 text-lg">{caseData.description}</p>

              {/* Features */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold font-cairo mb-4 text-gray-800">Features</h2>
                <ul className="space-y-3">
                  {caseData.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-3">•</span>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Specifications */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold font-cairo mb-4 text-gray-800">Specifications</h2>
                <div className="grid grid-cols-2 gap-6">
                  {Object.entries(caseData.specifications).map(([key, value]) => (
                    <div key={key} className="border-b border-gray-200 pb-3">
                      <p className="text-gray-500 text-sm mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="font-medium text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add to Cart Button */}
              <button className="mt-auto w-full bg-blue-600 text-white py-4 px-8 rounded-full hover:bg-blue-700 transition-all duration-200 font-medium text-lg shadow-lg hover:shadow-xl hover:shadow-blue-600/30 transform hover:scale-[1.02]">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  )
} 