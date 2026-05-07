# TestSprite Feature: Overview Accent-Insensitive Search

## Target

- Frontend URL: `/`
- Product surface: Overview dashboard
- Search inputs: `Lịch trình ngày`, `Today's Services / Activity`, and `Lịch hẹn hôm nay`

## Acceptance Criteria

- `Lịch trình ngày` search matches accented appointment text when staff type without accents.
- `Lịch hẹn hôm nay` search matches accented appointment text when staff type without accents.
- Match fields include customer name, phone, doctor, assistant, TLBS, branch/location, appointment time, and note.
- Vietnamese `đ` and `Đ` match `d`.
- Typing into `Lịch trình ngày` does not change the `Lịch hẹn hôm nay` search value.
- Typing into `Lịch hẹn hôm nay` does not change the `Lịch trình ngày` search value.
- The sticky global Overview finder is absent.
- `Today's Services / Activity` has no service rows yet; when rows exist, its search must use the same accent-insensitive rule.

## Suggested TestSprite Steps

1. Sign in with the configured TestSprite login credentials.
2. Navigate to `/`.
3. Confirm the sticky global Overview finder is not visible.
4. In `Lịch trình ngày`, search `nguyen`, `thoai`, or another unaccented term that exists in accented appointment text.
5. Assert matching accented cards remain visible and non-matching cards are filtered out.
6. Confirm the `Lịch hẹn hôm nay` search input value did not change.
7. Clear `Lịch trình ngày`.
8. In `Lịch hẹn hôm nay`, search `duong`, `quyen`, or another unaccented term that exists in accented appointment text.
9. Assert matching accented cards remain visible and non-matching cards are filtered out.
10. Confirm the `Lịch trình ngày` search input value did not change.
11. If the middle services table has service rows in the future, repeat the same unaccented search check there.

## Edge Cases

- Uppercase accented names match lowercase unaccented input.
- Extra spaces around the search term are ignored.
- Accented input still works.
- Phone numbers, appointment times, doctor names, assistant names, TLBS names, locations, and notes remain searchable.
- Empty search restores the normal section list.

## Regression Checks

- Overview section searches remain independent.
- Overview card hover or click does not select, highlight, or auto-scroll a matching card in the other section.
- Quick `Hẹn mới` remains visible on `/`.
- Appointment edit modal still opens from appointment cards.

## Setup Data / Login State

- Use an authenticated admin or receptionist session.
- Prefer seeded appointments for today with accented Vietnamese names such as `NGUYỄN THỊ THOẠI HẰNG`, `DƯƠNG MINH TIẾN`, `Phạm Thị Thảo Quyền`, or equivalent accented doctor/customer names.
- Do not edit real patient records for this check.
