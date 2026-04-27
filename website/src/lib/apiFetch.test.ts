import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, deleteFeedbackThread, fetchProducts, fetchEmployees, fetchPartners } from './api';

describe('apiFetch', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
    localStorage.setItem('tgclinic_token', 'test-token');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.removeItem('tgclinic_token');
  });

  it('should return undefined for 204 No Content responses', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    } as Response);

    const result = await apiFetch<void>('/Feedback/all/thread-123', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('should parse JSON for normal 200 responses', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'thread-123', status: 'pending' }),
    } as Response);

    const result = await apiFetch('/Feedback/all/thread-123');
    expect(result).toEqual({ id: 'thread-123', status: 'pending' });
  });

  it('deleteFeedbackThread should call DELETE and return undefined on 204', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    } as Response);

    const result = await deleteFeedbackThread('thread-456');
    expect(result).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/Feedback/all/thread-456'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('apiFetch query param serialization', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ totalItems: 0, items: [] }), { status: 200 })
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function calledUrl(): string {
    const call = fetchSpy.mock.calls[0];
    return String(call[0]);
  }

  it('preserves categId for /Products', async () => {
    await fetchProducts({ categId: 'CAT-123' });
    expect(calledUrl()).toMatch(/[?&]categId=CAT-123/);
    expect(calledUrl()).not.toMatch(/categ_id=/);
  });

  it('preserves companyId for /Products', async () => {
    await fetchProducts({ companyId: 'CO-1' });
    expect(calledUrl()).toMatch(/[?&]companyId=CO-1/);
    expect(calledUrl()).not.toMatch(/company_id=/);
  });

  it('preserves active for /Products', async () => {
    await fetchProducts({ active: 'false' });
    expect(calledUrl()).toMatch(/[?&]active=false/);
  });

  it('preserves companyId for /Employees', async () => {
    await fetchEmployees({ companyId: 'CO-1' });
    expect(calledUrl()).toMatch(/[?&]companyId=CO-1/);
    expect(calledUrl()).not.toMatch(/company_id=/);
  });

  it('preserves sortField/sortOrder when passed via apiFetch params', async () => {
    await apiFetch('/Partners', { params: { sortField: 'name', sortOrder: 'asc' } });
    expect(calledUrl()).toMatch(/[?&]sortField=name/);
    expect(calledUrl()).toMatch(/[?&]sortOrder=asc/);
    expect(calledUrl()).not.toMatch(/sort_field=|sort_order=/);
  });
});
