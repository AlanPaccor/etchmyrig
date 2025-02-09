'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import ClientOnly from '@/app/components/ClientOnly'
import { casesData } from '@/app/data/cases'

const CaseModel = dynamic(() => import('@/app/components/CaseModel'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-gray-50 rounded-xl flex items-center justify-center">
      <div className="text-blue-600 text-lg font-medium">
        Loading 3D viewer...
      </div>
    </div>
  )
})

export default function CasePage() {
  const params = useParams()
  const caseId = params.id as string
  const caseData = casesData[caseId as keyof typeof casesData]

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md mx-4">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">Case not found</h1>
          <p className="text-gray-600 mb-6">The case you're looking for doesn't exist or has been removed.</p>
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
            {/* 3D Model Section */}
            <div className="relative aspect-square">
              <ClientOnly>
                <CaseModel modelPath={`/3d/${caseData.model3D}/scene.gltf`} />
              </ClientOnly>
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