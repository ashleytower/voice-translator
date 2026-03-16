/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://maps.gstatic.com https://maps.googleapis.com https://*.google.com https://*.googleusercontent.com https://*.supabase.co",
              "media-src 'self' blob:",
              "connect-src 'self' https://generativelanguage.googleapis.com https://maps.googleapis.com https://api.deepgram.com wss://api.deepgram.com https://api.cartesia.ai wss://api.cartesia.ai https://open.er-api.com https://api.vapi.ai https://*.supabase.co wss://*.supabase.co",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
