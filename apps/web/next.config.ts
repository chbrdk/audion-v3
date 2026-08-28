import type { NextConfig } from 'next'
import path from 'node:path'

const workspaceRoot = path.resolve(__dirname, '../..')
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules')
const webNodeModules = path.resolve(__dirname, 'node_modules')

const nextConfig: NextConfig = {
  // Keep native Node loaders for native/worker-heavy deps — webpack bundling of
  // pdfjs breaks PDF knowledge upload at runtime ("Failed to extract .pdf text").
  serverExternalPackages: ['pg', 'drizzle-orm', 'pdf-parse', 'pdfjs-dist'],
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@audion-v3/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
      '@msqdx/ui': path.resolve(__dirname, './lib/msqdx-ui.ts'),
      '@msqdx/ui-shell': path.resolve(__dirname, './lib/msqdx-ui-shell.ts'),
      '@msqdx/ui/styles.css': path.resolve(__dirname, '../../../msqdx-ui/packages/ui/src/styles.css'),
      '@msqdx/ui-tokens': path.resolve(__dirname, '../../../msqdx-ui/packages/ui-tokens/dist/index.js'),
    }
    // Coolify: msqdx-ui source is compiled from /workspace/msqdx-ui (sibling).
    // Webpack walks node_modules from that tree — pnpm symlinks often break after
    // multi-stage COPY. Prefer audion workspace installs (lucide-react, react-driftkit).
    const modules = new Set<string>([
      webNodeModules,
      workspaceNodeModules,
      ...((config.resolve.modules as string[] | undefined) ?? ['node_modules']),
    ])
    config.resolve.modules = [...modules]
    return config
  },
}

export default nextConfig
