import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withPayload } from '@payloadcms/next/withPayload'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ['payload-table-field'],
  webpack: config => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@payloadcms/ui$': path.resolve(dirname, 'node_modules/@payloadcms/ui'),
      react$: path.resolve(dirname, 'node_modules/react'),
      'react-dom$': path.resolve(dirname, 'node_modules/react-dom'),
      'react/jsx-dev-runtime$': path.resolve(dirname, 'node_modules/react/jsx-dev-runtime.js'),
      'react/jsx-runtime$': path.resolve(dirname, 'node_modules/react/jsx-runtime.js'),
    }
    config.resolve.symlinks = false

    return config
  },
}

export default withPayload(nextConfig)
