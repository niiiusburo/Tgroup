-- Migration: Seed sample doctors for local development
-- Only inserts if employees view returns fewer than 3 rows
DO $$
DECLARE
  v_count INT;
  v_company_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_count FROM dbo.employees;
  
  IF v_count >= 3 THEN
    RAISE NOTICE 'Employees already seeded (%) — skipping', v_count;
    RETURN;
  END IF;

  -- Pick first active company as default
  SELECT id INTO v_company_id FROM dbo.companies WHERE active = true LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE NOTICE 'No active company found — cannot seed doctors';
    RETURN;
  END IF;

  -- Insert doctors as partners with employee = true
  INSERT INTO dbo.partners (
    id, displayname, name, namenosign, phone, email,
    supplier, customer, isagent, isinsurance,
    companyid, ref, comment, active, employee, gender, jobtitle,
    datecreated, lastupdated
  ) VALUES
  (
    'd091498b-0fca-4518-8fb1-9736dfebe9d8',
    'BS. Nguyễn Văn A', 'BS. Nguyễn Văn A', 'BS. NGUYEN VAN A',
    '0901111111', 'doctor.a@tamdentist.vn',
    false, false, false, false,
    v_company_id, 'BS001', 'Sample doctor for local dev',
    true, true, 'male', 'Bác sĩ nha khoa',
    NOW(), NOW()
  ),
  (
    'd091498b-0fca-4518-8fb1-9736dfebe9d9',
    'BS. Trần Thị B', 'BS. Trần Thị B', 'BS. TRAN THI B',
    '0902222222', 'doctor.b@tamdentist.vn',
    false, false, false, false,
    v_company_id, 'BS002', 'Sample doctor for local dev',
    true, true, 'female', 'Bác sĩ nha khoa',
    NOW(), NOW()
  ),
  (
    'd091498b-0fca-4518-8fb1-9736dfebe9da',
    'BS. Lê Văn C', 'BS. Lê Văn C', 'BS. LE VAN C',
    '0903333333', 'doctor.c@tamdentist.vn',
    false, false, false, false,
    v_company_id, 'BS003', 'Sample doctor for local dev',
    true, true, 'male', 'Bác sĩ chỉnh nha',
    NOW(), NOW()
  ),
  (
    'd091498b-0fca-4518-8fb1-9736dfebe9db',
    'PT. Phạm Thị D', 'PT. Phạm Thị D', 'PT. PHAM THI D',
    '0904444444', 'assistant.d@tamdentist.vn',
    false, false, false, false,
    v_company_id, 'PT001', 'Sample assistant for local dev',
    true, true, 'female', 'Phụ tá nha khoa',
    NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Seeded sample employees successfully';
END $$;
