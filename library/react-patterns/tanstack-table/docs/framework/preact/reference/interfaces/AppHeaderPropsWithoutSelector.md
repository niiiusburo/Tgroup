---
id: AppHeaderPropsWithoutSelector
title: AppHeaderPropsWithoutSelector
---

# Interface: AppHeaderPropsWithoutSelector\<TFeatures, TData, TValue, THeaderComponents\>

Defined in: [createTableHook.tsx:332](https://github.com/TanStack/table/blob/main/packages/preact-table/src/createTableHook.tsx#L332)

Props for AppHeader/AppFooter component - without selector

## Type Parameters

### TFeatures

`TFeatures` *extends* `TableFeatures`

### TData

`TData` *extends* `RowData`

### TValue

`TValue` *extends* `CellData`

### THeaderComponents

`THeaderComponents` *extends* `Record`\<`string`, `ComponentType`\<`any`\>\>

## Properties

### children()

```ts
children: (header) => ComponentChildren;
```

Defined in: [createTableHook.tsx:339](https://github.com/TanStack/table/blob/main/packages/preact-table/src/createTableHook.tsx#L339)

#### Parameters

##### header

`Header_Core`\<`TFeatures`, `TData`, `TValue`\> & `ExtractFeatureMapTypes`\<`TFeatures`, `Header_FeatureMap`\> & `THeaderComponents` & `object`

#### Returns

`ComponentChildren`

***

### header

```ts
header: Header<TFeatures, TData, TValue>;
```

Defined in: [createTableHook.tsx:338](https://github.com/TanStack/table/blob/main/packages/preact-table/src/createTableHook.tsx#L338)

***

### selector?

```ts
optional selector: undefined;
```

Defined in: [createTableHook.tsx:343](https://github.com/TanStack/table/blob/main/packages/preact-table/src/createTableHook.tsx#L343)
