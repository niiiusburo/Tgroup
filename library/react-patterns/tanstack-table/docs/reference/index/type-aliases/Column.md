---
id: Column
title: Column
---

# Type Alias: Column\<TFeatures, TData, TValue\>

```ts
type Column<TFeatures, TData, TValue> = Column_Core<TFeatures, TData, TValue> & ExtractFeatureMapTypes<TFeatures, Column_FeatureMap<TFeatures, TData>>;
```

Defined in: [types/Column.ts:38](https://github.com/TanStack/table/blob/main/packages/table-core/src/types/Column.ts#L38)

## Type Parameters

### TFeatures

`TFeatures` *extends* [`TableFeatures`](../interfaces/TableFeatures.md)

### TData

`TData` *extends* [`RowData`](RowData.md)

### TValue

`TValue` = `unknown`
