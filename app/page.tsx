import Header from './page_build/Header'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-16"> {/* Add padding-top to account for fixed header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Welcome to PhoneCase
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover our collection of premium phone cases designed to protect your device in style.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Add your content here */}
          </div>
        </div>
      </main>
    </div>
  );
}
