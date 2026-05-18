# Payload Table Field
#### Adds a table field (using [TanStack Table](https://tanstack.com/table/latest)) to [Payload](https://payloadcms.com/).

Supports Payload 3.x.

### Features:

- Display / Edit data using [React Table](https://tanstack.com/table/latest)
- Built-in filter builder
- Admin locale-aware UI strings
- Pagination
- Sorting
- Row Selection
- Row Pinning


![image](https://github.com/notchris/payload-table-field/blob/main/example.png?raw=true)


## Installation

```bash
  pnpm add payload-table-field
  # OR
  yarn add payload-table-field
  # OR
  npm i payload-table-field
```

Make sure your app is already running on Payload 3.x.

## Basic Usage

Import the field and then use it in your payload collection fields array.

```ts
import type { CollectionConfig } from 'payload'
import { tableField } from 'payload-table-field'

import mockData from '../mocks/mockData'

const Examples: CollectionConfig = {
  slug: 'examples',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      type: 'text',
      name: 'title',
    },
    tableField(
      {
        name: 'table_example',
        label: 'Example Table - Movies',
        defaultValue: mockData,
      },
      {
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizes: [5, 10, 25, 50, 100],
        editable: false,
        rowSelection: true,
        rowPinning: true,
        columns: [
          {
            key: 'id',
            label: 'ID',
            enableSorting: true,
          },
          { key: 'title', label: 'Title', enableSorting: true },
          { key: 'year', label: 'Year', enableSorting: true },
        ],
      },
    ),
  ],
}

export default Examples
```

## Configuration

`tableField(fieldOptions, tableOptions)` returns a Payload `json` field and wires up the admin component automatically.

`fieldOptions`:

- Any normal Payload `json` field option except `type`

`tableOptions`:

- `columns`: array of column definitions with `key`, plus optional `label`, `name`, `enableSorting`, `inputType`, `placeholder`, and `readOnly`
  `label`, `name`, and `placeholder` can be plain strings or locale maps such as `{ en: 'Title', de: 'Titel' }`
- `editable`: enable inline cell editing
- `filters`: enable the built-in column filter builder. Defaults to `true`
- `pagination`: enable pagination controls
- `paginationPageIndex`: initial page index
- `paginationPageSize`: initial page size
- `paginationPageSizes`: selectable page sizes
- `rowPinning`: enable pin-to-top rows
- `rowSelection`: enable checkbox selection
- `translations`: optional per-locale overrides for plugin UI strings such as search placeholder, pagination labels, pin labels, and filter labels
- `debugTable`: forward TanStack debug mode

Example `translations` override:

```ts
tableField(
  {
    name: 'table_example',
  },
  {
    columns: [{ key: 'title', label: { en: 'Title', de: 'Titel' } }],
    translations: {
      de: {
        searchPlaceholder: 'Tabelle durchsuchen...',
      },
    },
  },
)
```

Built-in fallback translations ship with English, German, and Dutch. The package loads them from the locale files in `src/locales/en.json`, `src/locales/de.json`, and `src/locales/nl.json`.

## Local Development

The `dev/` folder contains a Payload 3 + Next.js App Router harness for testing the plugin inside the real admin UI.

Install the harness dependencies:

```bash
cd dev
npm install --no-package-lock
```

Start the local admin harness:

```bash
npm run dev
```

Useful commands:

- `npm run generate:importmap` regenerates the Payload admin import map
- `npm run generate:types` regenerates Payload types for the harness
- `npm run test:smoke` runs the Local API smoke test with `mongodb-memory-server`
- `npm run build` builds the full Next.js harness for production

### Note

Payload will add this package's client component to the admin import map automatically through the field config. If your app is not picking up a new component path yet, regenerate the import map with `payload generate:importmap`.