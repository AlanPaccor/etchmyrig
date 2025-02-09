'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface Case {
  id: string
  name: string
  price: number
  image: string
  description: string
  category: string
}

const cases: Case[] = [
  {
    id: '1',
    name: 'Crystal Clear Protection',
    price: 29.99,
    image: '/cases/clear-case.jpg',
    description: 'Ultra-slim transparent case with military-grade protection',
    category: 'Clear'
  },
  {
    id: '2',
    name: 'Leather Executive',
    price: 49.99,
    image: '/cases/leather-case.jpg',
    description: 'Premium genuine leather case with card slots',
    category: 'Leather'
  },
  // Add more cases as needed
]

const categories = ['All', 'Clear', 'Leather', 'Rugged', 'Slim']

export default function CasesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('featured')

  const filteredCases = cases.filter(item => 
    selectedCategory === 'All' || item.category === selectedCategory
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-[300px] bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Premium Phone Cases
            </h1>
            <p className="text-xl text-white/90">
              Protect your device in style
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="flex gap-4 mb-4 md:mb-0">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200"
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCases.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative h-64">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-blue-600">
                    ${item.price}
                  </span>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                    Add to Cart
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
