import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  // Ignore TypeScript errors in node_modules during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack config for dev mode
  turbopack: {},
  // Allow ngrok dev origins
  allowedDevOrigins: [
    'absolute-epic-gnu.ngrok-free.app',
    'localhost:3000',
  ],
  // Proxy API requests to backend (so we only need to tunnel frontend)
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  // Webpack configuration for production build
  webpack: (config, { isServer }) => {
    // Exclude test files from being bundled
    config.module.rules.push({
      test: /node_modules[\\/](thread-stream|pino)[\\/].*\.(test|spec)\.(ts|js)$/,
      use: 'null-loader',
    });

    // Ignore problematic modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'why-is-node-running': false,
    };

    // Fallback for node modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
      };
    }

    return config;
  },
  // Transpile packages that have issues
  transpilePackages: [
    '@aptos-labs/wallet-adapter-react',
    '@aptos-labs/ts-sdk',
  ],
};

export default nextConfig;
