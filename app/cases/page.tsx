'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import ClientOnly from '@/app/components/ClientOnly'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/app/lib/firebase'
import { Loader } from '@/app/components/Loader'

interface Case {
  id: string
  name: string
  price: number
  image: string
  description: string
  category: string
  slug: string
}

const categories = ['All', 'ATX', 'mATX', 'ITX', 'Full Tower']

export default function CasesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('featured')
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'))
        const casesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Case[]
        setCases(casesData)
      } catch (error) {
        console.error('Error fetching cases:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCases()
  }, [])

  const filteredCases = cases.filter(item => 
    selectedCategory === 'All' || item.category === selectedCategory
  )

  const sortedCases = [...filteredCases].sort((a, b) => {
    if (sortBy === 'price-low') {
      return a.price - b.price
    }
    if (sortBy === 'price-high') {
      return b.price - a.price
    }
    return 0 // featured
  })

  if (loading) {
    return <Loader />
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative h-[500px] bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.2] bg-grid-pattern" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center max-w-4xl mx-auto px-4">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 font-cairo">
              Premium PC Cases
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
              Build your dream PC with our carefully selected premium cases, designed for both performance and aesthetics
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ClientOnly>
        <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20 pb-20">
          {/* Filters Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex flex-wrap gap-3 justify-center">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-md'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 rounded-lg border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedCases.map((item) => (
              <Link href={`/cases/${item.slug}`} key={item.id} className="block h-full group">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 h-full flex flex-col transform group-hover:scale-[1.02]"
                >
                  <div className="relative pt-[75%] bg-gray-50">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority
                    />
                  </div>
                  <div className="p-8 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold mb-3 line-clamp-2 font-cairo text-gray-800">
                      {item.name}
                    </h3>
                    <p className="text-gray-600 mb-6 flex-grow line-clamp-3">
                      {item.description}
                    </p>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="text-2xl font-bold text-blue-600">
                        ${item.price}
                      </span>
                      <span className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all duration-200 text-sm font-medium group-hover:shadow-lg group-hover:shadow-blue-600/30">
                        View Details
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </ClientOnly>
    </main>
  )
}
