const corsConfig = {
  origin: [
    'http://localhost:3000',
    'https://your-production-domain.com' // Add your production domain
  ],
  methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  maxAge: 86400 // 24 hours
}

export { corsConfig } 