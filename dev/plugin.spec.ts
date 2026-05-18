import assert from 'node:assert/strict'
import test from 'node:test'

import { MongoMemoryServer } from 'mongodb-memory-server'
import { getPayload } from 'payload'

import mockData from './src/mocks/mockData'

let mongoServer: MongoMemoryServer | undefined
let payloadInstance: Awaited<ReturnType<typeof getPayload>> | undefined

test.before(async () => {
  mongoServer = await MongoMemoryServer.create()

  process.env.DATABASE_URI = mongoServer.getUri()
  process.env.PAYLOAD_SECRET = 'payload-table-field-smoke-test-secret'

  const { default: config } = await import('./payload.config.ts')

  payloadInstance = await getPayload({ config })
})

test.after(async () => {
  await payloadInstance?.destroy()
  await mongoServer?.stop()
})

test('registers the Payload 3 admin field component path', async () => {
  assert.ok(payloadInstance)

  const examplesCollection = payloadInstance.config.collections.find(
    collection => collection.slug === 'examples',
  )

  const tableField = examplesCollection?.fields.find(
    incomingField => 'name' in incomingField && incomingField.name === 'table_example',
  )

  assert.ok(tableField)

  if (!('admin' in tableField)) {
    throw new Error('Expected table field admin configuration to be present')
  }

  assert.equal(tableField.type, 'json')
  assert.equal(tableField.admin?.components?.Field, 'payload-table-field/client#TableFieldClient')
  assert.ok(tableField.admin?.custom?.tableField)
})

test('creates and reads table data through the local API', async () => {
  assert.ok(payloadInstance)

  const createdExample = await payloadInstance.create({
    collection: 'examples',
    data: {
      table_example: mockData.slice(0, 3),
      title: 'Smoke Test Example',
    },
  })

  assert.equal(createdExample.title, 'Smoke Test Example')
  assert.equal(createdExample.table_example.length, 3)
  assert.equal(createdExample.table_example[0]?.title, mockData[0]?.title)

  const foundExamples = await payloadInstance.find({
    collection: 'examples',
    where: {
      title: {
        equals: 'Smoke Test Example',
      },
    },
  })

  assert.equal(foundExamples.totalDocs, 1)
  assert.equal(foundExamples.docs[0]?.table_example?.[1]?.title, mockData[1]?.title)
})
