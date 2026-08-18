-- Supabase PostgreSQL Schema for TPIHS ERP
-- Run this script in the Supabase SQL Editor to initialize all tables and views.

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE, -- Matches auth.users.id from Supabase Auth
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  login_id TEXT UNIQUE,
  parent_phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coordinator', 'teacher', 'student', 'parent', 'head', 'md', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Students Table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dob DATE,
  gender TEXT,
  class TEXT NOT NULL,
  section TEXT NOT NULL,
  roll_number TEXT UNIQUE NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT,
  address TEXT,
  extra_data JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  subject TEXT,
  class TEXT,
  section TEXT,
  extra_data JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'leave', 'shortLeave', 'sickLeave')),
  subject TEXT,
  batch TEXT,
  semester TEXT,
  time_slot TEXT,
  class_name TEXT,
  section TEXT,
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  start_time TEXT,
  end_time TEXT,
  duration NUMERIC,
  topic TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create Fees Table
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student UUID REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_on TIMESTAMP WITH TIME ZONE,
  payment_mode TEXT DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'online', 'cheque')),
  discount NUMERIC DEFAULT 0,
  fine NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Create Marks Table
CREATE TABLE IF NOT EXISTS marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT,
  exam TEXT,
  marks NUMERIC,
  entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Create Notices Table
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience TEXT DEFAULT 'all' CHECK (audience IN ('all', 'teachers', 'students')),
  event_date DATE,
  date DATE DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Create Resources Table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'link' CHECK (type IN ('note', 'link', 'file')),
  subject TEXT,
  batch TEXT,
  semester TEXT,
  class_name TEXT,
  section TEXT,
  url TEXT,
  description TEXT,
  audience TEXT DEFAULT 'students' CHECK (audience IN ('all', 'faculty', 'students')),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Create Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student UUID REFERENCES students(id) ON DELETE CASCADE,
  teacher UUID REFERENCES teachers(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Create Timetable Table
CREATE TABLE IF NOT EXISTS timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day TEXT NOT NULL,
  period INTEGER NOT NULL,
  time TEXT,
  discipline TEXT,
  subject TEXT,
  teacher TEXT,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. Create Timetable Metadata Table
CREATE TABLE IF NOT EXISTS timetable_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roles TEXT[],
  format TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. Create Import Batches Table
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sheets JSONB,
  imported_students INTEGER,
  imported_faculty INTEGER,
  skipped JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Views for Mongoose compatibility and complex calculations
CREATE OR REPLACE VIEW lectures_view AS
SELECT
  a.date,
  a.time_slot,
  a.subject,
  a.batch,
  a.semester,
  a.class_name,
  a.section,
  a.start_time,
  a.end_time,
  a.duration,
  a.topic,
  a.marked_by,
  u.name AS faculty,
  u.email AS faculty_email,
  count(a.id) AS total_students,
  sum(case when a.status in ('present', 'late') then 1 else 0 end) AS present_count,
  sum(case when a.status = 'absent' then 1 else 0 end) AS absent_count,
  sum(case when a.status in ('leave', 'shortLeave') then 1 else 0 end) AS leave_count
FROM attendance a
LEFT JOIN users u ON a.marked_by = u.id
GROUP BY
  a.date, a.time_slot, a.subject, a.batch, a.semester, a.class_name, a.section,
  a.start_time, a.end_time, a.duration, a.topic, a.marked_by, u.name, u.email;

CREATE OR REPLACE VIEW defaulters_view AS
SELECT
  a.student AS student_id,
  count(a.id) AS total,
  sum(case when a.status in ('present', 'late') then 1 else 0 end) AS present_like,
  round((sum(case when a.status in ('present', 'late') then 1 else 0 end)::numeric / count(a.id)::numeric) * 100) AS percentage
FROM attendance a
GROUP BY a.student;
