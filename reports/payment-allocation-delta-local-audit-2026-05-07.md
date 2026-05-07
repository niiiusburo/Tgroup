# Local Payment Allocation Delta Audit - 2026-05-07

Scope: local database `tdental_demo` on `127.0.0.1:5433`.

Local app URLs:
- Website: `http://localhost:5175`
- API: `http://localhost:3002`
- Customer profile pattern: `http://localhost:5175/customers/<customer_id>`

Summary:
- Affected service rows: `3,744`
- Affected customers: `3,495`
- Total raw allocation overstatement protected by the corrected read model: `27,579,859,139 ₫`

Notes:
- "Before paid" is what the old `/api/SaleOrders/lines` calculation could show from raw imported `payment_allocations`.
- "After paid" is the corrected local read model, capped back to actual posted payment amounts.
- "Before remaining" is shown as the customer-facing derived remaining amount, so overpaid rows display `0 ₫` rather than a negative number.
- The database rows have not been mutated; this is a local read/display correction.

| Service code | Customer code | Customer ID | Customer name | Total | Before paid | Before remaining | After paid | After remaining | Delta | Local profile |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|---|
| SO05859 | T4066 | 73e573e9-5b2a-485f-84bf-b0d0009bbe72 | KO TIAM WEE DANNY - G | 170,000,000 ₫ | 510,000,000 ₫ | 0 ₫ | 170,000,000 ₫ | 0 ₫ | 340,000,000 ₫ | http://localhost:5175/customers/73e573e9-5b2a-485f-84bf-b0d0009bbe72 |
| SO05860 | T4066 | 73e573e9-5b2a-485f-84bf-b0d0009bbe72 | KO TIAM WEE DANNY - G | 98,000,000 ₫ | 294,000,000 ₫ | 0 ₫ | 98,000,000 ₫ | 0 ₫ | 196,000,000 ₫ | http://localhost:5175/customers/73e573e9-5b2a-485f-84bf-b0d0009bbe72 |
| SO43280 | T052362 | 7060fd02-15e3-47e5-8f61-b32e00cbb79a | BÙI THU UYÊN-G | 70,400,000 ₫ | 211,200,000 ₫ | 0 ₫ | 70,400,000 ₫ | 0 ₫ | 140,800,000 ₫ | http://localhost:5175/customers/7060fd02-15e3-47e5-8f61-b32e00cbb79a |
| SO11455 | T6868 | cdda647f-9960-4f71-968c-b14f00bce07d | Nguyễn Thị Hồng Vân | 60,000,000 ₫ | 180,000,000 ₫ | 0 ₫ | 60,000,000 ₫ | 0 ₫ | 120,000,000 ₫ | http://localhost:5175/customers/cdda647f-9960-4f71-968c-b14f00bce07d |
| SO57263 | T059568 | 50425d1c-2086-4c01-aa16-b3e800317a16 | NGÔ THỊ KIM LOAN - G1 + 26 | 110,000,000 ₫ | 220,000,000 ₫ | 0 ₫ | 110,000,000 ₫ | 0 ₫ | 110,000,000 ₫ | http://localhost:5175/customers/50425d1c-2086-4c01-aa16-b3e800317a16 |
| SO58944 | T161242 | 23b1417c-e9a5-4146-86e4-b40d00a2d495 | HUỲNH GIA YẾN | 79,704,000 ₫ | 159,408,000 ₫ | 0 ₫ | 79,704,000 ₫ | 0 ₫ | 79,704,000 ₫ | http://localhost:5175/customers/23b1417c-e9a5-4146-86e4-b40d00a2d495 |
| SO51396 | T056391 | d02460ea-e02d-4ba4-a648-b39d009b4017 | LƯƠNG THỊ NGỌC DUNG | 75,600,000 ₫ | 151,200,000 ₫ | 0 ₫ | 75,600,000 ₫ | 0 ₫ | 75,600,000 ₫ | http://localhost:5175/customers/d02460ea-e02d-4ba4-a648-b39d009b4017 |
| SO61029 | T161879 | cda91ec5-dcb4-4377-a21b-b416002bc386 | TRÌ VƯƠNG PHƯƠNG UYÊN - G1 + 26 | 75,000,000 ₫ | 150,000,000 ₫ | 0 ₫ | 75,000,000 ₫ | 0 ₫ | 75,000,000 ₫ | http://localhost:5175/customers/cda91ec5-dcb4-4377-a21b-b416002bc386 |
| SO20176 | T11865 | 77417936-ce72-48c6-a16f-b1eb0076d426 | Trương Thị Thùy Linh (17) - Invisalign | 72,000,000 ₫ | 144,000,000 ₫ | 0 ₫ | 72,000,000 ₫ | 0 ₫ | 72,000,000 ₫ | http://localhost:5175/customers/77417936-ce72-48c6-a16f-b1eb0076d426 |
| SO57682 | T058201 | cd60ebd2-1415-4e59-8e5c-b3ce003360d0 | NGUYỄN THỊ THANH TÂM | 66,000,000 ₫ | 132,000,000 ₫ | 0 ₫ | 66,000,000 ₫ | 0 ₫ | 66,000,000 ₫ | http://localhost:5175/customers/cd60ebd2-1415-4e59-8e5c-b3ce003360d0 |
| SO08111 | T5261 | f6b0dd82-46e3-42d7-a2ef-b12300cde43a | BÙI THỊ NGỌC TRÂM | 65,000,000 ₫ | 130,000,000 ₫ | 0 ₫ | 65,000,000 ₫ | 0 ₫ | 65,000,000 ₫ | http://localhost:5175/customers/f6b0dd82-46e3-42d7-a2ef-b12300cde43a |
| SO52797 | T056796 | a6cde454-527f-46d8-8946-b3a800c28df7 | NGUYỄN LÊ BĂNG SƯƠNG - UP SALE | 63,500,000 ₫ | 127,000,000 ₫ | 0 ₫ | 63,500,000 ₫ | 0 ₫ | 63,500,000 ₫ | http://localhost:5175/customers/a6cde454-527f-46d8-8946-b3a800c28df7 |
| SO51611 | T055218 | b2dcc79a-dd0b-4624-acf7-b37a006b07cb | PHẠM THỊ MINH HUYỀN | 31,000,000 ₫ | 93,000,000 ₫ | 0 ₫ | 31,000,000 ₫ | 0 ₫ | 62,000,000 ₫ | http://localhost:5175/customers/b2dcc79a-dd0b-4624-acf7-b37a006b07cb |
| SO50773 | T055990 | a5a89433-420a-40dd-801c-b39000b34540 | NGÔ THỊ PHƯƠNG | 31,000,000 ₫ | 93,000,000 ₫ | 0 ₫ | 31,000,000 ₫ | 0 ₫ | 62,000,000 ₫ | http://localhost:5175/customers/a5a89433-420a-40dd-801c-b39000b34540 |
| SO53183 | T057081 | 3ae2bcd8-1c71-4e34-aa1f-b3b0006ed64f | NGUYỄN HOÀNG ANH (CHỤP LẠI TẤM PANO) | 31,000,000 ₫ | 93,000,000 ₫ | 0 ₫ | 31,000,000 ₫ | 0 ₫ | 62,000,000 ₫ | http://localhost:5175/customers/3ae2bcd8-1c71-4e34-aa1f-b3b0006ed64f |
| SO45243 | T050557 | 77784d1e-a665-4597-a876-b3050020c508 | TRẦN KHÁNH ĐĂNG | 19,800,000 ₫ | 17,600,000 ₫ | 2,200,000 ₫ | 15,400,000 ₫ | 4,400,000 ₫ | 2,200,000 ₫ | http://localhost:5175/customers/77784d1e-a665-4597-a876-b3050020c508 |

