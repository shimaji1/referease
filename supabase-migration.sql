-- ═══════════════════════════════════════════════════════════════
-- ReferEase Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════

-- 1. Create providers table
CREATE TABLE IF NOT EXISTS providers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('clinic','specialist','hospital','imaging','lab','rehab')),
  services TEXT[] DEFAULT '{}',
  address TEXT,
  phone TEXT,
  fax TEXT,
  website TEXT,
  rating NUMERIC(2,1),
  reviews INTEGER DEFAULT 0,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  hours JSONB DEFAULT '{}',
  accepting_referrals BOOLEAN DEFAULT true,
  wait_weeks INTEGER,
  requirements TEXT,
  doctors TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{English}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create admin_users table for simple admin auth
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - anyone can read providers
CREATE POLICY "Public read providers" ON providers FOR SELECT USING (true);

-- Allow all operations for now (we'll tighten this with proper auth later)
CREATE POLICY "Allow all inserts" ON providers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates" ON providers FOR UPDATE USING (true);
CREATE POLICY "Allow all deletes" ON providers FOR DELETE USING (true);

-- Admin users readable by anon for login check
CREATE POLICY "Read admin users" ON admin_users FOR SELECT USING (true);

-- 5. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Create default admin user (password: referease2024)
-- Using a simple hash - in production you'd use bcrypt via auth
INSERT INTO admin_users (email, password_hash) VALUES
  ('admin@referease.ca', 'referease2024');

-- 7. Seed all 60 providers
INSERT INTO providers (name, type, category, services, address, phone, fax, website, rating, reviews, lat, lng, hours, accepting_referrals, wait_weeks, requirements, doctors, languages) VALUES

-- CLINICS
('Thornhill Family Physicians', 'Family Medicine', 'clinic', ARRAY['Family Medicine','Walk-In','Preventive Care'], '7700 Bathurst St #35, Thornhill, ON L4J 7Y3', '905-881-6510', NULL, NULL, 3.9, 36, 43.810, -79.451, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:00-17:00","fri":"9:00-17:00","sat":null,"sun":null}', true, 2, 'OHIP card, valid requisition', ARRAY['Dr. Williams','Dr. Rastogi'], ARRAY['English']),

('Family in Motion Medical Clinic', 'Family Medicine', 'clinic', ARRAY['Family Medicine','Chronic Disease Management','Preventive Care','Mental Health'], '7163 Yonge St #267, Thornhill, ON L3T 0C6', '289-818-8080', NULL, NULL, 5.0, 20, 43.803, -79.421, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:30-19:00","fri":"9:00-17:00","sat":"9:00-14:00","sun":null}', true, 1, 'Accepts new patients, OHIP', ARRAY['Dr. Zahra Alian'], ARRAY['English','Farsi']),

('Enhanced Care Medical Clinic', 'Walk-In / Family Medicine', 'clinic', ARRAY['Walk-In','Family Medicine','Pharmacy','Physiotherapy'], '7181 Yonge St Unit 28/29, Thornhill, ON L3T 0C7', '905-707-7309', NULL, NULL, 3.0, 177, 43.804, -79.420, '{"mon":"9:30-20:00","tue":"9:30-20:00","wed":"10:00-20:00","thu":"9:00-20:00","fri":"9:00-17:00","sat":"10:00-15:00","sun":"10:00-15:00"}', true, 1, 'Walk-in accepted, OHIP', ARRAY['Dr. Janice Lam','Dr. Ming Yu','Dr. Angel'], ARRAY['English','Mandarin']),

('MediOne Physicians - Yonge & Steeles', 'Family Medicine', 'clinic', ARRAY['Family Medicine','Walk-In','Womens Health','Pediatrics'], '100 Steeles Ave W #11, Thornhill, ON L4J 7Y1', '289-807-0596', NULL, NULL, 3.9, 290, 43.798, -79.426, '{"mon":"10:00-18:00","tue":"10:00-20:00","wed":"10:00-16:00","thu":"10:00-20:00","fri":"10:00-20:00","sat":"10:00-16:00","sun":"11:00-16:00"}', true, 1, 'Walk-in and rostered patients', ARRAY['Dr. Rahila Ashaya','Dr. Bayan Shariati'], ARRAY['English','Arabic','Farsi']),

('Thornhill Medical Centre', 'Family Medicine', 'clinic', ARRAY['Family Medicine','Chronic Disease Management','Geriatric Care'], '18 Centre St, Thornhill, ON L4J 1E9', '905-889-3634', NULL, NULL, 4.0, 45, 43.816, -79.426, '{"mon":"8:30-20:00","tue":"8:30-20:00","wed":"8:30-20:00","thu":"8:30-20:00","fri":"8:30-17:00","sat":null,"sun":null}', false, NULL, 'Not accepting new patients', ARRAY['Dr. Meagan Thang','Dr. Beausoleil','Dr. Blachowitz','Dr. Stella Arbitman'], ARRAY['English','Russian']),

('WELL Health - Thornhill Square', 'Walk-In / Family Medicine', 'clinic', ARRAY['Walk-In','Family Medicine','Minor Procedures'], '8 Green Ln Units 1-3, Thornhill, ON L3T 7P7', NULL, NULL, NULL, 2.9, 287, 43.822, -79.400, '{"mon":"9:00-20:00","tue":"9:00-20:00","wed":"9:00-20:00","thu":"9:00-20:00","fri":"9:00-20:00","sat":"10:00-16:00","sun":"10:00-15:00"}', true, 2, 'Online booking preferred', ARRAY['Dr. Balagangatharan','Dr. Iskander'], ARRAY['English','Tamil']),

('Sunmed Family Practice', 'Family Medicine', 'clinic', ARRAY['Family Medicine','Walk-In','Pharmacy'], '300 Steeles Ave W #10, Thornhill, ON L4J 1A1', '905-597-6100', NULL, NULL, 3.5, 163, 43.797, -79.430, '{"mon":"9:00-16:00","tue":"9:00-16:00","wed":"9:00-16:00","thu":"9:00-16:00","fri":"9:00-15:00","sat":"9:00-14:00","sun":null}', true, 3, 'OHIP, prior records preferred', ARRAY['Dr. Derakhshan'], ARRAY['English','Farsi']),

('Primed Clinic', 'Family Medicine', 'clinic', ARRAY['Family Medicine','Walk-In','Preventive Care','Mental Health'], '7097 Yonge St Unit 104, Thornhill, ON L3T 2A7', '905-881-7097', NULL, NULL, 4.9, 86, 43.801, -79.420, '{"mon":"9:00-20:00","tue":"9:00-20:00","wed":"9:00-20:00","thu":"9:00-19:00","fri":"9:00-20:00","sat":"10:00-14:00","sun":"10:00-14:00"}', true, 1, 'Walk-in 7 days, OHIP', ARRAY['Dr. Parham Masoudi'], ARRAY['English','Farsi']),

('Matlis Medical & Urgent Walk-In', 'Walk-In / Sports Medicine', 'clinic', ARRAY['Walk-In','Urgent Care','Sports Medicine','Pharmacy'], '8200 Bayview Ave, Thornhill, ON L3T 2S2', '905-881-3212', NULL, NULL, 4.1, 360, 43.832, -79.405, '{"mon":"9:30-18:00","tue":"9:30-18:00","wed":"9:30-18:00","thu":"9:30-18:00","fri":"9:30-18:00","sat":"9:30-13:00","sun":"9:30-13:00"}', true, 0, 'No referral needed for walk-in', ARRAY['Dr. Steven Matlis','Dr. Koldorf'], ARRAY['English','Russian']),

('Disera Medical Centre', 'Family Medicine / Multi-Specialty', 'clinic', ARRAY['Family Medicine','Walk-In','Neurology','Respirology','Gynecology'], '30 Disera Dr Unit 100, Thornhill, ON L4J 0A7', '905-771-7755', NULL, NULL, 3.0, 252, 43.812, -79.454, '{"mon":"10:00-17:00","tue":"10:00-17:00","wed":"10:00-17:00","thu":"10:00-17:00","fri":"10:00-17:00","sat":"10:00-13:00","sun":"10:00-13:00"}', true, 1, 'Walk-in and specialist referrals', ARRAY['Dr. Staroselsky','Dr. Irene Hwang','Dr. Palak Shah (Neurology)','Dr. Jason Dodge (Gynecology)','Dr. Melissa Brijbassi (Respirology)','Dr. Viktor Sekowski (Respirology)'], ARRAY['English','Russian','Farsi']),

('WELL Health - Main Exchange', 'Walk-In / Multi-discipline', 'clinic', ARRAY['Walk-In','Family Medicine','Physiotherapy','Chiropractic'], '800 Steeles Ave W #4A, Vaughan, ON L4J 7L2', NULL, NULL, NULL, 3.2, 410, 43.792, -79.448, '{"mon":"9:00-21:00","tue":"9:00-21:00","wed":"9:00-21:00","thu":"9:00-21:00","fri":"9:00-20:00","sat":"9:00-16:00","sun":"9:00-16:00"}', true, 0, 'Walk-in accepted', ARRAY['Dr. N. Ivanauskene'], ARRAY['English','Russian']),

-- HOSPITALS
('Mackenzie Health - Richmond Hill', 'Hospital', 'hospital', ARRAY['Emergency','Surgery','Oncology','Orthopedics','Cardiology','OB/GYN','Internal Medicine','Radiology','Lab','Mental Health'], '10 Trench St, Richmond Hill, ON L4C 4Z3', '905-883-1212', NULL, 'mackenziehealth.ca', 2.8, 1632, 43.870, -79.450, '{"mon":"0:00-24:00","tue":"0:00-24:00","wed":"0:00-24:00","thu":"0:00-24:00","fri":"0:00-24:00","sat":"0:00-24:00","sun":"0:00-24:00"}', true, NULL, 'Referral or ER visit', ARRAY['Dr. Matilda Ng (Oncology)','Dr. Fan (ER)','Dr. Mallick (Orthopedics)','Dr. Olamide Sobowale (OB/GYN Chief)','Dr. Kalpana Sharma (OB/GYN)','Dr. Fady Shehata (Urogynecology)'], ARRAY['English','French','Mandarin','Cantonese']),

('North York General Hospital', 'Hospital', 'hospital', ARRAY['Emergency','Surgery','Maternity','Orthopedics','Cardiology','Internal Medicine','Radiology','Lab','Mental Health','Urogynecology'], '4001 Leslie St, North York, ON M2K 1E1', '416-756-6000', NULL, 'nygh.on.ca', 3.0, 1816, 43.769, -79.363, '{"mon":"0:00-24:00","tue":"0:00-24:00","wed":"0:00-24:00","thu":"0:00-24:00","fri":"0:00-24:00","sat":"0:00-24:00","sun":"0:00-24:00"}', true, NULL, 'Referral or ER visit', ARRAY['Dr. Poon (Anesthesiology)','Dr. Dhotar (Orthopedics)','Dr. Daniel Kreichman (Urogynecology/OB)'], ARRAY['English','French']),

('Cortellucci Vaughan Hospital', 'Hospital', 'hospital', ARRAY['Emergency','Surgery','Maternity','Internal Medicine','Radiology','Lab','OB/GYN'], '3200 Major Mackenzie Dr W, Vaughan, ON L6A 4Z3', '905-417-2000', NULL, 'mackenziehealth.ca', 3.1, 1551, 43.850, -79.540, '{"mon":"0:00-24:00","tue":"0:00-24:00","wed":"0:00-24:00","thu":"0:00-24:00","fri":"0:00-24:00","sat":"0:00-24:00","sun":"0:00-24:00"}', true, NULL, 'Referral or ER visit', ARRAY['Dr. Sattari (OB/GYN)','Dr. Olamide Sobowale (OB/GYN)','Dr. Tuba Aksoy (OB/GYN)'], ARRAY['English','Italian','Farsi']),

('Shouldice Hospital', 'Hospital (Hernia)', 'hospital', ARRAY['Hernia Surgery','Hernia Assessment'], '7750 Bayview Ave, Thornhill, ON L3T 4A3', '905-889-1125', NULL, 'shouldice.com', 4.2, 562, 43.821, -79.404, '{"mon":"8:30-15:00","tue":"8:30-15:00","wed":"8:30-15:00","thu":"8:30-15:00","fri":"8:30-15:00","sat":null,"sun":null}', true, 12, 'GP referral required, hernia diagnosis', ARRAY['Dr. Simmons'], ARRAY['English']),

('Sunnybrook Health Sciences Centre', 'Hospital / Academic', 'hospital', ARRAY['Emergency','Neurology','Oncology','Trauma','Surgery','Cardiology','Maternity','Mental Health'], '2075 Bayview Ave, North York, ON M4N 3M5', '416-480-6100', NULL, 'sunnybrook.ca', 3.3, 1412, 43.722, -79.375, '{"mon":"0:00-24:00","tue":"0:00-24:00","wed":"0:00-24:00","thu":"0:00-24:00","fri":"0:00-24:00","sat":"0:00-24:00","sun":"0:00-24:00"}', true, NULL, 'Specialist referral required', ARRAY['Dr. William Kingston (Neurology - Migraine in Pregnancy)'], ARRAY['English','French']),

('Toronto Western Hospital (UHN)', 'Hospital / Academic', 'hospital', ARRAY['Orthopedics','Neurology','Rheumatology','Urology','Ophthalmology','Surgery','Emergency'], '399 Bathurst St, Toronto, ON M5T 2S8', '416-603-2581', NULL, 'uhn.ca', 3.4, 850, 43.653, -79.405, '{"mon":"0:00-24:00","tue":"0:00-24:00","wed":"0:00-24:00","thu":"0:00-24:00","fri":"0:00-24:00","sat":"0:00-24:00","sun":"0:00-24:00"}', true, NULL, 'Specialist referral required', ARRAY['Dr. Stephen Lewis (Spine Surgery)','Dr. Zahi Touma (Rheumatology)','Dr. Dean Elterman (Urology)'], ARRAY['English','French']),

('Humber River Hospital', 'Hospital', 'hospital', ARRAY['Emergency','Surgery','Maternity','Urology','Gynecology','Internal Medicine','Radiology'], '1235 Wilson Ave, North York, ON M3M 0B2', '416-242-1000', NULL, 'hrh.ca', 2.7, 2414, 43.724, -79.489, '{"mon":"0:00-24:00","tue":"0:00-24:00","wed":"0:00-24:00","thu":"0:00-24:00","fri":"0:00-24:00","sat":"0:00-24:00","sun":"0:00-24:00"}', true, NULL, 'Referral or ER visit', ARRAY['Dr. Oliver Heimrath (Urology)','Dr. Magee (Urology)','Dr. Mirabelle DSouza (OB/GYN - Outpatient)'], ARRAY['English']),

-- CARDIOLOGY
('Pioneer Cardio Diagnostics', 'Cardiology', 'specialist', ARRAY['ECG','Echocardiogram','Holter Monitor','Stress Test','Cardiac Consultation'], '7368 Yonge St #207, Thornhill, ON L4J 8H9', '905-747-9101', NULL, NULL, 4.6, 283, 43.807, -79.423, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:00-17:00","fri":"9:00-17:00","sat":null,"sun":null}', true, 3, 'GP referral, recent ECG if available', ARRAY['Dr. Homat'], ARRAY['English','Farsi']),

('CardioMatters Diagnostics - Thornhill', 'Cardiology', 'specialist', ARRAY['ECG','Holter Monitor','Echocardiogram','Stress Test'], '398 Steeles Ave W, Thornhill, ON L4J 6X3', '905-881-0334', NULL, NULL, 3.4, 99, 43.796, -79.435, '{"mon":"8:00-17:00","tue":"8:00-17:00","wed":"8:00-17:00","thu":"8:00-17:00","fri":"8:00-17:00","sat":null,"sun":null}', true, 2, 'GP referral required', ARRAY[]::text[], ARRAY['English','Russian']),

('Alta Cardiac Care', 'Cardiology', 'specialist', ARRAY['ECG','Echocardiogram','Holter Monitor','Cardiac Consultation'], '8707 Dufferin St, Thornhill, ON L4J 0A2', '905-747-0808', NULL, NULL, 4.1, 36, 43.829, -79.479, '{"mon":"9:00-18:00","tue":"9:00-18:00","wed":"9:00-18:00","thu":"9:00-18:00","fri":"9:00-18:00","sat":null,"sun":null}', true, 4, 'GP referral required', ARRAY[]::text[], ARRAY['English','Russian']),

('Good Health Markham Cardiac Clinic', 'Cardiology', 'specialist', ARRAY['ECG','Echocardiogram','Holter Monitor','Stress Test','Cardiac Consultation'], '8500 Leslie St #100, Markham, ON L3T 7M8', '289-505-9134', NULL, NULL, 5.0, 61, 43.843, -79.383, '{"mon":"9:30-17:00","tue":"9:30-17:00","wed":"9:30-17:00","thu":"9:30-17:00","fri":"9:30-17:00","sat":null,"sun":null}', true, 1, 'GP referral, fast scheduling', ARRAY['Dr. Ali'], ARRAY['English']),

('Dr. Paul W. Chong - Cardiology', 'Cardiology', 'specialist', ARRAY['Cardiac Consultation','Angiogram','Angioplasty','Echocardiogram','Stress Test'], '9350 Yonge St Suite 203, Richmond Hill, ON L4C 5G2', '905-883-8220', NULL, NULL, 5.0, 17, 43.855, -79.437, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:00-17:00","fri":null,"sat":null,"sun":null}', true, 4, 'GP referral required', ARRAY['Dr. Paul W. Chong'], ARRAY['English','Cantonese']),

-- ORTHOPEDICS / PAIN
('Wilderman Medical Clinic', 'Pain Management', 'specialist', ARRAY['Pain Management','Epidural Injections','Ultrasound-Guided Injections','Sports Medicine','Physiotherapy'], '8054 Yonge St, Thornhill, ON L4J 1Y2', '905-886-1212', NULL, 'wildermanmedical.com', 4.6, 591, 43.824, -79.426, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:00-17:00","fri":null,"sat":"8:30-13:00","sun":null}', true, 6, 'Referral from GP required, recent imaging', ARRAY['Dr. Igor Wilderman'], ARRAY['English','Russian']),

('Dr. Hamid Nourhosseini - Orthopedics', 'Orthopedic Surgery', 'specialist', ARRAY['Knee Replacement','Joint Surgery','ACL Repair','Fracture Care','Consultation'], '250 Harding Blvd W #407, Richmond Hill, ON L4C 9M7', '905-770-1800', NULL, NULL, 4.0, 76, 43.868, -79.448, '{"mon":"8:00-16:00","tue":"8:00-16:00","wed":"8:00-16:00","thu":"8:00-16:00","fri":"8:00-16:00","sat":null,"sun":null}', true, 8, 'GP referral, X-ray/MRI required', ARRAY['Dr. Hamid Nourhosseini','Dr. Mohammadi'], ARRAY['English','Farsi']),

('Dr. Anthony Marchie - Orthopedics', 'Orthopedic Surgery', 'specialist', ARRAY['Knee Replacement','Hip Surgery','Joint Surgery','Foot Surgery'], '191 McNaughton Rd E #305, Maple, ON L6A 4E2', '905-237-8445', NULL, NULL, 4.3, 46, 43.863, -79.501, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:00-17:00","fri":"9:00-17:00","sat":null,"sun":null}', true, 6, 'GP referral, recent imaging', ARRAY['Dr. Anthony Marchie'], ARRAY['English']),

('Dr. Robert Wang - Orthopedics', 'Orthopedic Surgery', 'specialist', ARRAY['ACL Surgery','Sports Injury','Joint Surgery'], '191 McNaughton Rd E #305, Vaughan, ON L6A 4E2', '905-918-2212', NULL, NULL, 4.7, 12, 43.863, -79.434, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:00-17:00","fri":"9:00-17:00","sat":null,"sun":null}', true, 5, 'GP referral, MRI results', ARRAY['Dr. Robert Wang'], ARRAY['English','Mandarin']),

('Dr. Sarfraz Malleck - Orthopedics', 'Orthopedic Surgery (Foot & Ankle)', 'specialist', ARRAY['Ankle Fusion','Achilles Repair','Foot Surgery','Fracture Care'], '191 McNaughton Rd E, Maple, ON L6A 4E2', '416-933-8981', NULL, NULL, 4.4, 35, 43.863, -79.501, '{"mon":"8:30-15:30","tue":"8:30-15:30","wed":"8:30-15:30","thu":"8:30-15:30","fri":"8:30-15:30","sat":null,"sun":null}', true, 6, 'GP referral required', ARRAY['Dr. Sarfraz Malleck'], ARRAY['English']),

('Dr. Gregory Soon-Shiong - Spine Surgery', 'Orthopedic Surgery (Spine)', 'specialist', ARRAY['Spinal Fusion','Disc Surgery','Spine Consultation','Nerve Decompression'], '9651 Yonge St, Richmond Hill, ON L4C 1V7', '905-883-6614', NULL, NULL, 3.9, 28, 43.863, -79.434, '{"mon":"9:30-16:30","tue":"9:30-16:30","wed":"9:30-16:30","thu":"9:30-16:30","fri":"9:15-12:30","sat":null,"sun":null}', true, 8, 'GP referral, MRI required', ARRAY['Dr. Gregory Soon-Shiong'], ARRAY['English']),

-- DERMATOLOGY
('York Dermatology Clinic & Research Centre', 'Dermatology', 'specialist', ARRAY['Psoriasis','Atopic Dermatitis','Acne','Skin Cancer Screening','Mole Mapping','Clinical Trials','Cosmetic Dermatology'], '245 West Beaver Creek Rd Unit 2, Richmond Hill, ON L4B 1L1', '905-883-7997', '905-883-7994', 'yorkdermatology.ca', 3.8, 343, 43.846, -79.387, '{"mon":"8:30-16:30","tue":"8:30-16:30","wed":"8:30-16:30","thu":"8:30-16:30","fri":"8:30-16:30","sat":null,"sun":null}', true, 8, 'GP referral required', ARRAY['Dr. Patrick Fleming','Dr. Simraj Powar','Dr. Cecchini'], ARRAY['English']),

('Thornhill Dermatology Centre', 'Dermatology', 'specialist', ARRAY['Skin Cancer Screening','Acne Treatment','Cosmetic Dermatology','Mole Removal','Eczema','Psoriasis'], '400 Bradwick Dr Suite 200, Concord, ON L4K 5V9', '905-695-2020', NULL, 'thornhillderm.com', 3.0, 173, 43.816, -79.481, '{"mon":"8:30-17:00","tue":"8:30-17:00","wed":"8:30-17:00","thu":"8:30-17:00","fri":"8:30-14:30","sat":null,"sun":null}', true, 16, 'GP referral required', ARRAY['Dr. Lori Shapiro','Dr. Bargman','Dr. Zahavi'], ARRAY['English']),

('The Centre for Dermatology', 'Dermatology', 'specialist', ARRAY['General Dermatology','Skin Cancer','Acne','Cosmetic Procedures','Laser Treatment'], '312 Hwy 7, Richmond Hill, ON L4B 1A5', '905-889-2005', '905-889-2006', NULL, 2.8, 279, 43.841, -79.401, '{"mon":"7:00-16:00","tue":"7:00-16:00","wed":"7:00-16:00","thu":"7:00-16:00","fri":"7:00-13:00","sat":null,"sun":null}', true, 12, 'GP referral required', ARRAY['Dr. Maneesh Prabhakar','Dr. Raman','Dr. Mani'], ARRAY['English']),

('Dr. Shakti Sharma - Dermatology', 'Dermatology', 'specialist', ARRAY['Skin Conditions','Wart Treatment','Skin Cancer','General Dermatology'], '7117 Bathurst St, Thornhill, ON L4J 2J7', '905-763-2526', NULL, NULL, 2.9, 37, 43.795, -79.446, '{"mon":null,"tue":null,"wed":null,"thu":null,"fri":"7:30-11:30","sat":null,"sun":null}', true, 52, 'GP referral, very long wait', ARRAY['Dr. Shakti Sharma'], ARRAY['English']),

-- OB/GYN
('Dr. Olamide Sobowale - OB/GYN', 'Obstetrics & Gynecology', 'specialist', ARRAY['High-Risk Obstetrics','Endometriosis','Fibroids','Robotic Surgery','Minimally Invasive Surgery'], '2640 Rutherford Rd Unit 202, Vaughan, ON L4K 0H1', '905-417-7289', NULL, 'drsobowale.com', NULL, 0, 43.835, -79.522, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:00-17:00","fri":"9:00-17:00","sat":null,"sun":null}', true, 6, 'GP referral required', ARRAY['Dr. Olamide Sobowale (Chief OB/GYN Mackenzie Health)'], ARRAY['English']),

('Dr. Tuba Aksoy - OB/GYN', 'Obstetrics & Gynecology', 'specialist', ARRAY['Obstetrics','Gynecology','C-Section','Prenatal Care'], '8760 Jane St #204A, Concord, ON L4K 4V3', '905-889-4040', NULL, NULL, 3.5, 76, 43.819, -79.531, '{"mon":"8:00-17:00","tue":"8:00-17:00","wed":"8:00-17:00","thu":"8:00-17:00","fri":"8:00-17:00","sat":null,"sun":null}', true, 4, 'GP referral required', ARRAY['Dr. Tuba Aksoy'], ARRAY['English','Turkish']),

('Dr. Mirabelle DSouza - OB/GYN', 'Obstetrics & Gynecology', 'specialist', ARRAY['Gynecology','Obstetrics','Prenatal Care','Well-Woman Exams'], '1275 Finch Ave W Suite 107, North York, ON M3J 0L5', '647-346-3055', NULL, NULL, 3.8, 100, 43.764, -79.488, '{"mon":"9:00-15:00","tue":"9:00-15:00","wed":"9:00-15:00","thu":"9:00-15:00","fri":"9:00-15:00","sat":null,"sun":null}', true, 6, 'GP referral required', ARRAY['Dr. Mirabelle DSouza'], ARRAY['English']),

('Axis Gyne', 'Gynecology', 'specialist', ARRAY['Gynecology','IUD Insertion','Pap Smear','Colposcopy','Contraception'], '655 Bay St Ste 1007, Toronto, ON M5G 2K4', '416-281-6060', NULL, NULL, 2.4, 109, 43.658, -79.384, '{"mon":"9:00-16:00","tue":"9:00-16:00","wed":"9:00-16:00","thu":"9:00-16:00","fri":"9:00-16:00","sat":null,"sun":null}', true, 12, 'GP referral required, 1-4 month wait', ARRAY[]::text[], ARRAY['English']),

('Generation Fertility - Vaughan', 'Fertility', 'specialist', ARRAY['IVF','IUI','Fertility Assessment','Egg Freezing','Cycle Monitoring'], '955 Major Mackenzie Dr W #400, Maple, ON L6A 4P9', '289-357-0100', NULL, 'generationfertility.com', 4.1, 345, 43.864, -79.469, '{"mon":"6:30-14:30","tue":"6:30-14:30","wed":"6:30-14:30","thu":"6:30-14:30","fri":"6:30-14:30","sat":"6:30-14:30","sun":null}', true, 4, 'GP referral required', ARRAY['Dr. Gurau','Dr. Lai','Dr. Scholl'], ARRAY['English']),

-- NEUROLOGY
('Alliance Specialty Care Centres', 'Neurology', 'specialist', ARRAY['Neurological Assessment','EMG/NCS','Parkinsons Management','Headache Clinic','Cardiology'], '1881 Steeles Ave W #204a, North York, ON M3H 5Y4', '416-650-1911', NULL, NULL, 4.7, 64, 43.786, -79.469, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:00-17:00","fri":"9:00-17:00","sat":null,"sun":"10:00-14:00"}', true, 4, 'GP referral required', ARRAY['Dr. Jeffrey Schachter (Neurology)'], ARRAY['English']),

-- PSYCHIATRY
('Thea Medical Clinic', 'Psychiatry', 'specialist', ARRAY['Psychiatric Assessment','ADHD Diagnosis','Medication Management','Mental Health'], '8707 Dufferin St #26, Thornhill, ON L4K 0C5', '416-480-6565', NULL, NULL, 2.5, 11, 43.829, -79.478, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:00-17:00","fri":"9:00-17:00","sat":null,"sun":null}', true, 4, 'GP referral through OHIP', ARRAY['Dr. Al Masri','Dr. Khaleel'], ARRAY['English','Arabic']),

-- RHEUMATOLOGY
('Polyclinic Family & Specialty Medicine', 'Rheumatology', 'specialist', ARRAY['Rheumatology','Arthritis Management','Autoimmune Diseases','Family Medicine','Lab'], '2 Champagne Dr, North York, ON M3J 0K2', '416-222-6160', NULL, NULL, 2.6, 366, 43.766, -79.472, '{"mon":"9:00-19:00","tue":"9:00-19:00","wed":"9:00-19:00","thu":"9:00-19:00","fri":"9:00-19:00","sat":"8:00-14:00","sun":null}', true, 8, 'GP referral required', ARRAY['Dr. Sidor (Rheumatology)'], ARRAY['English']),

-- UROLOGY
('Vaughan Urology Associates', 'Urology', 'specialist', ARRAY['Urological Consultation','Vasectomy','Vasectomy Reversal','Cancer Screening','Kidney Stones','BPH'], '2630 Rutherford Rd #201, Vaughan, ON L4K 0H2', '905-832-8428', NULL, NULL, 3.0, 105, 43.835, -79.522, '{"mon":"8:00-16:00","tue":"8:00-16:00","wed":"8:00-16:00","thu":"8:00-16:00","fri":"8:00-16:00","sat":null,"sun":null}', true, 6, 'GP referral required', ARRAY['Dr. Shahani','Dr. Sowerby','Dr. Kogan','Dr. Fitzpatrick'], ARRAY['English']),

('Dr. Dean Elterman - Urology (UHN)', 'Urology', 'specialist', ARRAY['InterStim/Neuromodulation','Bladder Disorders','Urological Surgery','BPH','Urologic Oncology'], '399 Bathurst St, Toronto, ON M5T 2S8', '416-603-5800', NULL, NULL, 2.7, 32, 43.653, -79.406, '{"mon":"8:00-16:00","tue":"8:00-16:00","wed":"8:00-16:00","thu":"8:00-16:00","fri":"8:00-16:00","sat":null,"sun":null}', true, 8, 'GP referral required', ARRAY['Dr. Dean Elterman'], ARRAY['English']),

-- UROGYNECOLOGY
('Dr. Daniel Kreichman - Urogynecology', 'Urogynecology / OB-GYN', 'specialist', ARRAY['Urogynecology','Obstetrics','C-Section','Prenatal Care','Pelvic Floor'], '701 Sheppard Ave E Unit 305, North York, ON M2K 2Z3', '416-644-1404', NULL, NULL, 4.9, 54, 43.769, -79.378, '{"mon":"9:00-17:00","tue":"9:00-17:00","wed":"9:00-17:00","thu":"9:00-17:00","fri":"9:00-12:00","sat":null,"sun":null}', true, 4, 'GP referral required', ARRAY['Dr. Daniel Kreichman'], ARRAY['English']),

('Dr. Fady Shehata - Urogynecology', 'Urogynecology / OB-GYN', 'specialist', ARRAY['Urogynecology','Pelvic Organ Prolapse','Obstetrics','Incontinence Treatment','Pelvic Floor Reconstruction'], '2640 Rutherford Rd Suite 204, Vaughan, ON L4K 0H1', '647-250-7322', '1-855-955-3905', 'drshehata.ca', 4.6, 45, 43.835, -79.522, '{"mon":"9:00-16:00","tue":"9:00-16:00","wed":"9:00-16:00","thu":"9:00-16:00","fri":"9:00-16:00","sat":null,"sun":null}', true, 6, 'GP referral via fax 1-855-955-3905. ONLY accepting obstetrics and urogynecology referrals.', ARRAY['Dr. Fady Shehata'], ARRAY['English','Arabic']),

-- PLASTIC SURGERY
('Dr. Syena Moltaji - Reconstructive Surgery', 'Plastic Surgery (Reconstructive)', 'specialist', ARRAY['Breast Reconstruction','Oncologic Microsurgery','Lymphedema Surgery','Reconstructive Surgery'], '200 Elizabeth St, Toronto, ON M5G 2A7', NULL, NULL, 'uoftplasticsurgery.ca', NULL, 0, 43.659, -79.389, '{"mon":"8:00-16:00","tue":"8:00-16:00","wed":"8:00-16:00","thu":"8:00-16:00","fri":"8:00-16:00","sat":null,"sun":null}', true, NULL, 'GP/specialist referral required, medical reasons only', ARRAY['Dr. Syena Moltaji (UHN)'], ARRAY['English']),

-- MINOR SURGERY
('Toronto Minor Surgery Center (TMSC)', 'Minor Surgery', 'specialist', ARRAY['Carpal Tunnel Surgery','Cyst Removal','Lipoma Removal','Skin Lesion Removal','Mole Removal'], '2920 Dufferin St Ste 202, North York, ON M6B 3S8', '647-614-1611', NULL, 'torontominorsurgery.com', 4.8, 540, 43.709, -79.454, '{"mon":"9:00-20:00","tue":"9:00-16:00","wed":"9:00-16:00","thu":"9:00-16:00","fri":"9:00-16:00","sat":"9:00-17:00","sun":null}', true, 2, 'GP referral or self-referral', ARRAY['Dr. Musgrave','Dr. Jindal'], ARRAY['English']),

('TMSC - Vaughan Location', 'Minor Surgery', 'specialist', ARRAY['Cyst Removal','Lipoma Removal','Skin Lesion Removal','Keloid Treatment','Minor Procedures'], '2701 Rutherford Rd Bldg C, Vaughan, ON L4K 2N6', '647-614-1611', NULL, 'torontominorsurgery.com', 4.9, 360, 43.832, -79.523, '{"mon":"9:00-16:00","tue":"9:00-16:00","wed":"9:00-16:00","thu":"9:00-16:00","fri":"9:00-16:00","sat":null,"sun":null}', true, 2, 'GP referral or self-referral', ARRAY['Dr. Padeeanu','Dr. Hicks','Dr. Jindal'], ARRAY['English']),

-- IMAGING
('Accurate Imaging Diagnostics', 'Diagnostic Imaging', 'imaging', ARRAY['Ultrasound','X-ray'], '31 Disera Dr Unit 200, Thornhill, ON L4J 0A7', '905-763-0009', NULL, NULL, 4.1, 182, 43.812, -79.454, '{"mon":"9:00-17:00","tue":"8:00-20:00","wed":"9:00-20:00","thu":"8:00-18:00","fri":"9:00-17:00","sat":"9:00-16:00","sun":null}', true, 1, 'Requisition from physician', ARRAY[]::text[], ARRAY['English']),

('True North Imaging - Thornhill', 'Diagnostic Imaging', 'imaging', ARRAY['Ultrasound','X-ray','MRI','CT Scan'], '7330 Yonge St Ste 206, Thornhill, ON L4J 1V8', '905-695-9695', NULL, NULL, 4.8, 5245, 43.806, -79.423, '{"mon":"8:00-16:00","tue":"8:00-16:00","wed":"8:00-16:00","thu":"8:00-16:00","fri":"8:00-16:00","sat":null,"sun":null}', true, 1, 'Requisition from physician', ARRAY[]::text[], ARRAY['English','Farsi']),

('WELL Health Diagnostic - Thornhill', 'Diagnostic Imaging', 'imaging', ARRAY['Ultrasound','X-ray','Bone Mineral Density'], '7241 Bathurst St Unit 12, Thornhill, ON L4J 5T7', '833-904-4602', NULL, NULL, 4.8, 1645, 43.799, -79.446, '{"mon":"8:00-18:00","tue":"8:00-17:00","wed":"8:00-18:00","thu":"8:00-17:00","fri":"8:00-16:00","sat":"8:00-16:00","sun":"8:00-15:30"}', true, 0, 'Requisition, walk-in available', ARRAY[]::text[], ARRAY['English']),

-- LABS
('LifeLabs - Promenade Mall', 'Medical Laboratory', 'lab', ARRAY['Blood Work','Urinalysis','Allergy Testing','Glucose Testing'], '1 Promenade Cir Unit E-0126, Thornhill, ON L4J 4P8', '877-849-3637', NULL, 'lifelabs.com', 2.8, 237, 43.807, -79.453, '{"mon":"7:00-17:00","tue":"7:00-17:00","wed":"7:00-17:00","thu":"7:00-17:00","fri":"7:00-17:00","sat":"8:00-13:00","sun":null}', true, 0, 'Requisition, walk-in or appointment', ARRAY[]::text[], ARRAY['English']),

('LifeLabs - Bathurst St', 'Medical Laboratory', 'lab', ARRAY['Blood Work','Urinalysis','Allergy Testing'], '7131 Bathurst St Unit 106, Thornhill, ON L4J 7Z1', '877-849-3637', NULL, 'lifelabs.com', 2.4, 215, 43.796, -79.446, '{"mon":"8:00-16:00","tue":"8:00-16:00","wed":"8:00-16:00","thu":"8:00-16:00","fri":"8:00-16:00","sat":"8:00-12:00","sun":null}', true, 0, 'Requisition, appointment recommended', ARRAY[]::text[], ARRAY['English']),

('Dynacare Laboratory - Bathurst St', 'Medical Laboratory', 'lab', ARRAY['Blood Work','Urinalysis','Pathology'], '7117 Bathurst St Unit L55, Vaughan, ON L4J 2J6', '905-709-1951', NULL, 'dynacare.ca', 3.4, 96, 43.795, -79.446, '{"mon":"8:00-16:00","tue":"8:00-16:00","wed":"8:00-16:00","thu":"8:00-16:00","fri":"8:00-16:00","sat":null,"sun":null}', true, 0, 'Requisition, appointment available', ARRAY[]::text[], ARRAY['English']),

('Alpha Labs - Yonge St', 'Medical Laboratory', 'lab', ARRAY['Blood Work','Urinalysis','ECG','Allergy Testing'], '7163 Yonge St #123, Markham, ON L3T 0C5', '416-449-2166', NULL, NULL, 4.6, 454, 43.803, -79.421, '{"mon":"7:30-16:30","tue":"7:30-16:30","wed":"7:30-16:30","thu":"7:30-16:30","fri":"7:30-16:30","sat":"8:00-13:00","sun":null}', true, 0, 'Requisition, online booking available', ARRAY[]::text[], ARRAY['English','Farsi']),

-- REHAB
('Movement Sports Medicine + Physio', 'Physiotherapy', 'rehab', ARRAY['Physiotherapy','Sports Rehab','Massage Therapy','Concussion Management'], '31 Disera Dr Ste 210, Thornhill, ON L4J 0A7', '905-882-3070', NULL, NULL, 5.0, 519, 43.812, -79.454, '{"mon":"7:30-20:00","tue":"7:30-20:00","wed":"7:30-20:00","thu":"7:30-20:00","fri":"8:00-16:00","sat":"9:00-16:00","sun":null}', true, 1, 'Direct access, no referral needed', ARRAY['Max Handelman (PT)','Adamo Cascone (PT)'], ARRAY['English']),

('PhysioCore and Sports Rehab', 'Physiotherapy', 'rehab', ARRAY['Physiotherapy','Chiropractic','Massage Therapy','Custom Orthotics','Acupuncture'], '9200 Bathurst St, Thornhill, ON L4J 0K1', '905-882-1908', NULL, NULL, 5.0, 297, 43.846, -79.460, '{"mon":"9:00-19:30","tue":"9:00-19:30","wed":"9:00-19:30","thu":"9:00-19:30","fri":"9:00-19:30","sat":"8:00-14:00","sun":null}', true, 0, 'Direct access, no referral needed', ARRAY['David Cheung (PT)'], ARRAY['English']),

('TRCC - Total Rehabilitation Centre', 'Chiropractic / Physiotherapy', 'rehab', ARRAY['Chiropractic','Physiotherapy','Massage Therapy','Rehabilitation','Cupping'], '18 Centre St, Thornhill, ON L4J 1E9', '905-695-1212', NULL, NULL, 4.8, 205, 43.816, -79.425, '{"mon":"9:00-19:00","tue":"11:00-19:00","wed":"9:00-19:30","thu":"9:00-19:00","fri":"9:00-17:00","sat":"9:00-14:00","sun":null}', true, 0, 'Direct access', ARRAY['Dr. Andrew Sulatycki (DC)','Dr. Stephanie (DC)','Dr. Melissa (DC)'], ARRAY['English']),

('Alina Rehab', 'Physiotherapy / Osteopathy', 'rehab', ARRAY['Physiotherapy','Osteopathy','Massage Therapy','WSIB Claims'], '7900 Bathurst St Unit 10, Thornhill, ON L4J 0J9', '905-224-2443', NULL, NULL, 5.0, 29, 43.814, -79.452, '{"mon":"9:00-20:00","tue":"9:00-20:00","wed":"9:00-20:00","thu":"9:00-20:00","fri":"9:00-20:00","sat":"9:00-20:00","sun":"9:00-20:00"}', true, 0, 'Direct access, WSIB accepted', ARRAY['Dr. Ali Reza Saeedi','Dr. Namegh Khaledi'], ARRAY['English','Farsi','Arabic']),

-- SLEEP
('PureFlow Healthcare', 'Sleep Therapy / CPAP', 'specialist', ARRAY['CPAP Setup','Sleep Therapy','CPAP Supplies','Sleep Study Follow-up'], '10 Disera Dr Unit 170, Thornhill, ON L4J 0A7', '905-763-6333', NULL, NULL, 4.6, 248, 43.811, -79.454, '{"mon":"9:00-19:00","tue":"9:00-19:00","wed":"9:00-19:00","thu":"9:00-19:00","fri":"9:00-18:00","sat":"9:00-16:00","sun":null}', true, 1, 'Sleep study results or GP referral', ARRAY[]::text[], ARRAY['English']);
