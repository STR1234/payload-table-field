import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'
import { nl } from '@payloadcms/translations/languages/nl'
import { buildConfig } from 'payload'

import Examples from './src/collections/Examples'
import Users from './src/collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
  },
  collections: [Users, Examples],
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || 'mongodb://127.0.0.1:27017/payload-table-field-dev',
  }),
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: {
      de,
      en,
      nl,
    },
  },
  secret: process.env.PAYLOAD_SECRET || 'payload-table-field-dev-secret',
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload-types.ts'),
  },
})
