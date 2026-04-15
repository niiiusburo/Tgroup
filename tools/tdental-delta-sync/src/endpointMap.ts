import fs from 'node:fs';
import path from 'node:path';
import type { EndpointEntry, WindowStrategy } from './types.js';

const STRATEGY: Record<string, WindowStrategy> = {
  partners: 'detail-follow',
  saleorders: 'detail-follow',
  saleorderlines: 'single',
  dotkhams: 'single',
  appointments: 'two-pass',
  accountpayments: 'detail-follow',
  customerreceipts: 'paired',
  partneradvances: 'detail-follow',
  companies: 'all',
  products: 'all',
  productcategories: 'all',
  employees: 'detail-follow',
  aspnetusers: 'all',
};

export const SKIP_TABLES = new Set([
  'accountinvoices',
  'accountinvoicelines',
  'dotkhamstepv2s',
  'dotkhamsteps',
]);

export class EndpointMap {
  constructor(private data: Record<string, any>) {}

  static load(filePath: string): EndpointMap {
    const abs = path.resolve(filePath);
    const raw = fs.readFileSync(abs, 'utf8');
    const parsed = JSON.parse(raw);
    return new EndpointMap(parsed);
  }

  orderedTables(): string[] {
    return [
      'companies',
      'aspnetusers',
      'employees',
      'productcategories',
      'products',
      'partners',
      'appointments',
      'customerreceipts',
      'saleorders',
      'saleorderlines',
      'dotkhams',
      'accountpayments',
      'partneradvances',
    ];
  }

  get(table: string): EndpointEntry & { windowStrategy: WindowStrategy } {
    const raw = this.data[table];
    if (!raw || typeof raw !== 'object') {
      throw new Error(`EndpointMap: no entry for table '${table}'`);
    }
    const strategy = STRATEGY[table];
    if (!strategy) {
      throw new Error(`EndpointMap: no windowStrategy configured for table '${table}'`);
    }
    return {
      list_url: raw.list_url,
      method: raw.method ?? 'GET',
      pagination: raw.pagination ?? { style: 'offset', param_limit: 'limit', param_offset: 'offset', default_size: 100 },
      delta_filter: raw.delta_filter ?? { supported: false },
      id_field: raw.id_field ?? 'id',
      required_query_params: raw.required_query_params ?? [],
      useful_query_params: raw.useful_query_params ?? [],
      fat_detail_url: raw.fat_detail_url,
      notes: raw.notes,
      windowStrategy: strategy,
    };
  }

  has(table: string): boolean {
    return typeof this.data[table] === 'object' && this.data[table] !== null;
  }

  baseUrl(): string {
    return this.data._meta?.base_url ?? 'https://tamdentist.tdental.vn';
  }
}
