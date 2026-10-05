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
--   * public.users.email was NOT NULL UNIQUE when this was generated, and
--     23 of the 131 rows had no usable address
--     (blank, or a NAME typed into the column). Those got a
--     *.pending@orientation.hyt.local placeholder to satisfy the constraint.
--     Migration 20260101000014 later made the column nullable and retired those
--     placeholders to NULL. The SQL below is kept verbatim so this migration
--     stays reproducible against the schema it was written for, but the
--     CURRENT state of those rows is NULL, not the placeholder.
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
--
-- No ON CONFLICT here, unlike the other two inserts. Supabase's auth.users has
-- no unique constraint on the email column - it is nullable and uniqueness is
-- enforced by the GoTrue service layer rather than by an index - so
-- ON CONFLICT (email) has nothing to match and aborts the statement:
--
--   42P10: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- The WHERE NOT EXISTS guard is what makes this re-runnable instead, and it
-- behaves the same whether or not an index happens to exist. It is not atomic
-- against a concurrent second run, which is fine for a one-off seed.

INSERT INTO auth.users (
  id, email, encrypted_password, raw_user_meta_data,
  created_at, updated_at, email_confirmed_at
)
SELECT
  gen_random_uuid(),
  s.email,
  crypt('HytOrient2026!', gen_salt('bf')),
  s.meta,
  NOW(),
  NOW(),
  NOW()
FROM (VALUES
  ('gemmaaranda05@gmail.com', '{"name":"Gemmalyn Ocbina Aranda","provider":"email","email_confirmed":true}'),
  ('marquezprincejhazkie@gmail.com', '{"name":"Prince Jhazkhie Asis Marquez","provider":"email","email_confirmed":true}'),
  ('maryysmiclat@gmail.com', '{"name":"Mary Grace Miclat Antalan","provider":"email","email_confirmed":true}'),
  ('chryssjerichocorsanes12@gmail.com', '{"name":"Chryss Jericho Nalla Corsanes","provider":"email","email_confirmed":true}'),
  ('jefgardoce12@gmail.com', '{"name":"Jeffrey Antipuesto Gardoce","provider":"email","email_confirmed":true}'),
  ('jhaylynilagan532@gmail.com', '{"name":"Jhay Ilagan","provider":"email","email_confirmed":true}'),
  ('lucero.ana.mae.pending@orientation.hyt.local', '{"name":"Ana Mae Samentar Lucero","provider":"email","email_confirmed":true}'),
  ('staromanarichard@gmail.com', '{"name":"Richard Bello Sta. Romana","provider":"email","email_confirmed":true}'),
  ('vonelongo@gmail.com', '{"name":"Veronica Manapat Onelongo","provider":"email","email_confirmed":true}'),
  ('canes.daniel.pending@orientation.hyt.local', '{"name":"Daniel Manging Canes","provider":"email","email_confirmed":true}'),
  ('judahpuntual7@gmail.com', '{"name":"Judah Aggabao Puntual","provider":"email","email_confirmed":true}'),
  ('mauikengkay@gmail.com', '{"name":"Maui Natalicio Santos","provider":"email","email_confirmed":true}'),
  ('zuelajasmine@gmail.com', '{"name":"Jasmine Chlouie Sapu-an Zuela","provider":"email","email_confirmed":true}'),
  ('padilla.gabrielle.pending@orientation.hyt.local', '{"name":"Gabrielle Tagle Padilla","provider":"email","email_confirmed":true}'),
  ('lancecasinto1407@gmail.com', '{"name":"Lance Davocol Casinto","provider":"email","email_confirmed":true}'),
  ('ologmarca@gmail.com', '{"name":"Marca Angela Liberato Olog","provider":"email","email_confirmed":true}'),
  ('mapalad2005@gmail.com', '{"name":"Veronica Agsangre Mapalad","provider":"email","email_confirmed":true}'),
  ('marieborja@yahoo.com', '{"name":"Shaira Marie Bernardino Borja","provider":"email","email_confirmed":true}'),
  ('anniebulalacao048@gmail.com', '{"name":"Annie Pamintuan Bulalacao","provider":"email","email_confirmed":true}'),
  ('johncarlomaestre0807@gmail.com', '{"name":"John Carlo Logenic Maestre","provider":"email","email_confirmed":true}'),
  ('angelicaquibin30@gmail.com', '{"name":"Angelica Marie Quibin","provider":"email","email_confirmed":true}'),
  ('mipfirmadino@gmail.com', '{"name":"Ma. Isabel Parulan Firmalino","provider":"email","email_confirmed":true}'),
  ('rodelcamelotesquijada@gmail.com', '{"name":"Rodel Camelotes Quijada","provider":"email","email_confirmed":true}'),
  ('joancenfame@gmail.com', '{"name":"Joancen Rodriguez Palo","provider":"email","email_confirmed":true}'),
  ('buenafe71escalera@yahoo.com', '{"name":"Buenafe Visca Escalera","provider":"email","email_confirmed":true}'),
  ('francistuazon234@gmail.com', '{"name":"Francis Pigar Tuazon","provider":"email","email_confirmed":true}'),
  ('mayvaldezqc@yahoo.com', '{"name":"May Valdez Evans","provider":"email","email_confirmed":true}'),
  ('casiano.daniella.pending@orientation.hyt.local', '{"name":"Daniella Casiano","provider":"email","email_confirmed":true}'),
  ('johnlloydcarpio0246@gmail.com', '{"name":"John Lloyd Yadawon Carpio","provider":"email","email_confirmed":true}'),
  ('artesanoshanlegh@gmail.com', '{"name":"Shanlege Nicole Tortusia Artesano","provider":"email","email_confirmed":true}'),
  ('zyrafernandez73@gmail.com', '{"name":"Zyraclaire Carillo Fernandez","provider":"email","email_confirmed":true}'),
  ('juliapateo0@gmail.com', '{"name":"Julia Mae Tordecilla Patso","provider":"email","email_confirmed":true}'),
  ('bmaquimot@gmail.com', '{"name":"Ruby Ann Maquimot Mabato","provider":"email","email_confirmed":true}'),
  ('raileycarillois@gmail.com', '{"name":"Railey Mandapat Carillo","provider":"email","email_confirmed":true}'),
  ('esrafilmadlawi2026@gmail.com', '{"name":"Esrafil Madlawi Samolden","provider":"email","email_confirmed":true}'),
  ('ramoschevie@gmail.com', '{"name":"Chevie Sheen Zamora Ramos","provider":"email","email_confirmed":true}'),
  ('nickelsonos@gmail.com', '{"name":"Romel Jhon Nickelson Cruz Cruz","provider":"email","email_confirmed":true}'),
  ('erwinmahiligsumisio069@gmail.com', '{"name":"Erwin Deinla Subalisid","provider":"email","email_confirmed":true}'),
  ('corpuz.joshua.miguel.pending@orientation.hyt.local', '{"name":"Joshua Miguel Corpuz","provider":"email","email_confirmed":true}'),
  ('cortez.diana.pending@orientation.hyt.local', '{"name":"Diana Camento Cortez","provider":"email","email_confirmed":true}'),
  ('reinnahiyatabormarmita@gmail.com', '{"name":"Reinmah Iya Tabor Marmita","provider":"email","email_confirmed":true}'),
  ('perezlester029@gmail.com', '{"name":"Lester Dapi Perez","provider":"email","email_confirmed":true}'),
  ('mrichynicho0301@gmail.com', '{"name":"Donnadel Benavidez Molina","provider":"email","email_confirmed":true}'),
  ('splotria@gmail.com', '{"name":"Sheila Ajos Plotria","provider":"email","email_confirmed":true}'),
  ('ramirez.alyza.pending@orientation.hyt.local', '{"name":"Alyza Ann Ramirez","provider":"email","email_confirmed":true}'),
  ('cyrill.divinaflor.canete@gmail.com', '{"name":"Cyrill Divinaflor Canete","provider":"email","email_confirmed":true}'),
  ('rkim09391@gmail.com', '{"name":"Kimberly Shine Bago Reyes","provider":"email","email_confirmed":true}'),
  ('rojas.stephanie.pending@orientation.hyt.local', '{"name":"Stephanie Omalza Rojas","provider":"email","email_confirmed":true}'),
  ('johnpatrickmanozo@gmail.com', '{"name":"John Patrick Manozo","provider":"email","email_confirmed":true}'),
  ('simonjocelle.diaz@gmail.com', '{"name":"Jocelle Diaz Simon","provider":"email","email_confirmed":true}'),
  ('ciauelhernandez0@gmail.com', '{"name":"Ciauel Lozada Hernandez","provider":"email","email_confirmed":true}'),
  ('chrizellekellygeronimo@gmail.com', '{"name":"Chrizelle Kelly Geronimo","provider":"email","email_confirmed":true}'),
  ('quinciejell02@gmail.com', '{"name":"Quincie Jell Davocol Derueda","provider":"email","email_confirmed":true}'),
  ('carminagerano@gmail.com', '{"name":"Carmina Gerona Mercado","provider":"email","email_confirmed":true}'),
  ('oro.gaveriell.pending@orientation.hyt.local', '{"name":"Gaveriell Oro","provider":"email","email_confirmed":true}'),
  ('kyraisabel.h@gmail.com', '{"name":"Kyra Isabel Carolino Hernandez","provider":"email","email_confirmed":true}'),
  ('yebra.angelann.oroi@gmail.com', '{"name":"Angel Ann Yebra","provider":"email","email_confirmed":true}'),
  ('kyllejustine.jamito08@gmail.com', '{"name":"Kylle Justine Jamito","provider":"email","email_confirmed":true}'),
  ('maritesaramos70@gmail.com', '{"name":"Marites Antonino Ramos","provider":"email","email_confirmed":true}'),
  ('athenakaryvevy@gmail.com', '{"name":"Athena Karyle Daliposon Uy","provider":"email","email_confirmed":true}'),
  ('bautistamariemichelle0923@gmail.com', '{"name":"Maria Michelle Esteban Bautista","provider":"email","email_confirmed":true}'),
  ('barcelona.lourdes.pending@orientation.hyt.local', '{"name":"Lourdes Bartolome Barcelona","provider":"email","email_confirmed":true}'),
  ('genrinajadulco@gmail.com', '{"name":"Genrina Peralta Jadulco","provider":"email","email_confirmed":true}'),
  ('jemuelbanzalebismonte@gmail.com', '{"name":"Jemuel Banzale Bismonte","provider":"email","email_confirmed":true}'),
  ('aldrinbarbib467@gmail.com', '{"name":"Aldrin Bayoca Barbin","provider":"email","email_confirmed":true}'),
  ('shanna.nadal.v2@gmail.com', '{"name":"Ma. Shangrila Santos Nadal","provider":"email","email_confirmed":true}'),
  ('bantugshinemary@gmail.com', '{"name":"Shine Mary Bantug","provider":"email","email_confirmed":true}'),
  ('jaderussel.jra@gmail.com', '{"name":"Jade Russel Amargo","provider":"email","email_confirmed":true}'),
  ('atchiethienekoh@gmail.com', '{"name":"Maria Michelle Melchor Prendol","provider":"email","email_confirmed":true}'),
  ('mariaflordeguitlanas02@gmail.com', '{"name":"Maria Flor Deguit Lanas","provider":"email","email_confirmed":true}'),
  ('rodora0512@gmail.com', '{"name":"Rodora Balhag Ocampo","provider":"email","email_confirmed":true}'),
  ('adryan1026@gmail.com', '{"name":"Adryan Sales Ocampo","provider":"email","email_confirmed":true}'),
  ('annasordaban@gmail.com', '{"name":"Rosanna Valdez Daban","provider":"email","email_confirmed":true}'),
  ('tuazon.anghellina.pending@orientation.hyt.local', '{"name":"Anghellina Pigar Tuazon","provider":"email","email_confirmed":true}'),
  ('jalatorre2022@gmail.com', '{"name":"Judy Ann Delmonte Latorre","provider":"email","email_confirmed":true}'),
  ('pepe.jannet.pending@orientation.hyt.local', '{"name":"Jannet Maestre Pepe","provider":"email","email_confirmed":true}'),
  ('abuda.abbigayle.pending@orientation.hyt.local', '{"name":"Abbigayle Olivar Abuda","provider":"email","email_confirmed":true}'),
  ('galvezginalyn8@gmail.com', '{"name":"Ginalyn Canes Galvez","provider":"email","email_confirmed":true}'),
  ('tuazon.marialyn.pending@orientation.hyt.local', '{"name":"Marialyn Pigar Tuazon","provider":"email","email_confirmed":true}'),
  ('rublica.kelvin.pending@orientation.hyt.local', '{"name":"Kelvin Delima Rublica","provider":"email","email_confirmed":true}'),
  ('mariot.maria.carmen.pending@orientation.hyt.local', '{"name":"Maria Carmen Torres Mariot","provider":"email","email_confirmed":true}'),
  ('dela.cruz.amelia.pending@orientation.hyt.local', '{"name":"Amelia Rocacorba Dela Cruz","provider":"email","email_confirmed":true}'),
  ('rowayajulan@gmail.com', '{"name":"Julan Rowaya","provider":"email","email_confirmed":true}'),
  ('valenciadojoycemar@gmail.com', '{"name":"Joyce Mar Albesa Valenciado","provider":"email","email_confirmed":true}'),
  ('joky.lalicshc@phinmaed.com', '{"name":"Joses Kyle Lalic","provider":"email","email_confirmed":true}'),
  ('nsd.prosperity@gmail.com', '{"name":"Nicko Saturnino Dacayo","provider":"email","email_confirmed":true}'),
  ('edmondaranda97@gmail.com', '{"name":"Edmond Ocbina Aranda","provider":"email","email_confirmed":true}'),
  ('lourdesairod252@gmail.com', '{"name":"Lourdes Lontoc Doria","provider":"email","email_confirmed":true}'),
  ('macapagalj@gmail.com', '{"name":"Joel Dela Cruz Macapagal","provider":"email","email_confirmed":true}'),
  ('beamariegutierrez2@gmail.com', '{"name":"Bea Marie Traboc Gutierrez","provider":"email","email_confirmed":true}'),
  ('lyragonzales1824@gmail.com', '{"name":"Lyra Gonzales Estrella","provider":"email","email_confirmed":true}'),
  ('jomercano54@gmail.com', '{"name":"Jomer Boy Enero Cano","provider":"email","email_confirmed":true}'),
  ('jameshoopercano03@gmail.com', '{"name":"James Hooper Enero Cano","provider":"email","email_confirmed":true}'),
  ('nairbolap.0824@gmail.com', '{"name":"Brian Griffin Rodriguez Palo","provider":"email","email_confirmed":true}'),
  ('longasarhicashaira@gmail.com', '{"name":"Rhica Shaira Jimenez Longasa","provider":"email","email_confirmed":true}'),
  ('cielolim1423271994@gmail.com', '{"name":"Cielo De La Cruz Lim","provider":"email","email_confirmed":true}'),
  ('rianajean08@gmail.com', '{"name":"Riana Jean Dumantay Marasigan","provider":"email","email_confirmed":true}'),
  ('veateniente091528@gmail.com', '{"name":"Vea Rafhaela Betita Teniente","provider":"email","email_confirmed":true}'),
  ('reinarecoco@gmail.com', '{"name":"Reina Mae Plaza Recoco","provider":"email","email_confirmed":true}'),
  ('daisogmaryjoy123@gmail.com', '{"name":"Mary Joy Masilang Daisog","provider":"email","email_confirmed":true}'),
  ('mariacleotilde18@yahoo.com', '{"name":"Ma. Cleotelde Navalle Labuntog","provider":"email","email_confirmed":true}'),
  ('krishamaedanaslotero@gmail.com', '{"name":"Krishea Mae Lotero","provider":"email","email_confirmed":true}'),
  ('labuntog.vanessa.pending@orientation.hyt.local', '{"name":"Vanessa Mae Labuntog","provider":"email","email_confirmed":true}'),
  ('nicolemagabulo17@gmail.com', '{"name":"Nicole Magabulo","provider":"email","email_confirmed":true}'),
  ('requiroso.loida.pending@orientation.hyt.local', '{"name":"Loida Requiroso","provider":"email","email_confirmed":true}'),
  ('blessie.aquino0730@gmail.com', '{"name":"Blessie Aquino","provider":"email","email_confirmed":true}'),
  ('jonaliemaenavarro@gmail.com', '{"name":"Jonalie Navarro","provider":"email","email_confirmed":true}'),
  ('infestanpatrick147@gmail.com', '{"name":"Patrick Infestan","provider":"email","email_confirmed":true}'),
  ('dianneainner2@gmail.com', '{"name":"Dianne Cacho Sinner","provider":"email","email_confirmed":true}'),
  ('annabernardino@gmail.com', '{"name":"Annalyn Bernardino Narte","provider":"email","email_confirmed":true}'),
  ('ibyoungs17@gmail.com', '{"name":"Ivy Tizon","provider":"email","email_confirmed":true}'),
  ('jheleneclyde.custudio@tup.edu.ph', '{"name":"Jhelene Clyde Custodio","provider":"email","email_confirmed":true}'),
  ('rendelynsulla@gmail.com', '{"name":"Rendelyn Sulla","provider":"email","email_confirmed":true}'),
  ('galangelgine@gmail.com', '{"name":"Elgine Galang","provider":"email","email_confirmed":true}'),
  ('lyndiejanitoiiii@gmail.com', '{"name":"Lyndie Janito","provider":"email","email_confirmed":true}'),
  ('kramanomrac42@gmail.com', '{"name":"Mark Carmona","provider":"email","email_confirmed":true}'),
  ('onatbinamira000@gmail.com', '{"name":"Ronald Binamira","provider":"email","email_confirmed":true}'),
  ('cg4512933@gmail.com', '{"name":"Cecillia Garcia","provider":"email","email_confirmed":true}'),
  ('henriemdollaga@gmail.com', '{"name":"Henrietta Dollaga","provider":"email","email_confirmed":true}'),
  ('ailenedollaga0922@gmail.com', '{"name":"Ailene Dollaga","provider":"email","email_confirmed":true}'),
  ('janeyu12@gmail.com', '{"name":"Jane Godezano Yu","provider":"email","email_confirmed":true}'),
  ('pamana.jose.romel.pending@orientation.hyt.local', '{"name":"Jose Romel Dellova Pamana","provider":"email","email_confirmed":true}'),
  ('dela.cruz.marjorie.pending@orientation.hyt.local', '{"name":"Marjorie Acedera Dela Cruz","provider":"email","email_confirmed":true}'),
  ('bajada.honey.beth.pending@orientation.hyt.local', '{"name":"Honey Beth Jabineao Bajada","provider":"email","email_confirmed":true}'),
  ('asuncionalexa420@gmail.com', '{"name":"Ma. Alexa Asuncion Guerrero","provider":"email","email_confirmed":true}'),
  ('baconawasharonrojas@gmail.com', '{"name":"Sharon Rojas","provider":"email","email_confirmed":true}'),
  ('erjiedadis6@gmail.com', '{"name":"Erjielyn Dadis","provider":"email","email_confirmed":true}'),
  ('almalorenzana911@gmail.com', '{"name":"Alma Lorenzana","provider":"email","email_confirmed":true}'),
  ('rissaoblipias88@gmail.com', '{"name":"Rissa Oblipias","provider":"email","email_confirmed":true}'),
  ('erwindgfernandez@gmail.com', '{"name":"Erwin Fernandez","provider":"email","email_confirmed":true}'),
  ('pamintuan.mario.pending@orientation.hyt.local', '{"name":"Mario Pingul Pamintuan","provider":"email","email_confirmed":true}')
) AS s(email, meta)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users existing WHERE existing.email = s.email
);


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
