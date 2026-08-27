-- PatientTriage.AI Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('nurse','doctor','admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_code TEXT UNIQUE NOT NULL,
  age INT NOT NULL,
  sex TEXT,
  medical_history TEXT,
  medications TEXT,
  allergies TEXT,
  chief_complaint TEXT,
  symptoms TEXT,
  pain_score INT,
  duration TEXT,
  consciousness TEXT DEFAULT 'Alert',
  distress TEXT DEFAULT 'None',
  mobility TEXT DEFAULT 'Ambulatory',
  arrival_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'Waiting',
  is_simulated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_arrival ON patients(arrival_time);

CREATE TABLE IF NOT EXISTS patient_vitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  heart_rate INT,
  systolic_bp INT,
  diastolic_bp INT,
  spo2 INT,
  respiratory_rate INT,
  temperature NUMERIC(4,1),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON patient_vitals(patient_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS triage_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  priority INT NOT NULL,
  priority_label TEXT,
  deterioration_risk TEXT,
  risk_probability NUMERIC(4,3),
  confidence NUMERIC(4,3),
  care_pathway TEXT,
  reassessment_minutes INT,
  key_factors JSONB,
  explanation TEXT,
  recommendation TEXT,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_triage_patient ON triage_assessments(patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS clinician_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  previous_priority INT,
  new_priority INT,
  previous_pathway TEXT,
  new_pathway TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT,
  message TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  user_email TEXT,
  user_role TEXT,
  patient_id UUID,
  action TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS reassessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  previous_priority INT,
  new_priority INT,
  previous_risk NUMERIC(4,3),
  new_risk NUMERIC(4,3),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode TEXT,
  status TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric TEXT,
  value NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
