import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapRows, __test as h } from '../src/fieldMapper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES = path.resolve(__dirname, '..', 'recon', 'samples');

function loadFixture(name: string): any {
  const raw = fs.readFileSync(path.join(SAMPLES, name), 'utf8');
  return JSON.parse(raw);
}

function items(fixture: any): unknown[] {
  if (Array.isArray(fixture)) return fixture;
  if (Array.isArray(fixture.items)) return fixture.items;
  return [fixture];
}

describe('fieldMapper helpers', () => {
  it('toUuid filters all-zero GUIDs', () => {
    expect(h.toUuid('00000000-0000-0000-0000-000000000000')).toBe(null);
    expect(h.toUuid('dde8b85e-e35a-41fa-4a6b-08de107d59ec')).toBe('dde8b85e-e35a-41fa-4a6b-08de107d59ec');
    expect(h.toUuid('')).toBe(null);
    expect(h.toUuid(null)).toBe(null);
  });

  it('toDate parses ISO and dd/MM/yyyy', () => {
    expect(h.toDate('2026-04-13T19:30:00')).toBeInstanceOf(Date);
    expect(h.toDate('13/04/2026 14:20:09')).toBeInstanceOf(Date);
    expect(h.toDate('')).toBe(null);
    expect(h.toDate(null)).toBe(null);
  });

  it('toBool handles common forms', () => {
    expect(h.toBool(true)).toBe(true);
    expect(h.toBool('true')).toBe(true);
    expect(h.toBool('false')).toBe(false);
    expect(h.toBool(null, false)).toBe(false);
    expect(h.toBool(undefined, true)).toBe(true);
  });

  it('pickNested walks object paths', () => {
    expect(h.pickNested({ a: { b: { c: 3 } } }, ['a', 'b', 'c'])).toBe(3);
    expect(h.pickNested({ a: null }, ['a', 'b'])).toBe(null);
  });
});

describe('fieldMapper — companies', () => {
  const fixture = loadFixture('companies.json');
  const { pgRows, errors } = mapRows('companies', items(fixture));
  it('maps all rows, no errors', () => {
    expect(errors).toEqual([]);
    expect(pgRows.length).toBe(items(fixture).length);
  });
  it('includes id, name, active', () => {
    expect(pgRows[0].id).toBe('dde8b85e-e35a-41fa-4a6b-08de107d59ec');
    expect(pgRows[0].name).toBe('Nha khoa Tấm Dentist');
    expect(pgRows[0].active).toBe(true);
  });
});

describe('fieldMapper — partners (skinny list row)', () => {
  const fixture = loadFixture('partners.json');
  const { pgRows, errors } = mapRows('partners', items(fixture));
  it('maps all rows', () => {
    expect(errors).toEqual([]);
    expect(pgRows.length).toBe(items(fixture).length);
  });
  it('preserves Vietnamese strings', () => {
    const second = pgRows.find((r) => r.ref === 'T163296');
    expect(second).toBeDefined();
    expect(second!.name).toBe('Lư Tuyết NGHI');
    expect(second!.comment).toContain('Tư vấn');
  });
  it('coerces id to uuid string', () => {
    for (const r of pgRows) expect(typeof r.id).toBe('string');
  });
});

describe('fieldMapper — partners (fat detail)', () => {
  const fixture = loadFixture('partner_detail.json');
  const { pgRows, errors } = mapRows('partners', [fixture]);
  it('maps nested marketingTeam.teamId / contactStatus.id', () => {
    expect(errors).toEqual([]);
    expect(pgRows.length).toBe(1);
    const r = pgRows[0];
    expect(r.id).toBe('5f024f98-1f02-4363-a359-b2ea003e477c');
    expect(r.companyid).toBe('b178d5ee-d9ac-477e-088e-08db9a4c4cf4');
    // Nested extraction: marketingTeam.teamId is null -> nullable uuid
    expect(r.marketingteamid).toBe(null);
    expect(r.contactstatusid).toBe(null);
  });
});

describe('fieldMapper — saleorders (flatten partner.id)', () => {
  const fixture = loadFixture('saleorders.json');
  const { pgRows, errors } = mapRows('saleorders', items(fixture));
  it('maps rows without errors', () => {
    expect(errors).toEqual([]);
    expect(pgRows.length).toBe(items(fixture).length);
  });
  it('pulls partnerId either from flat or nested partner.id', () => {
    const first = pgRows[0];
    expect(first.partnerid).toBe('48effc50-6ca2-4e95-a494-b42b00cc8cf7');
    expect(first.amounttotal).toBe(700000);
    expect(first.state).toBe('sale');
  });
});

describe('fieldMapper — saleorderlines', () => {
  const fixture = loadFixture('saleorderlines.json');
  const { pgRows, errors } = mapRows('saleorderlines', items(fixture));
  it('maps rows', () => {
    expect(errors).toEqual([]);
    expect(pgRows.length).toBe(items(fixture).length);
  });
  it('captures order linkage + pricing', () => {
    const first = pgRows[0];
    expect(first.orderid).toBe('ffa62622-5ab8-41ca-aecd-b3d3004b53f1');
    expect(first.productid).toBe('468fa1df-5ebb-4aa6-82cf-b05b00a64ed3');
    expect(first.productuomqty).toBe(2);
  });
});

describe('fieldMapper — dotkhams', () => {
  const fixture = loadFixture('dotkhams.json');
  const { pgRows, errors } = mapRows('dotkhams', items(fixture));
  it('maps rows, preserves Vietnamese', () => {
    expect(errors).toEqual([]);
    expect(pgRows.length).toBe(items(fixture).length);
    const first = pgRows[0];
    expect(first.name).toBe('DK/2026/90464');
    expect(typeof first.reason).toBe('string');
    // Unicode-normalize: source uses decomposed form
    expect((first.reason as string).normalize('NFC')).toContain('TRÁM'.normalize('NFC'));
  });
});

describe('fieldMapper — appointments', () => {
  const fixture = loadFixture('appointments.json');
  const { pgRows, errors } = mapRows('appointments', items(fixture));
  it('maps rows', () => {
    expect(errors).toEqual([]);
    expect(pgRows.length).toBe(items(fixture).length);
  });
  it('coerces date to Date and FK fields to uuid', () => {
    expect(pgRows[0].date).toBeInstanceOf(Date);
    expect(pgRows[0].partnerid).toBe('10dd564c-4bef-4e9e-a609-b0dc00658ed9');
  });
});

describe('fieldMapper — accountpayments (nested journal.id)', () => {
  const fixture = loadFixture('accountpayments.json');
  const { pgRows, errors } = mapRows('accountpayments', items(fixture));
  it('extracts journalid from nested journal', () => {
    expect(errors).toEqual([]);
    expect(pgRows[0].journalid).toBe('731f4676-3f9d-4777-b47c-b13f003eb7e5');
    expect(pgRows[0].amount).toBe(800000);
  });
});

describe('fieldMapper — customerreceipts', () => {
  const fixture = loadFixture('customerreceipts.json');
  const { pgRows, errors } = mapRows('customerreceipts', items(fixture));
  it('maps rows with Date instances for datewaiting', () => {
    expect(errors).toEqual([]);
    expect(pgRows[0].datewaiting).toBeInstanceOf(Date);
    expect(pgRows[0].partnerid).toBe('53992f1b-84aa-48e1-b6eb-afe5007a4f7b');
  });
});

describe('fieldMapper — products', () => {
  const fixture = loadFixture('products.json');
  const { pgRows, errors } = mapRows('products', items(fixture));
  it('maps rows', () => {
    expect(errors).toEqual([]);
    expect(pgRows[0].listprice).toBe(1);
    expect(pgRows[1].listprice).toBe(3000000);
  });
});

describe('fieldMapper — partneradvances', () => {
  const fixture = loadFixture('partneradvances.json');
  const { pgRows, errors } = mapRows('partneradvances', items(fixture));
  it('maps rows', () => {
    expect(errors).toEqual([]);
    expect(pgRows[0].amount).toBe(1000000);
    expect(pgRows[0].type).toBe('advance');
    expect(pgRows[0].state).toBe('confirmed');
  });
});

describe('fieldMapper — null handling', () => {
  it('rows missing id are pushed to errors, not pgRows', () => {
    const { pgRows, errors } = mapRows('companies', [
      { id: null, name: 'x' },
      { id: 'dde8b85e-e35a-41fa-4a6b-08de107d59ec', name: 'ok' },
    ]);
    expect(errors.length).toBe(1);
    expect(pgRows.length).toBe(1);
  });
});
