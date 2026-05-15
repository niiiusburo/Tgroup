import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReportDoctorCombobox, ReportFilterCombobox } from '../ReportDoctorCombobox';

const doctors = [
  { id: 'doc-1', name: 'Bác sĩ Nguyễn Văn A', ref: 'NV00111' },
  { id: 'doc-2', name: 'Bác sĩ Trần Thị B', ref: 'NV00010' },
  { id: 'doc-3', name: 'Doctor Plain', ref: null },
];

function renderCombobox(overrides = {}) {
  const onChange = vi.fn();
  render(
    <ReportDoctorCombobox
      value="all"
      onChange={onChange}
      doctors={doctors}
      allLabel="Tất cả bác sĩ"
      loadingLabel="Đang tải bác sĩ..."
      searchPlaceholder="Tìm tên hoặc mã bác sĩ..."
      noResultsLabel="Không tìm thấy bác sĩ phù hợp"
      clearLabel="Xóa lọc bác sĩ"
      {...overrides}
    />
  );
  return onChange;
}

describe('ReportDoctorCombobox', () => {
  it('filters doctors in real time with accent-insensitive name search', () => {
    renderCombobox();

    fireEvent.click(screen.getByRole('button', { name: /tất cả bác sĩ/i }));
    fireEvent.change(screen.getByPlaceholderText('Tìm tên hoặc mã bác sĩ...'), {
      target: { value: 'Nguyen' },
    });

    expect(screen.getByText('Bác sĩ Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.queryByText('Bác sĩ Trần Thị B')).not.toBeInTheDocument();
  });

  it('filters doctors by employee code and selects the chosen doctor', () => {
    const onChange = renderCombobox();

    fireEvent.click(screen.getByRole('button', { name: /tất cả bác sĩ/i }));
    fireEvent.change(screen.getByPlaceholderText('Tìm tên hoặc mã bác sĩ...'), {
      target: { value: 'NV00010' },
    });
    fireEvent.click(screen.getByText('Bác sĩ Trần Thị B'));

    expect(onChange).toHaveBeenCalledWith('doc-2');
  });

  it('uses the same searchable dropdown design for locations', () => {
    const onChange = vi.fn();
    render(
      <ReportFilterCombobox
        value="all"
        onChange={onChange}
        options={[
          { id: 'loc-1', label: 'Tấm Dentist Quận 3' },
          { id: 'loc-2', label: 'Tấm Dentist Thủ Đức' },
        ]}
        allLabel="Tất cả chi nhánh"
        loadingLabel="Đang tải chi nhánh..."
        searchPlaceholder="Tìm chi nhánh..."
        noResultsLabel="Không tìm thấy chi nhánh phù hợp"
        clearLabel="Xóa lọc chi nhánh"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /tất cả chi nhánh/i }));
    fireEvent.change(screen.getByPlaceholderText('Tìm chi nhánh...'), {
      target: { value: 'thu duc' },
    });

    expect(screen.getByText('Tấm Dentist Thủ Đức')).toBeInTheDocument();
    expect(screen.queryByText('Tấm Dentist Quận 3')).not.toBeInTheDocument();
  });
});
