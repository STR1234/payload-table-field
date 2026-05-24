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
  npm i payload-table-field
```

Make sure your app is already running on Payload 3.x.

## Basic Usage

Import the field and then use it in your payload collection fields array.

```ts
import type { CollectionConfig } from "payload";
import { tableField } from "payload-table-field";

import mockData from "../mocks/mockData";

const Examples: CollectionConfig = {
  slug: "examples",
  admin: {
    useAsTitle: "title",
  },
  fields: [
    {
      type: "text",
      name: "title",
    },
    tableField(
      {
        name: "table_example",
        label: "Example Table - Movies",
        defaultValue: mockData,
        localized: true,
      },
      {
        dynamicColumns: true,
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizes: [5, 10, 25, 50, 100],
        editable: false,
        rowSelection: true,
        rowPinning: true,
        columns: [
          {
            key: "id",
            label: "ID",
            enableSorting: true,
          },
          { key: "title", label: "Title", enableSorting: true },
          { key: "year", label: "Year", enableSorting: true },
        ],
      }
    ),
  ],
};

export default Examples;
```

## Configuration

`tableField(fieldOptions, tableOptions)` returns a Payload `json` field and wires up the admin component automatically.

`fieldOptions`:

- Any normal Payload `json` field option except `type`
- Set `localized: true` to store table data per locale, same as any other localized Payload field

`tableOptions`:

- `columns`: array of column definitions with `key`, plus optional `label`, `name`, `enableSorting`, `inputType`, `placeholder`, and `readOnly`
  `label`, `name`, and `placeholder` can be plain strings or locale maps such as `{ en: 'Title', de: 'Titel' }`
- `dynamicColumns`: persist column metadata with each document and unlock add / rename / remove column controls in the admin UI. When enabled, the stored JSON value becomes `{ columns, rows }`.
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
    name: "table_example",
  },
  {
    columns: [{ key: "title", label: { en: "Title", de: "Titel" } }],
    translations: {
      de: {
        searchPlaceholder: "Tabelle durchsuchen...",
      },
    },
  }
);
```

Built-in fallback translations ship with English, German, and Dutch. The package loads them from the locale files in `src/locales/en.json`, `src/locales/de.json`, and `src/locales/nl.json`.

When `editable` is enabled, the admin UI now also exposes an `Add row` action so empty tables can be populated without a `defaultValue`.

## Local Development

The `dev/` folder contains a Payload 3 + Next.js App Router harness for testing the plugin inside the real admin UI.

Install the harness dependencies:

```bash
pnpm install
```

Start the local admin harness:

```bash
pnpm --dir dev dev
```

`pnpm --dir dev dev` now does three things for local plugin work:

- builds the package once before startup so Payload can generate the admin import map
- runs the Next.js dev server for the harness
- watches the root plugin source and rebuilds the linked package in the background after each change

The harness also aliases `payload-table-field`, `payload-table-field/client`, and `payload-table-field/types` to the root `src/` entry files during development. That means the Next.js admin uses the newest source directly, which gives you the best chance of hot reload instead of waiting on stale `dist/` output.

Useful commands:

- `pnpm generate:importmap` regenerates the Payload admin import map
- `pnpm generate:types` regenerates Payload types for the harness
- `pnpm test:smoke` runs the Local API smoke test with `mongodb-memory-server`
- `pnpm build` builds the full Next.js harness for production

### Note

Payload will add this package's client component to the admin import map automatically through the field config. If your app is not picking up a new component path yet, regenerate the import map with `payload generate:importmap`.

If you are checking `console.log` output while debugging, client-side logs from the admin UI appear in the browser devtools console, while server-side logs from Payload and Next.js appear in the terminal that started `pnpm --dir dev dev`.
