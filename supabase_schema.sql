-- Run this in your Supabase SQL Editor

-- Create users table (public profile linked to auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at BIGINT NOT NULL,
  subscription_end BIGINT,
  allowed_features JSONB,
  current_session_id TEXT,
  is_active BOOLEAN DEFAULT true,
  admin_message TEXT
);

-- Enable Row Level Security (RLS) for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can view their own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON public.users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert profiles" 
  ON public.users FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update profiles" 
  ON public.users FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete profiles" 
  ON public.users FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Create patients table
CREATE TABLE public.patients (
  id TEXT PRIMARY KEY,
  author_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_name TEXT NOT NULL,
  age TEXT NOT NULL,
  sex TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT NOT NULL,
  complaint TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  selected_symptoms JSONB,
  tongue JSONB,
  pulse JSONB,
  diagnosis JSONB NOT NULL,
  timestamp BIGINT NOT NULL,
  medical_history TEXT,
  biomedical_diagnosis TEXT,
  icd10 TEXT,
  medications TEXT,
  follow_up_date TEXT,
  notes TEXT
);

-- Enable Row Level Security (RLS) for patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create policies for patients
CREATE POLICY "Users can view their own patients" 
  ON public.patients FOR SELECT 
  USING (auth.uid() = author_uid);

CREATE POLICY "Users can insert their own patients" 
  ON public.patients FOR INSERT 
  WITH CHECK (auth.uid() = author_uid);

CREATE POLICY "Users can update their own patients" 
  ON public.patients FOR UPDATE 
  USING (auth.uid() = author_uid);

CREATE POLICY "Users can delete their own patients" 
  ON public.patients FOR DELETE 
  USING (auth.uid() = author_uid);

-- Create a function to update session ID securely
CREATE OR REPLACE FUNCTION public.update_session_id(new_session_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET current_session_id = new_session_id 
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create a user profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, created_at, subscription_end, allowed_features)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    EXTRACT(EPOCH FROM NOW()) * 1000,
    (EXTRACT(EPOCH FROM NOW()) * 1000) + (3 * 24 * 60 * 60 * 1000), -- 3 days free trial
    '{"chat": true, "cdss": false, "atlas": false, "wuxing": false, "archive": false, "invoice": false, "bmi": false}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert a default super_admin if needed (you'll need to sign up this user first via Auth, then update their role)
-- UPDATE public.users SET role = 'super_admin' WHERE email = 'admin@example.com';

-- Enable Realtime for users table
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.users;
