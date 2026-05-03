import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MatrixView } from './MatrixView';
import type { PermissionGroup } from '@/lib/api';

const editableGroup: PermissionGroup = {
  id: 'viewer',
  name: 'Viewer',
  color: '#2563eb',
  description: 'Read-only staff',
  permissions: ['calendar.view'],
  isSystem: false,
};

describe('MatrixView mutation gate', () => {
  it('disables permission toggles when the current user cannot edit permissions', () => {
    const onToggle = vi.fn();

    render(<MatrixView groups={[editableGroup]} onToggle={onToggle} canEdit={false} />);

    const toggle = screen.getByTitle('Requires permissions.edit to change calendar.view for Viewer');
    expect(toggle).toBeDisabled();

    fireEvent.click(toggle);

    expect(onToggle).not.toHaveBeenCalled();
  });
});
