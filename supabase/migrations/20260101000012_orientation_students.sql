-- ============================================================================
-- HYT Wayfinder - orientation cohort roster (approved / declined gate)
--
-- Seeds the 131 students from the last TESDA orientation so the QR
-- flow can gate entry:
--
--   * a brand-new visitor registers and lands as 'pending'
--   * someone from this cohort who scans shows their orientation verdict
--     straight away, because their profile row already exists
--
-- Why this is a migration rather than a plain INSERT:
--
--   * public.users.id REFERENCES auth.users(id) ON DELETE CASCADE. A profile
--     row cannot exist without a matching auth login, so auth.users is
--     populated first and public.users joins onto it by email.
--   * public.users.email is NOT NULL UNIQUE, and 23 of the
--     131 roster rows had no usable address (blank, or a NAME typed
--     into the column). Those get a *.pending@orientation.hyt.local
--     placeholder so the constraint is satisfied; the audit query at the
--     bottom lists every one, to be replaced before credentials go out.
--   * There was no orientation verdict anywhere in the schema, so
--     orientation_status is added here as an enum. 'pending' is the default and
--     is what self-registration produces.
--
-- Password for every seeded login: HytOrient2026!
-- Rotate it, or drop the auth rows and let each student register themselves,
-- before this reaches a real event.
--
-- Safe to re-run: every INSERT is ON CONFLICT DO NOTHING.
--
-- Run it from the Supabase SQL editor (or psql), then reload the PostgREST
-- schema cache so the REST API can see the new enum column:
--
--   NOTIFY pgrst, 'reload schema';
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. orientation_status
-- ----------------------------------------------------------------------------
--
-- 'approved' - attended the last orientation, cleared to enter
-- 'declined' - did not attend / did not pass, turned away
-- 'pending'  - not yet evaluated. Default, and what self-registration gets.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orientation_status') THEN
    CREATE TYPE public.orientation_status AS ENUM ('approved', 'declined', 'pending');
  END IF;
END
$$;

-- Outside the DO block because a type cannot be created and consumed by
-- ALTER TABLE in the same statement batch on every Postgres version.
-- ADD COLUMN IF NOT EXISTS emits a notice rather than an error on re-run.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS orientation_status
  public.orientation_status NOT NULL DEFAULT 'pending';

-- The scanner looks a person up on every scan to decide whether to admit them,
-- so this lookup has to stay fast as the cohort grows.
CREATE INDEX IF NOT EXISTS users_orientation_status_idx
  ON public.users (orientation_status);


-- ----------------------------------------------------------------------------
-- 2. Courses - the programmes in this cohort
-- ----------------------------------------------------------------------------
--
-- 20260101000011 seeded generic labels (Orientation, Safety Training, ...).
-- These are the actual TESDA qualifications, which is what the front desk needs
-- to read at a glance. Added as their own rows so they appear as separate
-- selectable options in the register form and the admin user modal.

INSERT INTO public.courses (label) VALUES
  ('Barista NC II'),
  ('Event Management Services NC II'),
  ('Housekeeping NC II'),
  ('Hilot (Wellness) Services NC II'),
  ('Massage NC II')
ON CONFLICT (label) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 3. auth.users - the login each profile row hangs off
-- ----------------------------------------------------------------------------
--
-- email_confirmed_at is set because staff are pre-provisioning these: nobody
-- should have to click a confirmation link to walk through the door.
--
-- SECURITY: writing to auth.users requires the service_role key or the SQL
-- editor, which is where this runs. It is deliberately NOT done through the
-- REST API - the "users insert own row" policy would correctly refuse it, and
-- routing around that policy is exactly the sort of thing a seed script should
-- not do.
--
-- crypt()/gen_salt() come from pgcrypto, which Supabase enables by default.
-- The password is bcrypt-hashed here and never stored in plain text.

INSERT INTO auth.users (
  id, email, encrypted_password, raw_user_meta_data,
  created_at, updated_at, email_confirmed_at
) VALUES
  (gen_random_uuid(), 'gemmaaranda05@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Gemmalyn Ocbina Aranda","provider":"email","email_confirmed":true}', NOW(), NOW(), 'gemmaaranda05@gmail.com'),
  (gen_random_uuid(), 'marquezprincejhazkie@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Prince Jhazkhie Asis Marquez","provider":"email","email_confirmed":true}', NOW(), NOW(), 'marquezprincejhazkie@gmail.com'),
  (gen_random_uuid(), 'maryysmiclat@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Mary Grace Miclat Antalan","provider":"email","email_confirmed":true}', NOW(), NOW(), 'maryysmiclat@gmail.com'),
  (gen_random_uuid(), 'chryssjerichocorsanes12@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Chryss Jericho Nalla Corsanes","provider":"email","email_confirmed":true}', NOW(), NOW(), 'chryssjerichocorsanes12@gmail.com'),
  (gen_random_uuid(), 'jefgardoce12@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jeffrey Antipuesto Gardoce","provider":"email","email_confirmed":true}', NOW(), NOW(), 'jefgardoce12@gmail.com'),
  (gen_random_uuid(), 'jhaylynilagan532@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jhay Ilagan","provider":"email","email_confirmed":true}', NOW(), NOW(), 'jhaylynilagan532@gmail.com'),
  (gen_random_uuid(), 'lucero.ana.mae.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ana Mae Samentar Lucero","provider":"email","email_confirmed":true}', NOW(), NOW(), 'lucero.ana.mae.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'staromanarichard@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Richard Bello Sta. Romana","provider":"email","email_confirmed":true}', NOW(), NOW(), 'staromanarichard@gmail.com'),
  (gen_random_uuid(), 'vonelongo@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Veronica Manapat Onelongo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'vonelongo@gmail.com'),
  (gen_random_uuid(), 'canes.daniel.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Daniel Manging Canes","provider":"email","email_confirmed":true}', NOW(), NOW(), 'canes.daniel.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'judahpuntual7@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Judah Aggabao Puntual","provider":"email","email_confirmed":true}', NOW(), NOW(), 'judahpuntual7@gmail.com'),
  (gen_random_uuid(), 'mauikengkay@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Maui Natalicio Santos","provider":"email","email_confirmed":true}', NOW(), NOW(), 'mauikengkay@gmail.com'),
  (gen_random_uuid(), 'zuelajasmine@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jasmine Chlouie Sapu-an Zuela","provider":"email","email_confirmed":true}', NOW(), NOW(), 'zuelajasmine@gmail.com'),
  (gen_random_uuid(), 'padilla.gabrielle.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Gabrielle Tagle Padilla","provider":"email","email_confirmed":true}', NOW(), NOW(), 'padilla.gabrielle.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'lancecasinto1407@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Lance Davocol Casinto","provider":"email","email_confirmed":true}', NOW(), NOW(), 'lancecasinto1407@gmail.com'),
  (gen_random_uuid(), 'ologmarca@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Marca Angela Liberato Olog","provider":"email","email_confirmed":true}', NOW(), NOW(), 'ologmarca@gmail.com'),
  (gen_random_uuid(), 'mapalad2005@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Veronica Agsangre Mapalad","provider":"email","email_confirmed":true}', NOW(), NOW(), 'mapalad2005@gmail.com'),
  (gen_random_uuid(), 'marieborja@yahoo.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Shaira Marie Bernardino Borja","provider":"email","email_confirmed":true}', NOW(), NOW(), 'marieborja@yahoo.com'),
  (gen_random_uuid(), 'anniebulalacao048@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Annie Pamintuan Bulalacao","provider":"email","email_confirmed":true}', NOW(), NOW(), 'anniebulalacao048@gmail.com'),
  (gen_random_uuid(), 'johncarlomaestre0807@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"John Carlo Logenic Maestre","provider":"email","email_confirmed":true}', NOW(), NOW(), 'johncarlomaestre0807@gmail.com'),
  (gen_random_uuid(), 'angelicaquibin30@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Angelica Marie Quibin","provider":"email","email_confirmed":true}', NOW(), NOW(), 'angelicaquibin30@gmail.com'),
  (gen_random_uuid(), 'mipfirmadino@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ma. Isabel Parulan Firmalino","provider":"email","email_confirmed":true}', NOW(), NOW(), 'mipfirmadino@gmail.com'),
  (gen_random_uuid(), 'rodelcamelotesquijada@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Rodel Camelotes Quijada","provider":"email","email_confirmed":true}', NOW(), NOW(), 'rodelcamelotesquijada@gmail.com'),
  (gen_random_uuid(), 'joancenfame@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Joancen Rodriguez Palo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'joancenfame@gmail.com'),
  (gen_random_uuid(), 'buenafe71escalera@yahoo.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Buenafe Visca Escalera","provider":"email","email_confirmed":true}', NOW(), NOW(), 'buenafe71escalera@yahoo.com'),
  (gen_random_uuid(), 'francistuazon234@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Francis Pigar Tuazon","provider":"email","email_confirmed":true}', NOW(), NOW(), 'francistuazon234@gmail.com'),
  (gen_random_uuid(), 'mayvaldezqc@yahoo.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"May Valdez Evans","provider":"email","email_confirmed":true}', NOW(), NOW(), 'mayvaldezqc@yahoo.com'),
  (gen_random_uuid(), 'casiano.daniella.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Daniella Casiano","provider":"email","email_confirmed":true}', NOW(), NOW(), 'casiano.daniella.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'johnlloydcarpio0246@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"John Lloyd Yadawon Carpio","provider":"email","email_confirmed":true}', NOW(), NOW(), 'johnlloydcarpio0246@gmail.com'),
  (gen_random_uuid(), 'artesanoshanlegh@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Shanlege Nicole Tortusia Artesano","provider":"email","email_confirmed":true}', NOW(), NOW(), 'artesanoshanlegh@gmail.com'),
  (gen_random_uuid(), 'zyrafernandez73@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Zyraclaire Carillo Fernandez","provider":"email","email_confirmed":true}', NOW(), NOW(), 'zyrafernandez73@gmail.com'),
  (gen_random_uuid(), 'juliapateo0@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Julia Mae Tordecilla Patso","provider":"email","email_confirmed":true}', NOW(), NOW(), 'juliapateo0@gmail.com'),
  (gen_random_uuid(), 'bmaquimot@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ruby Ann Maquimot Mabato","provider":"email","email_confirmed":true}', NOW(), NOW(), 'bmaquimot@gmail.com'),
  (gen_random_uuid(), 'raileycarillois@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Railey Mandapat Carillo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'raileycarillois@gmail.com'),
  (gen_random_uuid(), 'esrafilmadlawi2026@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Esrafil Madlawi Samolden","provider":"email","email_confirmed":true}', NOW(), NOW(), 'esrafilmadlawi2026@gmail.com'),
  (gen_random_uuid(), 'ramoschevie@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Chevie Sheen Zamora Ramos","provider":"email","email_confirmed":true}', NOW(), NOW(), 'ramoschevie@gmail.com'),
  (gen_random_uuid(), 'nickelsonos@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Romel Jhon Nickelson Cruz Cruz","provider":"email","email_confirmed":true}', NOW(), NOW(), 'nickelsonos@gmail.com'),
  (gen_random_uuid(), 'erwinmahiligsumisio069@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Erwin Deinla Subalisid","provider":"email","email_confirmed":true}', NOW(), NOW(), 'erwinmahiligsumisio069@gmail.com'),
  (gen_random_uuid(), 'corpuz.joshua.miguel.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Joshua Miguel Corpuz","provider":"email","email_confirmed":true}', NOW(), NOW(), 'corpuz.joshua.miguel.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'cortez.diana.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Diana Camento Cortez","provider":"email","email_confirmed":true}', NOW(), NOW(), 'cortez.diana.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'reinnahiyatabormarmita@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Reinmah Iya Tabor Marmita","provider":"email","email_confirmed":true}', NOW(), NOW(), 'reinnahiyatabormarmita@gmail.com'),
  (gen_random_uuid(), 'perezlester029@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Lester Dapi Perez","provider":"email","email_confirmed":true}', NOW(), NOW(), 'perezlester029@gmail.com'),
  (gen_random_uuid(), 'mrichynicho0301@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Donnadel Benavidez Molina","provider":"email","email_confirmed":true}', NOW(), NOW(), 'mrichynicho0301@gmail.com'),
  (gen_random_uuid(), 'splotria@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Sheila Ajos Plotria","provider":"email","email_confirmed":true}', NOW(), NOW(), 'splotria@gmail.com'),
  (gen_random_uuid(), 'ramirez.alyza.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Alyza Ann Ramirez","provider":"email","email_confirmed":true}', NOW(), NOW(), 'ramirez.alyza.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'cyrill.divinaflor.canete@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Cyrill Divinaflor Canete","provider":"email","email_confirmed":true}', NOW(), NOW(), 'cyrill.divinaflor.canete@gmail.com'),
  (gen_random_uuid(), 'rkim09391@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Kimberly Shine Bago Reyes","provider":"email","email_confirmed":true}', NOW(), NOW(), 'rkim09391@gmail.com'),
  (gen_random_uuid(), 'rojas.stephanie.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Stephanie Omalza Rojas","provider":"email","email_confirmed":true}', NOW(), NOW(), 'rojas.stephanie.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'johnpatrickmanozo@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"John Patrick Manozo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'johnpatrickmanozo@gmail.com'),
  (gen_random_uuid(), 'simonjocelle.diaz@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jocelle Diaz Simon","provider":"email","email_confirmed":true}', NOW(), NOW(), 'simonjocelle.diaz@gmail.com'),
  (gen_random_uuid(), 'ciauelhernandez0@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ciauel Lozada Hernandez","provider":"email","email_confirmed":true}', NOW(), NOW(), 'ciauelhernandez0@gmail.com'),
  (gen_random_uuid(), 'chrizellekellygeronimo@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Chrizelle Kelly Geronimo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'chrizellekellygeronimo@gmail.com'),
  (gen_random_uuid(), 'quinciejell02@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Quincie Jell Davocol Derueda","provider":"email","email_confirmed":true}', NOW(), NOW(), 'quinciejell02@gmail.com'),
  (gen_random_uuid(), 'carminagerano@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Carmina Gerona Mercado","provider":"email","email_confirmed":true}', NOW(), NOW(), 'carminagerano@gmail.com'),
  (gen_random_uuid(), 'oro.gaveriell.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Gaveriell Oro","provider":"email","email_confirmed":true}', NOW(), NOW(), 'oro.gaveriell.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'kyraisabel.h@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Kyra Isabel Carolino Hernandez","provider":"email","email_confirmed":true}', NOW(), NOW(), 'kyraisabel.h@gmail.com'),
  (gen_random_uuid(), 'yebra.angelann.oroi@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Angel Ann Yebra","provider":"email","email_confirmed":true}', NOW(), NOW(), 'yebra.angelann.oroi@gmail.com'),
  (gen_random_uuid(), 'kyllejustine.jamito08@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Kylle Justine Jamito","provider":"email","email_confirmed":true}', NOW(), NOW(), 'kyllejustine.jamito08@gmail.com'),
  (gen_random_uuid(), 'maritesaramos70@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Marites Antonino Ramos","provider":"email","email_confirmed":true}', NOW(), NOW(), 'maritesaramos70@gmail.com'),
  (gen_random_uuid(), 'athenakaryvevy@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Athena Karyle Daliposon Uy","provider":"email","email_confirmed":true}', NOW(), NOW(), 'athenakaryvevy@gmail.com'),
  (gen_random_uuid(), 'bautistamariemichelle0923@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Maria Michelle Esteban Bautista","provider":"email","email_confirmed":true}', NOW(), NOW(), 'bautistamariemichelle0923@gmail.com'),
  (gen_random_uuid(), 'barcelona.lourdes.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Lourdes Bartolome Barcelona","provider":"email","email_confirmed":true}', NOW(), NOW(), 'barcelona.lourdes.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'genrinajadulco@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Genrina Peralta Jadulco","provider":"email","email_confirmed":true}', NOW(), NOW(), 'genrinajadulco@gmail.com'),
  (gen_random_uuid(), 'jemuelbanzalebismonte@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jemuel Banzale Bismonte","provider":"email","email_confirmed":true}', NOW(), NOW(), 'jemuelbanzalebismonte@gmail.com'),
  (gen_random_uuid(), 'aldrinbarbib467@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Aldrin Bayoca Barbin","provider":"email","email_confirmed":true}', NOW(), NOW(), 'aldrinbarbib467@gmail.com'),
  (gen_random_uuid(), 'shanna.nadal.v2@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ma. Shangrila Santos Nadal","provider":"email","email_confirmed":true}', NOW(), NOW(), 'shanna.nadal.v2@gmail.com'),
  (gen_random_uuid(), 'bantugshinemary@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Shine Mary Bantug","provider":"email","email_confirmed":true}', NOW(), NOW(), 'bantugshinemary@gmail.com'),
  (gen_random_uuid(), 'jaderussel.jra@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jade Russel Amargo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'jaderussel.jra@gmail.com'),
  (gen_random_uuid(), 'atchiethienekoh@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Maria Michelle Melchor Prendol","provider":"email","email_confirmed":true}', NOW(), NOW(), 'atchiethienekoh@gmail.com'),
  (gen_random_uuid(), 'mariaflordeguitlanas02@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Maria Flor Deguit Lanas","provider":"email","email_confirmed":true}', NOW(), NOW(), 'mariaflordeguitlanas02@gmail.com'),
  (gen_random_uuid(), 'rodora0512@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Rodora Balhag Ocampo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'rodora0512@gmail.com'),
  (gen_random_uuid(), 'adryan1026@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Adryan Sales Ocampo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'adryan1026@gmail.com'),
  (gen_random_uuid(), 'annasordaban@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Rosanna Valdez Daban","provider":"email","email_confirmed":true}', NOW(), NOW(), 'annasordaban@gmail.com'),
  (gen_random_uuid(), 'tuazon.anghellina.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Anghellina Pigar Tuazon","provider":"email","email_confirmed":true}', NOW(), NOW(), 'tuazon.anghellina.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'jalatorre2022@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Judy Ann Delmonte Latorre","provider":"email","email_confirmed":true}', NOW(), NOW(), 'jalatorre2022@gmail.com'),
  (gen_random_uuid(), 'pepe.jannet.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jannet Maestre Pepe","provider":"email","email_confirmed":true}', NOW(), NOW(), 'pepe.jannet.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'abuda.abbigayle.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Abbigayle Olivar Abuda","provider":"email","email_confirmed":true}', NOW(), NOW(), 'abuda.abbigayle.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'galvezginalyn8@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ginalyn Canes Galvez","provider":"email","email_confirmed":true}', NOW(), NOW(), 'galvezginalyn8@gmail.com'),
  (gen_random_uuid(), 'tuazon.marialyn.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Marialyn Pigar Tuazon","provider":"email","email_confirmed":true}', NOW(), NOW(), 'tuazon.marialyn.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'rublica.kelvin.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Kelvin Delima Rublica","provider":"email","email_confirmed":true}', NOW(), NOW(), 'rublica.kelvin.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'mariot.maria.carmen.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Maria Carmen Torres Mariot","provider":"email","email_confirmed":true}', NOW(), NOW(), 'mariot.maria.carmen.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'dela.cruz.amelia.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Amelia Rocacorba Dela Cruz","provider":"email","email_confirmed":true}', NOW(), NOW(), 'dela.cruz.amelia.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'rowayajulan@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Julan Rowaya","provider":"email","email_confirmed":true}', NOW(), NOW(), 'rowayajulan@gmail.com'),
  (gen_random_uuid(), 'valenciadojoycemar@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Joyce Mar Albesa Valenciado","provider":"email","email_confirmed":true}', NOW(), NOW(), 'valenciadojoycemar@gmail.com'),
  (gen_random_uuid(), 'joky.lalicshc@phinmaed.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Joses Kyle Lalic","provider":"email","email_confirmed":true}', NOW(), NOW(), 'joky.lalicshc@phinmaed.com'),
  (gen_random_uuid(), 'nsd.prosperity@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Nicko Saturnino Dacayo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'nsd.prosperity@gmail.com'),
  (gen_random_uuid(), 'edmondaranda97@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Edmond Ocbina Aranda","provider":"email","email_confirmed":true}', NOW(), NOW(), 'edmondaranda97@gmail.com'),
  (gen_random_uuid(), 'lourdesairod252@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Lourdes Lontoc Doria","provider":"email","email_confirmed":true}', NOW(), NOW(), 'lourdesairod252@gmail.com'),
  (gen_random_uuid(), 'macapagalj@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Joel Dela Cruz Macapagal","provider":"email","email_confirmed":true}', NOW(), NOW(), 'macapagalj@gmail.com'),
  (gen_random_uuid(), 'beamariegutierrez2@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Bea Marie Traboc Gutierrez","provider":"email","email_confirmed":true}', NOW(), NOW(), 'beamariegutierrez2@gmail.com'),
  (gen_random_uuid(), 'lyragonzales1824@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Lyra Gonzales Estrella","provider":"email","email_confirmed":true}', NOW(), NOW(), 'lyragonzales1824@gmail.com'),
  (gen_random_uuid(), 'jomercano54@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jomer Boy Enero Cano","provider":"email","email_confirmed":true}', NOW(), NOW(), 'jomercano54@gmail.com'),
  (gen_random_uuid(), 'jameshoopercano03@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"James Hooper Enero Cano","provider":"email","email_confirmed":true}', NOW(), NOW(), 'jameshoopercano03@gmail.com'),
  (gen_random_uuid(), 'nairbolap.0824@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Brian Griffin Rodriguez Palo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'nairbolap.0824@gmail.com'),
  (gen_random_uuid(), 'longasarhicashaira@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Rhica Shaira Jimenez Longasa","provider":"email","email_confirmed":true}', NOW(), NOW(), 'longasarhicashaira@gmail.com'),
  (gen_random_uuid(), 'cielolim1423271994@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Cielo De La Cruz Lim","provider":"email","email_confirmed":true}', NOW(), NOW(), 'cielolim1423271994@gmail.com'),
  (gen_random_uuid(), 'rianajean08@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Riana Jean Dumantay Marasigan","provider":"email","email_confirmed":true}', NOW(), NOW(), 'rianajean08@gmail.com'),
  (gen_random_uuid(), 'veateniente091528@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Vea Rafhaela Betita Teniente","provider":"email","email_confirmed":true}', NOW(), NOW(), 'veateniente091528@gmail.com'),
  (gen_random_uuid(), 'reinarecoco@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Reina Mae Plaza Recoco","provider":"email","email_confirmed":true}', NOW(), NOW(), 'reinarecoco@gmail.com'),
  (gen_random_uuid(), 'daisogmaryjoy123@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Mary Joy Masilang Daisog","provider":"email","email_confirmed":true}', NOW(), NOW(), 'daisogmaryjoy123@gmail.com'),
  (gen_random_uuid(), 'mariacleotilde18@yahoo.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ma. Cleotelde Navalle Labuntog","provider":"email","email_confirmed":true}', NOW(), NOW(), 'mariacleotilde18@yahoo.com'),
  (gen_random_uuid(), 'krishamaedanaslotero@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Krishea Mae Lotero","provider":"email","email_confirmed":true}', NOW(), NOW(), 'krishamaedanaslotero@gmail.com'),
  (gen_random_uuid(), 'labuntog.vanessa.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Vanessa Mae Labuntog","provider":"email","email_confirmed":true}', NOW(), NOW(), 'labuntog.vanessa.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'nicolemagabulo17@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Nicole Magabulo","provider":"email","email_confirmed":true}', NOW(), NOW(), 'nicolemagabulo17@gmail.com'),
  (gen_random_uuid(), 'requiroso.loida.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Loida Requiroso","provider":"email","email_confirmed":true}', NOW(), NOW(), 'requiroso.loida.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'blessie.aquino0730@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Blessie Aquino","provider":"email","email_confirmed":true}', NOW(), NOW(), 'blessie.aquino0730@gmail.com'),
  (gen_random_uuid(), 'jonaliemaenavarro@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jonalie Navarro","provider":"email","email_confirmed":true}', NOW(), NOW(), 'jonaliemaenavarro@gmail.com'),
  (gen_random_uuid(), 'infestanpatrick147@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Patrick Infestan","provider":"email","email_confirmed":true}', NOW(), NOW(), 'infestanpatrick147@gmail.com'),
  (gen_random_uuid(), 'dianneainner2@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Dianne Cacho Sinner","provider":"email","email_confirmed":true}', NOW(), NOW(), 'dianneainner2@gmail.com'),
  (gen_random_uuid(), 'annabernardino@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Annalyn Bernardino Narte","provider":"email","email_confirmed":true}', NOW(), NOW(), 'annabernardino@gmail.com'),
  (gen_random_uuid(), 'ibyoungs17@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ivy Tizon","provider":"email","email_confirmed":true}', NOW(), NOW(), 'ibyoungs17@gmail.com'),
  (gen_random_uuid(), 'jheleneclyde.custudio@tup.edu.ph', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jhelene Clyde Custodio","provider":"email","email_confirmed":true}', NOW(), NOW(), 'jheleneclyde.custudio@tup.edu.ph'),
  (gen_random_uuid(), 'rendelynsulla@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Rendelyn Sulla","provider":"email","email_confirmed":true}', NOW(), NOW(), 'rendelynsulla@gmail.com'),
  (gen_random_uuid(), 'galangelgine@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Elgine Galang","provider":"email","email_confirmed":true}', NOW(), NOW(), 'galangelgine@gmail.com'),
  (gen_random_uuid(), 'lyndiejanitoiiii@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Lyndie Janito","provider":"email","email_confirmed":true}', NOW(), NOW(), 'lyndiejanitoiiii@gmail.com'),
  (gen_random_uuid(), 'kramanomrac42@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Mark Carmona","provider":"email","email_confirmed":true}', NOW(), NOW(), 'kramanomrac42@gmail.com'),
  (gen_random_uuid(), 'onatbinamira000@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ronald Binamira","provider":"email","email_confirmed":true}', NOW(), NOW(), 'onatbinamira000@gmail.com'),
  (gen_random_uuid(), 'cg4512933@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Cecillia Garcia","provider":"email","email_confirmed":true}', NOW(), NOW(), 'cg4512933@gmail.com'),
  (gen_random_uuid(), 'henriemdollaga@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Henrietta Dollaga","provider":"email","email_confirmed":true}', NOW(), NOW(), 'henriemdollaga@gmail.com'),
  (gen_random_uuid(), 'ailenedollaga0922@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ailene Dollaga","provider":"email","email_confirmed":true}', NOW(), NOW(), 'ailenedollaga0922@gmail.com'),
  (gen_random_uuid(), 'janeyu12@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jane Godezano Yu","provider":"email","email_confirmed":true}', NOW(), NOW(), 'janeyu12@gmail.com'),
  (gen_random_uuid(), 'pamana.jose.romel.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Jose Romel Dellova Pamana","provider":"email","email_confirmed":true}', NOW(), NOW(), 'pamana.jose.romel.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'dela.cruz.marjorie.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Marjorie Acedera Dela Cruz","provider":"email","email_confirmed":true}', NOW(), NOW(), 'dela.cruz.marjorie.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'bajada.honey.beth.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Honey Beth Jabineao Bajada","provider":"email","email_confirmed":true}', NOW(), NOW(), 'bajada.honey.beth.pending@orientation.hyt.local'),
  (gen_random_uuid(), 'asuncionalexa420@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Ma. Alexa Asuncion Guerrero","provider":"email","email_confirmed":true}', NOW(), NOW(), 'asuncionalexa420@gmail.com'),
  (gen_random_uuid(), 'baconawasharonrojas@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Sharon Rojas","provider":"email","email_confirmed":true}', NOW(), NOW(), 'baconawasharonrojas@gmail.com'),
  (gen_random_uuid(), 'erjiedadis6@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Erjielyn Dadis","provider":"email","email_confirmed":true}', NOW(), NOW(), 'erjiedadis6@gmail.com'),
  (gen_random_uuid(), 'almalorenzana911@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Alma Lorenzana","provider":"email","email_confirmed":true}', NOW(), NOW(), 'almalorenzana911@gmail.com'),
  (gen_random_uuid(), 'rissaoblipias88@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Rissa Oblipias","provider":"email","email_confirmed":true}', NOW(), NOW(), 'rissaoblipias88@gmail.com'),
  (gen_random_uuid(), 'erwindgfernandez@gmail.com', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Erwin Fernandez","provider":"email","email_confirmed":true}', NOW(), NOW(), 'erwindgfernandez@gmail.com'),
  (gen_random_uuid(), 'pamintuan.mario.pending@orientation.hyt.local', crypt('HytOrient2026!', gen_salt('bf')), '{"name":"Mario Pingul Pamintuan","provider":"email","email_confirmed":true}', NOW(), NOW(), 'pamintuan.mario.pending@orientation.hyt.local')
ON CONFLICT (email) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 4. public.users - the profile rows the app actually reads
-- ----------------------------------------------------------------------------
--
-- role 'visitor' for everyone: this cohort grants no permission, it only grants
-- or denies building entry. Nobody is promoted to 'admin' here - the schema
-- enforces a single admin via users_single_admin_idx, so a second one aborts
-- the whole migration.
--
-- Every row starts 'pending'. Flip the verdict afterwards, e.g.:
--
--   UPDATE public.users SET orientation_status = 'approved'
--    WHERE course_id = (SELECT id FROM public.courses WHERE label = 'Barista NC II');

-- The display name is assembled from the parts rather than trusted as free
-- text, so nobody ends up stored as "Lucero, Ana Mae".
INSERT INTO public.users (
  id, email, name, role, visitor_type_id, course_id,
  last_name, first_name, middle_name, middle_initial, name_extension,
  orientation_status
)
SELECT
  a.id,
  u.email,
  TRIM(BOTH ' ' FROM CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)),
  'visitor',
  vt.id,
  c.id,
  u.last_name,
  u.first_name,
  u.middle_name,
  u.middle_initial,
  u.name_extension,
  'pending'
FROM (VALUES
  -- programme, last, first, middle, middle_initial, extension, email
  ('Barista NC II', 'Aranda', 'Gemmalyn', 'Ocbina', 'O.', NULL, 'gemmaaranda05@gmail.com'),
  ('Barista NC II', 'Marquez', 'Prince Jhazkhie', 'Asis', 'A.', NULL, 'marquezprincejhazkie@gmail.com'),
  ('Barista NC II', 'Antalan', 'Mary Grace', 'Miclat', 'M.', NULL, 'maryysmiclat@gmail.com'),
  ('Barista NC II', 'Corsanes', 'Chryss Jericho', 'Nalla', 'N.', NULL, 'chryssjerichocorsanes12@gmail.com'),
  ('Barista NC II', 'Gardoce', 'Jeffrey', 'Antipuesto', 'A.', NULL, 'jefgardoce12@gmail.com'),
  ('Barista NC II', 'Ilagan', 'Jhay', NULL, NULL, NULL, 'jhaylynilagan532@gmail.com'),
  ('Barista NC II', 'Lucero', 'Ana Mae', 'Samentar', 'S.', NULL, 'lucero.ana.mae.pending@orientation.hyt.local'),
  ('Barista NC II', 'Sta. Romana', 'Richard', 'Bello', 'B.', NULL, 'staromanarichard@gmail.com'),
  ('Barista NC II', 'Onelongo', 'Veronica', 'Manapat', 'M.', NULL, 'vonelongo@gmail.com'),
  ('Barista NC II', 'Canes', 'Daniel', 'Manging', 'M.', NULL, 'canes.daniel.pending@orientation.hyt.local'),
  ('Barista NC II', 'Puntual', 'Judah', 'Aggabao', 'A.', NULL, 'judahpuntual7@gmail.com'),
  ('Barista NC II', 'Santos', 'Maui', 'Natalicio', 'M.', NULL, 'mauikengkay@gmail.com'),
  ('Barista NC II', 'Zuela', 'Jasmine Chlouie', 'Sapu-an', 'S.', NULL, 'zuelajasmine@gmail.com'),
  ('Barista NC II', 'Padilla', 'Gabrielle', 'Tagle', 'T.', NULL, 'padilla.gabrielle.pending@orientation.hyt.local'),
  ('Barista NC II', 'Casinto', 'Lance', 'Davocol', 'D.', NULL, 'lancecasinto1407@gmail.com'),
  ('Barista NC II', 'Olog', 'Marca Angela', 'Liberato', 'L.', NULL, 'ologmarca@gmail.com'),
  ('Barista NC II', 'Mapalad', 'Veronica', 'Agsangre', 'A.', NULL, 'mapalad2005@gmail.com'),
  ('Barista NC II', 'Borja', 'Shaira Marie', 'Bernardino', 'B.', NULL, 'marieborja@yahoo.com'),
  ('Barista NC II', 'Bulalacao', 'Annie', 'Pamintuan', 'A.', NULL, 'anniebulalacao048@gmail.com'),
  ('Barista NC II', 'Maestre', 'John Carlo', 'Logenic', 'L.', NULL, 'johncarlomaestre0807@gmail.com'),
  ('Barista NC II', 'Quibin', 'Angelica Marie', NULL, NULL, NULL, 'angelicaquibin30@gmail.com'),
  ('Barista NC II', 'Firmalino', 'Ma. Isabel', 'Parulan', 'P.', NULL, 'mipfirmadino@gmail.com'),
  ('Barista NC II', 'Quijada', 'Rodel', 'Camelotes', 'C.', NULL, 'rodelcamelotesquijada@gmail.com'),
  ('Barista NC II', 'Palo', 'Joancen', 'Rodriguez', 'R.', NULL, 'joancenfame@gmail.com'),
  ('Barista NC II', 'Escalera', 'Buenafe', 'Visca', 'V.', NULL, 'buenafe71escalera@yahoo.com'),
  ('Barista NC II', 'Tuazon', 'Francis', 'Pigar', 'P.', NULL, 'francistuazon234@gmail.com'),
  ('Barista NC II', 'Evans', 'May', 'Valdez', 'V.', NULL, 'mayvaldezqc@yahoo.com'),
  ('Barista NC II', 'Casiano', 'Daniella', NULL, NULL, NULL, 'casiano.daniella.pending@orientation.hyt.local'),
  ('Barista NC II', 'Carpio', 'John Lloyd', 'Yadawon', 'Y.', NULL, 'johnlloydcarpio0246@gmail.com'),
  ('Barista NC II', 'Artesano', 'Shanlege Nicole', 'Tortusia', 'T.', NULL, 'artesanoshanlegh@gmail.com'),
  ('Barista NC II', 'Fernandez', 'Zyraclaire', 'Carillo', 'C.', NULL, 'zyrafernandez73@gmail.com'),
  ('Barista NC II', 'Patso', 'Julia Mae', 'Tordecilla', 'T.', NULL, 'juliapateo0@gmail.com'),
  ('Barista NC II', 'Mabato', 'Ruby Ann', 'Maquimot', 'M.', NULL, 'bmaquimot@gmail.com'),
  ('Barista NC II', 'Carillo', 'Railey', 'Mandapat', 'M.', NULL, 'raileycarillois@gmail.com'),
  ('Barista NC II', 'Samolden', 'Esrafil', 'Madlawi', 'E.', NULL, 'esrafilmadlawi2026@gmail.com'),
  ('Barista NC II', 'Ramos', 'Chevie Sheen', 'Zamora', 'Z.', NULL, 'ramoschevie@gmail.com'),
  ('Barista NC II', 'Cruz', 'Romel Jhon Nickelson', 'Cruz', 'C.', NULL, 'nickelsonos@gmail.com'),
  ('Barista NC II', 'Subalisid', 'Erwin', 'Deinla', 'D.', NULL, 'erwinmahiligsumisio069@gmail.com'),
  ('Barista NC II', 'Corpuz', 'Joshua Miguel', NULL, NULL, NULL, 'corpuz.joshua.miguel.pending@orientation.hyt.local'),
  ('Barista NC II', 'Cortez', 'Diana', 'Camento', 'C.', NULL, 'cortez.diana.pending@orientation.hyt.local'),
  ('Barista NC II', 'Marmita', 'Reinmah Iya', 'Tabor', 'T.', NULL, 'reinnahiyatabormarmita@gmail.com'),
  ('Barista NC II', 'Perez', 'Lester', 'Dapi', 'D.', NULL, 'perezlester029@gmail.com'),
  ('Barista NC II', 'Molina', 'Donnadel', 'Benavidez', 'B.', NULL, 'mrichynicho0301@gmail.com'),
  ('Barista NC II', 'Plotria', 'Sheila', 'Ajos', 'A.', NULL, 'splotria@gmail.com'),
  ('Barista NC II', 'Ramirez', 'Alyza', 'Ann', 'A.', NULL, 'ramirez.alyza.pending@orientation.hyt.local'),
  ('Barista NC II', 'Canete', 'Cyrill', 'Divinaflor', 'D.', NULL, 'cyrill.divinaflor.canete@gmail.com'),
  ('Barista NC II', 'Reyes', 'Kimberly Shine', 'Bago', 'B.', NULL, 'rkim09391@gmail.com'),
  ('Barista NC II', 'Rojas', 'Stephanie', 'Omalza', 'O.', NULL, 'rojas.stephanie.pending@orientation.hyt.local'),
  ('Barista NC II', 'Manozo', 'John', 'Patrick', 'S.', NULL, 'johnpatrickmanozo@gmail.com'),
  ('Barista NC II', 'Simon', 'Jocelle', 'Diaz', 'D.', NULL, 'simonjocelle.diaz@gmail.com'),
  ('Barista NC II', 'Hernandez', 'Ciauel', 'Lozada', 'L.', NULL, 'ciauelhernandez0@gmail.com'),
  ('Barista NC II', 'Geronimo', 'Chrizelle Kelly', NULL, NULL, NULL, 'chrizellekellygeronimo@gmail.com'),
  ('Barista NC II', 'Derueda', 'Quincie Jell', 'Davocol', 'D.', NULL, 'quinciejell02@gmail.com'),
  ('Barista NC II', 'Mercado', 'Carmina', 'Gerona', 'G.', NULL, 'carminagerano@gmail.com'),
  ('Barista NC II', 'Oro', 'Gaveriell', NULL, NULL, NULL, 'oro.gaveriell.pending@orientation.hyt.local'),
  ('Barista NC II', 'Hernandez', 'Kyra Isabel', 'Carolino', 'C.', NULL, 'kyraisabel.h@gmail.com'),
  ('Barista NC II', 'Yebra', 'Angel', 'Ann', 'O.', NULL, 'yebra.angelann.oroi@gmail.com'),
  ('Barista NC II', 'Jamito', 'Kylle', 'Justine', 'J.', NULL, 'kyllejustine.jamito08@gmail.com'),
  ('Event Management Services NC II', 'Ramos', 'Marites', 'Antonino', 'A.', NULL, 'maritesaramos70@gmail.com'),
  ('Event Management Services NC II', 'Uy', 'Athena Karyle', 'Daliposon', 'D.', NULL, 'athenakaryvevy@gmail.com'),
  ('Event Management Services NC II', 'Bautista', 'Maria Michelle', 'Esteban', 'E.', NULL, 'bautistamariemichelle0923@gmail.com'),
  ('Event Management Services NC II', 'Barcelona', 'Lourdes', 'Bartolome', 'B.', NULL, 'barcelona.lourdes.pending@orientation.hyt.local'),
  ('Event Management Services NC II', 'Jadulco', 'Genrina', 'Peralta', 'P.', NULL, 'genrinajadulco@gmail.com'),
  ('Event Management Services NC II', 'Bismonte', 'Jemuel', 'Banzale', 'B.', NULL, 'jemuelbanzalebismonte@gmail.com'),
  ('Event Management Services NC II', 'Barbin', 'Aldrin', 'Bayoca', 'B.', NULL, 'aldrinbarbib467@gmail.com'),
  ('Event Management Services NC II', 'Nadal', 'Ma. Shangrila', 'Santos', 'S.', NULL, 'shanna.nadal.v2@gmail.com'),
  ('Event Management Services NC II', 'Bantug', 'Shine', 'Mary', 'C.', NULL, 'bantugshinemary@gmail.com'),
  ('Event Management Services NC II', 'Amargo', 'Jade', 'Russel', 'Y.', NULL, 'jaderussel.jra@gmail.com'),
  ('Housekeeping NC II', 'Prendol', 'Maria Michelle', 'Melchor', 'M.', NULL, 'atchiethienekoh@gmail.com'),
  ('Housekeeping NC II', 'Lanas', 'Maria Flor', 'Deguit', 'D.', NULL, 'mariaflordeguitlanas02@gmail.com'),
  ('Housekeeping NC II', 'Ocampo', 'Rodora', 'Balhag', 'B.', NULL, 'rodora0512@gmail.com'),
  ('Housekeeping NC II', 'Ocampo', 'Adryan', 'Sales', 'S.', NULL, 'adryan1026@gmail.com'),
  ('Housekeeping NC II', 'Daban', 'Rosanna', 'Valdez', 'V.', NULL, 'annasordaban@gmail.com'),
  ('Housekeeping NC II', 'Tuazon', 'Anghellina', 'Pigar', 'P.', NULL, 'tuazon.anghellina.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Latorre', 'Judy Ann', 'Delmonte', 'D.', NULL, 'jalatorre2022@gmail.com'),
  ('Housekeeping NC II', 'Pepe', 'Jannet', 'Maestre', 'M.', NULL, 'pepe.jannet.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Abuda', 'Abbigayle', 'Olivar', 'O.', NULL, 'abuda.abbigayle.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Galvez', 'Ginalyn', 'Canes', 'G.', NULL, 'galvezginalyn8@gmail.com'),
  ('Housekeeping NC II', 'Tuazon', 'Marialyn', 'Pigar', 'M.', NULL, 'tuazon.marialyn.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Rublica', 'Kelvin', 'Delima', 'K.', NULL, 'rublica.kelvin.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Mariot', 'Maria Carmen', 'Torres', 'T.', NULL, 'mariot.maria.carmen.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Dela Cruz', 'Amelia', 'Rocacorba', 'R.', NULL, 'dela.cruz.amelia.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Rowaya', 'Julan', NULL, NULL, NULL, 'rowayajulan@gmail.com'),
  ('Housekeeping NC II', 'Valenciado', 'Joyce Mar', 'Albesa', 'A.', NULL, 'valenciadojoycemar@gmail.com'),
  ('Housekeeping NC II', 'Lalic', 'Joses Kyle', NULL, NULL, NULL, 'joky.lalicshc@phinmaed.com'),
  ('Housekeeping NC II', 'Dacayo', 'Nicko', 'Saturnino', 'S.', NULL, 'nsd.prosperity@gmail.com'),
  ('Housekeeping NC II', 'Aranda', 'Edmond', 'Ocbina', 'O.', NULL, 'edmondaranda97@gmail.com'),
  ('Housekeeping NC II', 'Doria', 'Lourdes', 'Lontoc', 'L.', NULL, 'lourdesairod252@gmail.com'),
  ('Housekeeping NC II', 'Macapagal', 'Joel', 'Dela Cruz', 'D.', NULL, 'macapagalj@gmail.com'),
  ('Housekeeping NC II', 'Gutierrez', 'Bea Marie', 'Traboc', 'B.', NULL, 'beamariegutierrez2@gmail.com'),
  ('Housekeeping NC II', 'Estrella', 'Lyra', 'Gonzales', 'G.', NULL, 'lyragonzales1824@gmail.com'),
  ('Housekeeping NC II', 'Cano', 'Jomer Boy', 'Enero', 'J.', NULL, 'jomercano54@gmail.com'),
  ('Housekeeping NC II', 'Cano', 'James Hooper', 'Enero', 'J.', NULL, 'jameshoopercano03@gmail.com'),
  ('Housekeeping NC II', 'Palo', 'Brian Griffin', 'Rodriguez', 'B.', NULL, 'nairbolap.0824@gmail.com'),
  ('Housekeeping NC II', 'Longasa', 'Rhica Shaira', 'Jimenez', 'R.', NULL, 'longasarhicashaira@gmail.com'),
  ('Housekeeping NC II', 'Lim', 'Cielo', 'De La Cruz', 'D.', NULL, 'cielolim1423271994@gmail.com'),
  ('Housekeeping NC II', 'Marasigan', 'Riana Jean', 'Dumantay', 'R.', NULL, 'rianajean08@gmail.com'),
  ('Housekeeping NC II', 'Teniente', 'Vea Rafhaela', 'Betita', 'V.', NULL, 'veateniente091528@gmail.com'),
  ('Housekeeping NC II', 'Recoco', 'Reina Mae', 'Plaza', 'R.', NULL, 'reinarecoco@gmail.com'),
  ('Housekeeping NC II', 'Daisog', 'Mary Joy', 'Masilang', 'M.', NULL, 'daisogmaryjoy123@gmail.com'),
  ('Housekeeping NC II', 'Labuntog', 'Ma. Cleotelde', 'Navalle', 'N.', NULL, 'mariacleotilde18@yahoo.com'),
  ('Housekeeping NC II', 'Lotero', 'Krishea', 'Mae', 'M.', NULL, 'krishamaedanaslotero@gmail.com'),
  ('Housekeeping NC II', 'Labuntog', 'Vanessa', 'Mae', 'M.', NULL, 'labuntog.vanessa.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Magabulo', 'Nicole', NULL, NULL, NULL, 'nicolemagabulo17@gmail.com'),
  ('Housekeeping NC II', 'Requiroso', 'Loida', NULL, 'B.', NULL, 'requiroso.loida.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Aquino', 'Blessie', NULL, 'E.', NULL, 'blessie.aquino0730@gmail.com'),
  ('Housekeeping NC II', 'Navarro', 'Jonalie', NULL, 'P.', NULL, 'jonaliemaenavarro@gmail.com'),
  ('Housekeeping NC II', 'Infestan', 'Patrick', NULL, NULL, NULL, 'infestanpatrick147@gmail.com'),
  ('Housekeeping NC II', 'Sinner', 'Dianne', 'Cacho', 'D.', NULL, 'dianneainner2@gmail.com'),
  ('Housekeeping NC II', 'Narte', 'Annalyn', 'Bernardino', 'B.', NULL, 'annabernardino@gmail.com'),
  ('Housekeeping NC II', 'Tizon', 'Ivy', NULL, 'N.', NULL, 'ibyoungs17@gmail.com'),
  ('Housekeeping NC II', 'Custodio', 'Jhelene', 'Clyde', 'C.', NULL, 'jheleneclyde.custudio@tup.edu.ph'),
  ('Housekeeping NC II', 'Sulla', 'Rendelyn', NULL, 'B.', NULL, 'rendelynsulla@gmail.com'),
  ('Housekeeping NC II', 'Galang', 'Elgine', NULL, NULL, NULL, 'galangelgine@gmail.com'),
  ('Housekeeping NC II', 'Janito', 'Lyndie', NULL, 'A.', NULL, 'lyndiejanitoiiii@gmail.com'),
  ('Housekeeping NC II', 'Carmona', 'Mark', NULL, 'R.', NULL, 'kramanomrac42@gmail.com'),
  ('Housekeeping NC II', 'Binamira', 'Ronald', NULL, NULL, NULL, 'onatbinamira000@gmail.com'),
  ('Housekeeping NC II', 'Garcia', 'Cecillia', NULL, 'P.', NULL, 'cg4512933@gmail.com'),
  ('Housekeeping NC II', 'Dollaga', 'Henrietta', NULL, 'M.', NULL, 'henriemdollaga@gmail.com'),
  ('Housekeeping NC II', 'Dollaga', 'Ailene', NULL, 'L.', NULL, 'ailenedollaga0922@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Yu', 'Jane', 'Godezano', 'G.', NULL, 'janeyu12@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Pamana', 'Jose Romel', 'Dellova', 'D.', NULL, 'pamana.jose.romel.pending@orientation.hyt.local'),
  ('Hilot (Wellness) Services NC II', 'Dela Cruz', 'Marjorie', 'Acedera', 'A.', NULL, 'dela.cruz.marjorie.pending@orientation.hyt.local'),
  ('Hilot (Wellness) Services NC II', 'Bajada', 'Honey Beth', 'Jabineao', 'J.', NULL, 'bajada.honey.beth.pending@orientation.hyt.local'),
  ('Hilot (Wellness) Services NC II', 'Guerrero', 'Ma. Alexa', 'Asuncion', 'A.', NULL, 'asuncionalexa420@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Rojas', 'Sharon', NULL, 'B.', NULL, 'baconawasharonrojas@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Dadis', 'Erjielyn', NULL, 'C.', NULL, 'erjiedadis6@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Lorenzana', 'Alma', NULL, 'C.', NULL, 'almalorenzana911@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Oblipias', 'Rissa', NULL, 'A.', NULL, 'rissaoblipias88@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Fernandez', 'Erwin', NULL, 'D.', NULL, 'erwindgfernandez@gmail.com'),
  ('Massage NC II', 'Pamintuan', 'Mario', 'Pingul', 'P.', NULL, 'pamintuan.mario.pending@orientation.hyt.local')
) AS u(programme, last_name, first_name, middle_name, middle_initial, name_extension, email)
JOIN auth.users a
  ON a.email = u.email
LEFT JOIN public.visitor_types vt
  ON vt.label = 'Trainee'
LEFT JOIN public.courses c
  ON c.label = u.programme
ON CONFLICT (email) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 5. Verify
-- ----------------------------------------------------------------------------

-- Cohort size per programme. Expect Barista NC II: 58, Event Management Services NC II: 10, Housekeeping NC II: 52, Hilot (Wellness) Services NC II: 10, Massage NC II: 1.
SELECT c.label AS programme, COUNT(*) AS students
FROM public.users u
JOIN public.courses c ON c.id = u.course_id
WHERE c.label IN ('Barista NC II', 'Event Management Services NC II', 'Housekeeping NC II', 'Hilot (Wellness) Services NC II', 'Massage NC II')
GROUP BY c.label
ORDER BY c.label;

-- Everyone seeded, with their current verdict, so the front desk can eyeball
-- the gate before the event.
SELECT
  u.orientation_status,
  c.label AS programme,
  u.name,
  u.email
FROM public.users u
LEFT JOIN public.courses c ON c.id = u.course_id
WHERE c.label IN ('Barista NC II', 'Event Management Services NC II', 'Housekeeping NC II', 'Hilot (Wellness) Services NC II', 'Massage NC II')
ORDER BY c.label, u.last_name, u.first_name;

-- 23 of 131 rows had no usable email in the source
-- roster. These CANNOT receive a pass until a real address is supplied:
--
--   UPDATE public.users SET email = 'real@example.com'
--    WHERE email = 'the.placeholder@orientation.hyt.local';
--
SELECT last_name, first_name, middle_name, email
FROM public.users
WHERE email LIKE '%.pending@orientation.hyt.local'
ORDER BY last_name, first_name;
