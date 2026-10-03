/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['three'],
  // The check-in page was renamed from /clock-in to /check-in so the URL matches
  // the wording shown in the app. The permanent redirect keeps any existing
  // links, bookmarks or QR posters pointing at the old path working.
  async redirects() {
    return [
      {
        source: '/clock-in',
        destination: '/check-in',
        permanent: true,
      },
    ]
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    return config
  },
};

module.exports = nextConfig;
