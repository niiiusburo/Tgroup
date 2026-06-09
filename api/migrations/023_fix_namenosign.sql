-- @crossref:domain[settings-system]
-- @crossref:used-in[NK3 schema migration: api/migrations/023_fix_namenosign]
-- @crossref:uses[product-map/domains/settings-system.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Fix existing namenosign values to be accent-insensitive
-- Uses TRANSLATE for simple 1-to-1 character replacement

UPDATE dbo.products
SET namenosign = LOWER(
  TRANSLATE(
    name,
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
  )
)
WHERE namenosign IS NOT NULL;
