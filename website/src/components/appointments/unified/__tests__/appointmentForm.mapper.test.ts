import { describe, it, expect } from 'vitest';
import { formDataToApiPayload, apiAppointmentToFormData } from '../appointmentForm.mapper';
import { AppointmentCreateSchema, AppointmentUpdateSchema } from '@tgroup/contracts';
import type { UnifiedAppointmentFormData } from '../appointmentForm.types';

function makeValidFormData(): UnifiedAppointmentFormData {
  return {
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    customerName: 'John Doe',
    customerPhone: '0901234567',
    doctorId: '660e8400-e29b-41d4-a716-446655440001',
    doctorName: 'Dr. Smith',
    assistantId: undefined,
    assistantName: undefined,
    dentalAideId: undefined,
    dentalAideName: undefined,
    locationId: '770e8400-e29b-41d4-a716-446655440002',
    locationName: 'Main Clinic',
    appointmentType: 'consultation',
    serviceName: 'Teeth Cleaning',
    serviceId: undefined,
    date: '2026-04-21',
    startTime: '09:00',
    notes: '',
    estimatedDuration: 30,
    color: '1',
    status: 'scheduled',
    customerType: 'returning',
  };
}

describe('formDataToApiPayload', () => {
  it('should produce a payload that passes the backend Zod schema', () => {
    const data = makeValidFormData();
    const payload = formDataToApiPayload(data);
    const result = AppointmentCreateSchema.safeParse(payload);
    if (!result.success) {
      console.error('Zod validation errors:', result.error.issues);
    }
    expect(result.success).toBe(true);
  });

  it('should coerce duration 0 to fallback 30 so Zod never sees invalid value', () => {
    const data = { ...makeValidFormData(), estimatedDuration: 0 };
    const payload = formDataToApiPayload(data);
    expect(payload.timeexpected).toBe(30);
    const result = AppointmentCreateSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should fail Zod validation when partnerid is empty string', () => {
    const data = { ...makeValidFormData(), customerId: '' };
    const payload = formDataToApiPayload(data);
    const result = AppointmentCreateSchema.safeParse(payload);
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path[0] === 'partnerid');
    expect(issue).toBeDefined();
  });

  it('should fail Zod validation when companyid is empty string', () => {
    const data = { ...makeValidFormData(), locationId: '' };
    const payload = formDataToApiPayload(data);
    const result = AppointmentCreateSchema.safeParse(payload);
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path[0] === 'companyid');
    expect(issue).toBeDefined();
  });

  it('should send state as a valid enum value', () => {
    const data = makeValidFormData();
    const payload = formDataToApiPayload(data);
    expect(payload.state).toBe('scheduled');
    const result = AppointmentCreateSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should not send undefined keys to API after JSON serialization', () => {
    const data = makeValidFormData();
    data.doctorId = undefined;
    data.serviceId = undefined;
    const payload = formDataToApiPayload(data);
    const json = JSON.stringify(payload);
    const parsed = JSON.parse(json);
    expect(parsed).not.toHaveProperty('doctorid');
    expect(parsed).not.toHaveProperty('productid');
  });

  it('should keep explicit null staff fields so edit saves can clear them', () => {
    const data = {
      ...makeValidFormData(),
      doctorId: null,
      doctorName: null,
      assistantId: null,
      assistantName: null,
      dentalAideId: null,
      dentalAideName: null,
    };

    const payload = formDataToApiPayload(data);
    const parsed = JSON.parse(JSON.stringify(payload));

    expect(parsed).toEqual(
      expect.objectContaining({
        doctorid: null,
        doctorname: null,
        assistantid: null,
        assistantname: null,
        dentalaideid: null,
        dentalaidename: null,
      }),
    );
  });

  it('should include selected location as companyid for edit saves', () => {
    const data = {
      ...makeValidFormData(),
      locationId: '880e8400-e29b-41d4-a716-446655440003',
      locationName: 'Tâm Dentist Quận 3',
    };

    const payload = formDataToApiPayload(data);
    const parsed = JSON.parse(JSON.stringify(payload));

    expect(parsed.companyid).toBe('880e8400-e29b-41d4-a716-446655440003');
    expect(parsed.companyname).toBe('Tâm Dentist Quận 3');
    expect(AppointmentUpdateSchema.safeParse(parsed).success).toBe(true);
  });
});

describe('apiAppointmentToFormData', () => {
  it('should strip time component from ISO date strings', () => {
    const api = {
      id: 'test-id',
      date: '2026-04-21T00:00:00.000Z',
      time: '14:30',
      timeexpected: 45,
      partnerid: 'p1',
      companyid: 'c1',
      state: 'scheduled',
    } as any;
    const formData = apiAppointmentToFormData(api);
    expect(formData.date).toBe('2026-04-21');
  });

  it('should preload duration from database timeexpected', () => {
    const api = {
      id: 'test-id',
      date: '2026-04-21T00:00:00.000Z',
      time: '14:30',
      timeexpected: 45,
      partnerid: 'p1',
      companyid: 'c1',
      state: 'scheduled',
    } as any;
    const formData = apiAppointmentToFormData(api);
    expect(formData.startTime).toBe('14:30');
    expect(formData.estimatedDuration).toBe(45);
    expect(formData).not.toHaveProperty('endTime');
  });

  it('maps a selected CTV to ctv_id in the API payload', () => {
    const ctvId = '880e8400-e29b-41d4-a716-446655440099';
    const payload = formDataToApiPayload({ ...makeValidFormData(), ctvId });
    expect(payload.ctv_id).toBe(ctvId);
    // payload must still satisfy the create contract with the new field present
    expect(AppointmentCreateSchema.safeParse(payload).success).toBe(true);
  });

  it('sends ctv_id null when no CTV is selected (assign-only, server no-ops)', () => {
    const payload = formDataToApiPayload(makeValidFormData());
    expect(payload.ctv_id).toBeNull();
    expect(AppointmentCreateSchema.safeParse(payload).success).toBe(true);
  });

  it('preloads ctvId from the appointment record (referred_by_ctv_id)', () => {
    const ctvId = '880e8400-e29b-41d4-a716-446655440099';
    const api = {
      id: 'test-id',
      date: '2026-04-21',
      time: '14:30',
      partnerid: 'p1',
      companyid: 'c1',
      state: 'scheduled',
      ctv_id: ctvId,
    } as any;
    const formData = apiAppointmentToFormData(api);
    expect(formData.ctvId).toBe(ctvId);
  });
});
