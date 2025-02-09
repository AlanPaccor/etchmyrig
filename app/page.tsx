import Header from './page_build/Header'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 font-cairo">
            Premium PC Cases for Your Build
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover our collection of high-end PC cases designed for both aesthetics and optimal airflow.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 font-cairo">Gaming Cases</h2>
              <p className="text-gray-600">
                RGB-ready cases with superior airflow and cable management for gaming builds.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 font-cairo">Professional Cases</h2>
              <p className="text-gray-600">
                Sleek and minimalist cases perfect for workstations and professional setups.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
