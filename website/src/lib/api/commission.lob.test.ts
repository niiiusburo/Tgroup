/**
 * commission.lob.test.ts — Tests for LOB-aware commission config fetch/save
 */

import { describe, it, expect, vi } from 'vitest';
import { fetchCommissionConfig, saveCommissionConfig, type CommissionConfig } from './commission';
import * as core from './core';

// Mock the apiFetch function from core
vi.mock('./core', () => ({
  apiFetch: vi.fn(),
}));

describe('Commission Config — LOB Awareness', () => {
  const mockConfig: CommissionConfig = {
    levels: [
      { level: 1, label: 'Level 1', enabled: true, share_percent: 30 },
      { level: 2, label: 'Level 2', enabled: true, share_percent: 20 },
    ],
    defaultReferralPercent: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchCommissionConfig', () => {
    it('calls apiFetch with lob option for cosmetic LOB', async () => {
      const mockApiFetch = vi.mocked(core.apiFetch);
      mockApiFetch.mockResolvedValueOnce(mockConfig);

      const result = await fetchCommissionConfig('cosmetic');

      expect(mockApiFetch).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith('/CommissionConfig', { lob: 'cosmetic' });
      expect(result).toEqual(mockConfig);
    });

    it('calls apiFetch with lob option for dental LOB', async () => {
      const mockApiFetch = vi.mocked(core.apiFetch);
      mockApiFetch.mockResolvedValueOnce(mockConfig);

      const result = await fetchCommissionConfig('dental');

      expect(mockApiFetch).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith('/CommissionConfig', { lob: 'dental' });
      expect(result).toEqual(mockConfig);
    });

    it('calls apiFetch without lob option when lob is undefined', async () => {
      const mockApiFetch = vi.mocked(core.apiFetch);
      mockApiFetch.mockResolvedValueOnce(mockConfig);

      const result = await fetchCommissionConfig();

      expect(mockApiFetch).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith('/CommissionConfig', { lob: undefined });
      expect(result).toEqual(mockConfig);
    });
  });

  describe('saveCommissionConfig', () => {
    it('calls apiFetch with lob option for cosmetic LOB', async () => {
      const mockApiFetch = vi.mocked(core.apiFetch);
      mockApiFetch.mockResolvedValueOnce(mockConfig);

      const result = await saveCommissionConfig(mockConfig, 'cosmetic');

      expect(mockApiFetch).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith('/CommissionConfig', {
        method: 'PUT',
        body: mockConfig,
        lob: 'cosmetic',
      });
      expect(result).toEqual(mockConfig);
    });

    it('calls apiFetch with lob option for dental LOB', async () => {
      const mockApiFetch = vi.mocked(core.apiFetch);
      mockApiFetch.mockResolvedValueOnce(mockConfig);

      const result = await saveCommissionConfig(mockConfig, 'dental');

      expect(mockApiFetch).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith('/CommissionConfig', {
        method: 'PUT',
        body: mockConfig,
        lob: 'dental',
      });
      expect(result).toEqual(mockConfig);
    });

    it('calls apiFetch without lob option when lob is undefined', async () => {
      const mockApiFetch = vi.mocked(core.apiFetch);
      mockApiFetch.mockResolvedValueOnce(mockConfig);

      const result = await saveCommissionConfig(mockConfig);

      expect(mockApiFetch).toHaveBeenCalledOnce();
      expect(mockApiFetch).toHaveBeenCalledWith('/CommissionConfig', {
        method: 'PUT',
        body: mockConfig,
        lob: undefined,
      });
      expect(result).toEqual(mockConfig);
    });
  });
});
