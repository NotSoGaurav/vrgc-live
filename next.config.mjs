/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Using unoptimized while Supabase storage is blocked.
    // When Supabase is restored, switch to remotePatterns:
    // remotePatterns: [
    //   { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
    //   { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
    //   { protocol: 'https', hostname: 'picsum.photos' },
    // ],
    unoptimized: true,
  },
};

export default nextConfig;
