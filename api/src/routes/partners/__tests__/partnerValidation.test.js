const { PartnerUpdateSchema } = require('@tgroup/contracts');

describe('partner shared validation', () => {
  it('normalizes legacy zero date parts on customer update payloads', () => {
    const result = PartnerUpdateSchema.safeParse({
      birthday: 0,
      birthmonth: '0',
      birthyear: '',
      note: 'Updated from profile',
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      birthday: null,
      birthmonth: null,
      birthyear: null,
      note: 'Updated from profile',
    });
  });

  it('still rejects real out-of-range customer date parts', () => {
    const result = PartnerUpdateSchema.safeParse({
      birthday: 32,
      birthmonth: 13,
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.map(issue => issue.path.join('.'))).toEqual([
      'birthday',
      'birthmonth',
    ]);
  });
});
