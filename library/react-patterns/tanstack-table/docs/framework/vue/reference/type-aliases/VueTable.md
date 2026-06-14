---
id: VueTable
title: VueTable
---

# Type Alias: VueTable\<TFeatures, TData\>

```ts
type VueTable<TFeatures, TData> = Omit<Table<TFeatures, TData>, "store"> & object;
```

Defined in: [packages/vue-table/src/useTable.ts:47](https://github.com/TanStack/table/blob/main/packages/vue-table/src/useTable.ts#L47)

## Type Declaration

### ~~store~~

```ts
readonly store: Table<TFeatures, TData>["store"];
```

#### Deprecated

Prefer `table.atoms.<slice>.get()` for slice snapshots, or
`table.Subscribe` for explicit subscriptions. `table.store.state` is a
current-value snapshot and is easy to misuse in render code.

### Subscribe()

```ts
Subscribe: (props) => VNode | VNode[];
```

Creates a reactive render boundary. The child function reads the table
atoms it needs, so Vue only tracks those atom reads.

#### Parameters

##### props

###### children

(`atoms`) => `VNode` \| `VNode`[]

#### Returns

`VNode` \| `VNode`[]

## Type Parameters

### TFeatures

`TFeatures` *extends* `TableFeatures`

### TData

`TData` *extends* `RowData`
