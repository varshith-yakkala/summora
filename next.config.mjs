/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep pdf-parse and tesseract.js as server-only external packages (not bundled by webpack)
    serverComponentsExternalPackages: ['pdf-parse', 'tesseract.js'],
  },
};

export default nextConfig;
