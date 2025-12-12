/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['pawfect-service.com', 'images.unsplash.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
}

module.exports = nextConfig
