---
id: AppHeaderPropsWithSelector
title: AppHeaderPropsWithSelector
---

# Interface: AppHeaderPropsWithSelector\<TFeatures, TData, TValue, THeaderComponents, TSelected\>

Defined in: [createTableHook.tsx:349](https://github.com/TanStack/table/blob/main/packages/react-table/src/createTableHook.tsx#L349)

Props for AppHeader/AppFooter component - with selector

## Type Parameters

### TFeatures

`TFeatures` *extends* `TableFeatures`

### TData

`TData` *extends* `RowData`

### TValue

`TValue` *extends* `CellData`

### THeaderComponents

`THeaderComponents` *extends* `Record`\<`string`, `ComponentType`\<`any`\>\>

### TSelected

`TSelected`

## Properties

### children()

```ts
children: (header, state) => ReactNode;
```

Defined in: [createTableHook.tsx:357](https://github.com/TanStack/table/blob/main/packages/react-table/src/createTableHook.tsx#L357)

#### Parameters

##### header

`Header_Core`\<`TFeatures`, `TData`, `TValue`\> & `ExtractFeatureMapTypes`\<`TFeatures`, `Header_FeatureMap`\> & `THeaderComponents` & `object`

##### state

`TSelected`

#### Returns

`ReactNode`

***

### header

```ts
header: Header<TFeatures, TData, TValue>;
```

Defined in: [createTableHook.tsx:356](https://github.com/TanStack/table/blob/main/packages/react-table/src/createTableHook.tsx#L356)

***

### selector()

```ts
selector: (state) => TSelected;
```

Defined in: [createTableHook.tsx:362](https://github.com/TanStack/table/blob/main/packages/react-table/src/createTableHook.tsx#L362)

#### Parameters

##### state

`TableState`\<`TFeatures`\>

#### Returns

`TSelected`
