---
id: TableState_All
title: TableState_All
---

# Type Alias: TableState\_All

```ts
type TableState_All = Partial<TableState<TableFeatures>>;
```

Defined in: [types/TableState.ts:47](https://github.com/TanStack/table/blob/main/packages/table-core/src/types/TableState.ts#L47)

Internal broad state shape containing every registered feature state slice.

Feature internals use this when they may need to inspect optional slices owned
by other features.
