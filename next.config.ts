import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore TypeScript errors in node_modules during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack config (used by both `next dev` and `next build` in Next 16).
  // Stub dev-only Node modules that pino/thread-stream pull in transitively via
  // WalletConnect (inside Privy) and that must not be bundled for the browser.
  turbopack: {
    resolveAlias: {
      // thread-stream is pino's worker-thread transport (Node-only, unused in
      // the browser). Stubbing it stops Turbopack from walking its test dir,
      // which transitively requires tape / why-is-node-running, etc.
      'thread-stream': './app/lib/noop.js',
      'why-is-node-running': './app/lib/noop.js',
      'pino-pretty': './app/lib/noop.js',
    },
  },
  // Allow ngrok dev origins
  allowedDevOrigins: [
    'absolute-epic-gnu.ngrok-free.app',
    'localhost:3000',
  ],
  // Cross-origin isolation so the ZK engine gets SharedArrayBuffer and the main
  // thread can sync with the prover/storage workers (without this the engine
  // hangs on "Booting the ZK engine…"). COEP credentialless (not require-corp)
  // keeps third-party scripts like Privy loading (cross-origin subresources are
  // fetched without credentials rather than blocked).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ];
  },
  // /api/backend/* is now served by Next.js route handlers (app/api/backend),
  // backed by MongoDB — no proxy/rewrite to an external server.
  // Webpack configuration for production build
  webpack: (config, { isServer, webpack }) => {
    // Null out thread-stream/pino test fixtures (they require dev-only modules
    // like why-is-node-running that must never be bundled). Cover the whole
    // test dir, not just *.test.js — helper.js/context.js live there too.
    config.module.rules.push({
      test: /node_modules[\\/](thread-stream|pino)[\\/](test|tests|bench)[\\/]/,
      use: 'null-loader',
    });

    // Belt-and-suspenders: never resolve these dev-only modules.
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^why-is-node-running$/ }),
    );
    config.resolve.alias = {
      ...config.resolve.alias,
      'why-is-node-running': false,
    };

    // Fallback for node modules. @stellar/stellar-sdk (stellar-base) expects
    // Buffer in the browser; provide the polyfill and keep node builtins out.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        buffer: require.resolve('buffer/'),
        stream: false,
      };
    }

    return config;
  },
};

export default nextConfig;
