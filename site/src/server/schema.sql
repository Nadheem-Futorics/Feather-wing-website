-- Feather Wing Tours — Trip Planner schema (SQLite via node:sqlite)
-- UUID primary keys (crypto.randomUUID), ISO-8601 timestamps.

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Traveller',
  email TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT,
  start_date TEXT,
  end_date TEXT,
  adults INTEGER NOT NULL DEFAULT 2,
  children INTEGER NOT NULL DEFAULT 0,
  child_ages TEXT,                       -- JSON array
  party_type TEXT NOT NULL DEFAULT 'family',
  currency TEXT NOT NULL DEFAULT 'SAR',
  budget_total REAL,
  budget_per_person INTEGER NOT NULL DEFAULT 0,  -- bool: budget is per person
  accommodation_level TEXT,
  pace TEXT NOT NULL DEFAULT 'balanced',
  interests TEXT,                        -- JSON array
  transport_prefs TEXT,                  -- JSON array
  dietary TEXT,
  accessibility TEXT,
  day_start TEXT NOT NULL DEFAULT '09:00',
  day_end TEXT NOT NULL DEFAULT '21:00',
  notes TEXT,
  cover_scene TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  deleted_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_trips_created_by ON trips(created_by);

CREATE TABLE IF NOT EXISTS trip_members (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL DEFAULT 'viewer',   -- owner | editor | viewer
  created_at TEXT NOT NULL,
  UNIQUE(trip_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_members_trip ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_members_profile ON trip_members(profile_id);

CREATE TABLE IF NOT EXISTS trip_invitations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'editor',
  email TEXT,
  expires_at TEXT NOT NULL,
  accepted_by TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_destinations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  name TEXT NOT NULL,
  country TEXT,
  lat REAL,
  lng REAL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  nights INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dest_trip ON trip_destinations(trip_id);

CREATE TABLE IF NOT EXISTS trip_days (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  date TEXT,
  day_index INTEGER NOT NULL,
  destination_id TEXT REFERENCES trip_destinations(id),
  title TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(trip_id, day_index)
);
CREATE INDEX IF NOT EXISTS idx_days_trip ON trip_days(trip_id);

CREATE TABLE IF NOT EXISTS itinerary_items (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  day_id TEXT REFERENCES trip_days(id),
  place_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'activity',
  address TEXT,
  lat REAL,
  lng REAL,
  start_time TEXT,
  end_time TEXT,
  duration_min INTEGER,
  cost REAL,
  currency TEXT,
  reservation_status TEXT NOT NULL DEFAULT 'none',
  confirmation_number TEXT,
  notes TEXT,
  locked INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'normal',   -- must | normal | low
  slot TEXT,                                  -- morning | afternoon | evening
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',      -- manual | ai | package | discovery
  package_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'trip',
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_trip ON itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_items_day ON itinerary_items(day_id);
CREATE INDEX IF NOT EXISTS idx_items_place ON itinerary_items(place_id);

CREATE TABLE IF NOT EXISTS itinerary_item_versions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  snapshot TEXT NOT NULL,               -- JSON
  reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_item_versions_trip ON itinerary_item_versions(trip_id);

CREATE TABLE IF NOT EXISTS saved_places (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  place_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  data TEXT,                            -- JSON provider payload
  created_by TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(trip_id, place_id)
);

CREATE TABLE IF NOT EXISTS place_cache (
  place_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  data TEXT NOT NULL,                   -- JSON
  fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  type TEXT NOT NULL,
  provider TEXT,
  confirmation_number TEXT,
  start_at TEXT,
  end_at TEXT,
  location TEXT,
  traveler_names TEXT,                  -- JSON array
  price REAL,
  currency TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  deleted_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_res_trip ON reservations(trip_id);

CREATE TABLE IF NOT EXISTS trip_documents (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  reservation_id TEXT,
  item_id TEXT,
  file_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other',
  created_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_docs_trip ON trip_documents(trip_id);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  base_amount REAL,
  base_currency TEXT,
  fx_rate REAL,
  paid_by TEXT,
  spent_at TEXT,
  planned INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  deleted_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);

CREATE TABLE IF NOT EXISTS expense_splits (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES expenses(id),
  profile_id TEXT NOT NULL,
  share REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_splits_expense ON expense_splits(expense_id);

CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'custom',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL REFERENCES checklists(id),
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  assignee TEXT,
  due_date TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clitems_list ON checklist_items(checklist_id);

CREATE TABLE IF NOT EXISTS trip_comments (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  item_id TEXT,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_trip ON trip_comments(trip_id);

CREATE TABLE IF NOT EXISTS trip_activity_log (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  actor_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,                          -- JSON
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_trip ON trip_activity_log(trip_id);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,                -- JSON blocks
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_msgs_conv ON ai_messages(conversation_id);

CREATE TABLE IF NOT EXISTS ai_tool_calls (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT,
  ok INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_change_proposals (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  conversation_id TEXT,
  summary TEXT NOT NULL,
  changes TEXT NOT NULL,                -- JSON ChangeSet
  impact TEXT,                          -- JSON
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | applied | rejected | undone
  undo_snapshot TEXT,                   -- JSON
  created_by TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_proposals_trip ON ai_change_proposals(trip_id);

CREATE TABLE IF NOT EXISTS quote_enquiries (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  trip_id TEXT REFERENCES trips(id),
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  contact_method TEXT,
  nationality TEXT,
  departure_city TEXT,
  travelers INTEGER,
  dates_flexible INTEGER NOT NULL DEFAULT 0,
  budget REAL,
  currency TEXT,
  accommodation TEXT,
  needs_flights INTEGER NOT NULL DEFAULT 0,
  needs_visa INTEGER NOT NULL DEFAULT 0,
  needs_insurance INTEGER NOT NULL DEFAULT 0,
  needs_transfer INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  trip_summary TEXT,                    -- JSON structured summary
  status TEXT NOT NULL DEFAULT 'new',   -- new | in_progress | quoted | closed
  admin_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Homepage contact-form submissions (public /api/enquiry) — the CRM's lead
-- inbox. Distinct from quote_enquiries (structured trip-planner quote
-- requests, which already have their own admin pipeline).
CREATE TABLE IF NOT EXISTS general_enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  service TEXT NOT NULL,
  destination TEXT,
  departure TEXT,
  travel_date TEXT,
  travellers TEXT,
  contact_method TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',   -- new | contacted | qualified | converted | lost
  admin_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_general_enq_status ON general_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_general_enq_created ON general_enquiries(created_at);

CREATE TABLE IF NOT EXISTS company_packages (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  place_en TEXT,
  place_ar TEXT,
  category TEXT,
  duration_en TEXT,
  duration_ar TEXT,
  price_display TEXT,
  lat REAL,
  lng REAL,
  inclusions TEXT,                      -- JSON array
  exclusions TEXT,                      -- JSON array
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Admin portal login (username + scrypt-hashed password, seeded from env on first run)
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL
);

-- Homepage-managed content (admin CRUD via /admin/travel-content)
CREATE TABLE IF NOT EXISTS featured_trips (
  id TEXT PRIMARY KEY,
  scene TEXT NOT NULL DEFAULT 'canyon',
  hue TEXT NOT NULL DEFAULT 'sand',
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  place_en TEXT NOT NULL,
  place_ar TEXT NOT NULL,
  dates_en TEXT,
  dates_ar TEXT,
  duration_en TEXT,
  duration_ar TEXT,
  price TEXT,
  seats INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'saudi',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Knowledge base (admin-managed via /admin/travel-content) — grounds the concierge AI
CREATE TABLE IF NOT EXISTS kb_articles (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Meetings scheduled from /admin/meetings, optionally synced to Google Calendar
-- (calendar_provider is 'google' when a real event was created, 'dev' when only stored locally).
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  calendar_provider TEXT,
  calendar_event_id TEXT,
  calendar_event_link TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meetings_start ON meetings(start_at);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  scene TEXT NOT NULL DEFAULT 'dunes',
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  subtitle_en TEXT,
  subtitle_ar TEXT,
  description_en TEXT,
  description_ar TEXT,
  badge_en TEXT,
  badge_ar TEXT,
  price_from TEXT,
  cta_en TEXT,
  cta_ar TEXT,
  cta_href TEXT NOT NULL DEFAULT '#enquiry',
  valid_until TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
