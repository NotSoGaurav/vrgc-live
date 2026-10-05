/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    VITE_IMAGE_SECRET_SALT:
      process.env.VITE_IMAGE_SECRET_SALT ||
      process.env.NEXT_PUBLIC_IMAGE_SECRET_SALT ||
      process.env.IMAGE_SECRET_SALT ||
      '',
  },
  images: {
    // Use Next.js built-in image optimization (do NOT set unoptimized: true)
    // This enables automatic WebP conversion, resizing, and caching.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/VRGC-vit/VRGCassets/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },

    ],
    // Limit to webp + avif for maximum compression on modern browsers
    formats: ['image/avif', 'image/webp'],
    // Cache images for 30 days on CDN/browser
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Device sizes used when generating srcSet
    deviceSizes: [320, 480, 640, 828, 1080, 1280, 1920],
    // Image sizes used for fixed/fill images
    imageSizes: [16, 32, 48, 64, 96, 128, 220, 256, 384],
  },
  // Enable HTTP compression
  compress: true,
  // Minimise JS in production
  swcMinify: true,
};

export default nextConfig;
