---
id: AppCellPropsWithSelector
title: AppCellPropsWithSelector
---

# Interface: AppCellPropsWithSelector\<TFeatures, TData, TValue, TCellComponents, TSelected\>

Defined in: [createTableHook.tsx:313](https://github.com/TanStack/table/blob/main/packages/preact-table/src/createTableHook.tsx#L313)

Props for AppCell component - with selector

## Type Parameters

### TFeatures

`TFeatures` *extends* `TableFeatures`

### TData

`TData` *extends* `RowData`

### TValue

`TValue` *extends* `CellData`

### TCellComponents

`TCellComponents` *extends* `Record`\<`string`, `ComponentType`\<`any`\>\>

### TSelected

`TSelected`

## Properties

### cell

```ts
cell: Cell<TFeatures, TData, TValue>;
```

Defined in: [createTableHook.tsx:320](https://github.com/TanStack/table/blob/main/packages/preact-table/src/createTableHook.tsx#L320)

***

### children()

```ts
children: (cell, state) => ComponentChildren;
```

Defined in: [createTableHook.tsx:321](https://github.com/TanStack/table/blob/main/packages/preact-table/src/createTableHook.tsx#L321)

#### Parameters

##### cell

`Cell_Core`\<`TFeatures`, `TData`, `TValue`\> & `ExtractFeatureMapTypes`\<`TFeatures`, `Cell_FeatureMap`\> & `TCellComponents` & `object`

##### state

`TSelected`

#### Returns

`ComponentChildren`

***

### selector()

```ts
selector: (state) => TSelected;
```

Defined in: [createTableHook.tsx:326](https://github.com/TanStack/table/blob/main/packages/preact-table/src/createTableHook.tsx#L326)

#### Parameters

##### state

`TableState`\<`TFeatures`\>

#### Returns

`TSelected`
