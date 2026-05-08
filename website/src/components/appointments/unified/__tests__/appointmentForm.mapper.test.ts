import { describe, it, expect } from 'vitest';
import { formDataToApiPayload, apiAppointmentToFormData } from '../appointmentForm.mapper';
import { AppointmentCreateSchema } from '@tgroup/contracts';
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
});
