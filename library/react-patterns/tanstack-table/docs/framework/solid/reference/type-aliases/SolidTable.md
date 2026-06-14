---
id: SolidTable
title: SolidTable
---

# Type Alias: SolidTable\<TFeatures, TData\>

```ts
type SolidTable<TFeatures, TData> = Omit<Table<TFeatures, TData>, "store"> & object;
```

Defined in: [createTable.ts:20](https://github.com/TanStack/table/blob/main/packages/solid-table/src/createTable.ts#L20)

## Type Declaration

### FlexRender

```ts
FlexRender: typeof FlexRender;
```

Convenience FlexRender component attached to the table instance for
rendering headers, cells, or footers with custom markup. Mirrors the
`table.FlexRender` API exposed by `createTableHook`'s `createAppTable`.

#### Example

```ts
<table.FlexRender header={header} />
<table.FlexRender cell={cell} />
<table.FlexRender footer={footer} />
```

### ~~store~~

```ts
readonly store: Table<TFeatures, TData>["store"];
```

#### Deprecated

Prefer `table.atoms.<slice>.get()` for slice-level reactive
reads, or `table.Subscribe` for explicit subscriptions. `table.store.state`
is a current-value snapshot and is easy to misuse in render code.

### Subscribe()

```ts
Subscribe: (props) => JSX.Element;
```

Creates a reactive render boundary. The child function reads the table
atoms it needs, so Solid only tracks those atom reads.

#### Parameters

##### props

###### children

(`atoms`) => `JSX.Element`

#### Returns

`JSX.Element`

## Type Parameters

### TFeatures

`TFeatures` *extends* `TableFeatures`

### TData

`TData` *extends* `RowData`
