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
      required: true,
    },
    tableField(
      {
        name: "table_example",
        label: "Example Table - Movies",
        defaultValue: mockData,
        localized: true,
        required: true,
      },
      {
        dynamicColumns: true,
        editable: true,
        filters: true,
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizes: [5, 10, 25, 50, 100],
        rowPinning: true,
        rowSelection: true,
        columns: [
          {
            key: "id",
            label: {
              de: "ID",
              en: "ID",
              nl: "ID",
            },
            enableSorting: true,
            readOnly: true,
          },
          {
            key: "title",
            label: {
              de: "Titel",
              en: "Title",
              nl: "Titel",
            },
            enableSorting: true,
            placeholder: {
              de: "Titel eingeben",
              en: "Enter title",
              nl: "Voer titel in",
            },
          },
          {
            key: "year",
            label: {
              de: "Jahr",
              en: "Year",
              nl: "Jaar",
            },
            enableSorting: true,
            placeholder: {
              de: "Jahr eingeben",
              en: "Enter year",
              nl: "Voer jaar in",
            },
          },
        ],
        translations: {
          nl: {
            addCondition: "Voorwaarde toevoegen",
          },
        },
      },
    ),
  ],
};

export default Examples;
