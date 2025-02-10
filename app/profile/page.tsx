'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/app/lib/firebase'
import { Loader } from '@/app/components/Loader'
import Image from 'next/image'
import Link from 'next/link'
import { signOut } from 'firebase/auth'
import { auth } from '@/app/lib/firebase'
import { useRouter } from 'next/navigation'

interface Order {
  id: string
  date: string
  status: string
  total: number
  items: {
    id: string
    name: string
    price: number
    quantity: number
    image: string
  }[]
}

interface UserProfile {
  name: string
  email: string
  phone?: string
  addresses: {
    shipping?: {
      street: string
      city: string
      state: string
      zip: string
      country: string
    }
    billing?: {
      street: string
      city: string
      state: string
      zip: string
      country: string
    }
  }
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        // Fetch user profile
        const userDoc = await getDocs(query(
          collection(db, 'users'),
          where('email', '==', user.email)
        ))
        
        if (!userDoc.empty) {
          setProfile(userDoc.docs[0].data() as UserProfile)
        }

        // Fetch orders
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid)
        )
        const ordersSnapshot = await getDocs(ordersQuery)
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[]
        setOrders(ordersData)
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchUserData()
    }
  }, [user, authLoading])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/auth/signin')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (authLoading || loading) {
    return <Loader />
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please sign in to view your profile</h1>
          <Link 
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-16">
      {/* Profile Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 shadow-inner">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-600">
                    {user.email?.[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-cairo">
                  {user.displayName || 'Welcome'}
                </h1>
                <p className="text-blue-600">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-white border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-all duration-200 font-medium flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3zm11 4.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L11.586 7H6a1 1 0 1 1 0-2h5.586L8.293 1.707a1 1 0 0 1 1.414-1.414L14 4.586v2.828z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {['overview', 'orders', 'addresses', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-3 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Orders</h2>
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.slice(0, 3).map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 hover:border-blue-200 transition-colors duration-200">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-700 font-medium">Order #{order.id}</span>
                          <span className="text-sm font-medium px-3 py-1 rounded-full bg-green-100 text-green-800">
                            {order.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">{order.date}</div>
                        <div className="mt-2 font-bold text-blue-600">${order.total}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No orders yet</p>
                    <Link 
                      href="/cases" 
                      className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Shopping
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">Order History</h2>
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-6 mb-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium">Order #{order.id}</h3>
                        <p className="text-sm text-gray-500">{order.date}</p>
                      </div>
                      <span className="text-sm font-medium px-3 py-1 rounded-full bg-green-100 text-green-800">
                        {order.status}
                      </span>
                    </div>
                    <div className="divide-y">
                      {order.items.map((item) => (
                        <div key={item.id} className="py-4 flex items-center">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="ml-4 flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-gray-500">
                              Quantity: {item.quantity}
                            </p>
                          </div>
                          <div className="font-medium">${item.price}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t text-right">
                      <span className="font-medium">Total: ${order.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-6">
                {/* Shipping Address */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Shipping Address</h2>
                    <button className="text-blue-600 hover:text-blue-700">Edit</button>
                  </div>
                  {profile?.addresses?.shipping ? (
                    <address className="not-italic">
                      <p>{profile.addresses.shipping.street}</p>
                      <p>
                        {profile.addresses.shipping.city}, {profile.addresses.shipping.state} {profile.addresses.shipping.zip}
                      </p>
                      <p>{profile.addresses.shipping.country}</p>
                    </address>
                  ) : (
                    <p className="text-gray-500">No shipping address added</p>
                  )}
                </div>

                {/* Billing Address */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Billing Address</h2>
                    <button className="text-blue-600 hover:text-blue-700">Edit</button>
                  </div>
                  {profile?.addresses?.billing ? (
                    <address className="not-italic">
                      <p>{profile.addresses.billing.street}</p>
                      <p>
                        {profile.addresses.billing.city}, {profile.addresses.billing.state} {profile.addresses.billing.zip}
                      </p>
                      <p>{profile.addresses.billing.country}</p>
                    </address>
                  ) : (
                    <p className="text-gray-500">No billing address added</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">Account Settings</h2>
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={profile?.name}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={profile?.phone}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Account Summary</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-3xl font-bold text-blue-600">{orders.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium text-gray-800">
                    {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Need Help?</h2>
              <div className="space-y-4">
                <Link 
                  href="/support"
                  className="block text-gray-600 hover:text-blue-600 transition-colors duration-200"
                >
                  Contact Support
                </Link>
                <Link 
                  href="/faq"
                  className="block text-gray-600 hover:text-blue-600 transition-colors duration-200"
                >
                  FAQ
                </Link>
                <Link 
                  href="/returns"
                  className="block text-gray-600 hover:text-blue-600 transition-colors duration-200"
                >
                  Returns & Refunds
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 