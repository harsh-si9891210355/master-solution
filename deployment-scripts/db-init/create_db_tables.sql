CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_es VARCHAR(255) NOT NULL,
    name_fr VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS usecases (
    id SERIAL PRIMARY KEY,
    status BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS usecase_translations (
    id SERIAL PRIMARY KEY,
    usecase_id INTEGER NOT NULL REFERENCES usecases(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    CONSTRAINT uq_usecase_translation_language UNIQUE (usecase_id, language_code)
);

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified_by INTEGER
);

CREATE TABLE IF NOT EXISTS location_translations (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT uq_location_translation_language UNIQUE (location_id, language_code)
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20),
    role_id INTEGER NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    department VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    country VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_locations_last_modified_by'
        AND table_name = 'locations'
    ) THEN
        ALTER TABLE locations
        ADD CONSTRAINT fk_locations_last_modified_by
        FOREIGN KEY (last_modified_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users_token (
    userid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(100),
    token VARCHAR(500) NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(50),
    user_agent VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (userid, token)
);

CREATE TABLE IF NOT EXISTS cameras (
    id SERIAL PRIMARY KEY,
    locationid INTEGER NOT NULL REFERENCES locations(id),
    codec VARCHAR(255) NOT NULL,
    resolution VARCHAR(255) NOT NULL,
    height DOUBLE PRECISION,
    fps VARCHAR(50) NOT NULL DEFAULT '5',
    rtspurl VARCHAR(255),
    substream_rtspurl VARCHAR(255),
    roi JSONB,
    roi_frame_blob BYTEA,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    is_delete BOOLEAN NOT NULL DEFAULT FALSE,
    status_modified_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    config JSONB,
    last_modified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing databases: add the optional substream URL column.
ALTER TABLE cameras
ADD COLUMN IF NOT EXISTS substream_rtspurl VARCHAR(255),
ADD COLUMN IF NOT EXISTS roi JSONB,
ADD COLUMN IF NOT EXISTS roi_frame_blob BYTEA,
ADD COLUMN IF NOT EXISTS is_delete BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD COLUMN IF NOT EXISTS config JSONB;

CREATE TABLE IF NOT EXISTS camera_translations (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT uq_camera_translation_language UNIQUE (camera_id, language_code)
);

CREATE TABLE IF NOT EXISTS camera_usecase (
    cameraid INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    usecaseid INTEGER NOT NULL REFERENCES usecases(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (cameraid, usecaseid)
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    unique_event_id VARCHAR(6),
    camera_id INTEGER NOT NULL REFERENCES cameras(id),
    location_id INTEGER REFERENCES locations(id),
    usecase_id INTEGER REFERENCES usecases(id),
    metadata TEXT,
    evidence_url VARCHAR(255),
    evidence_storage_path VARCHAR(400),
    number_of_frames INTEGER,
    frames_range VARCHAR(400),
    event_timestamp BIGINT,
    created_date_time TIMESTAMPTZ DEFAULT NOW(),
    event_start_time TIMESTAMPTZ,
    event_end_time TIMESTAMPTZ,
    is_email_sent SMALLINT NOT NULL DEFAULT 0,
    is_notification_sent SMALLINT NOT NULL DEFAULT 0,
    is_event_read SMALLINT NOT NULL DEFAULT 0,
    event_stream_quality SMALLINT NOT NULL DEFAULT 1,
    notification_status SMALLINT
);

-- Migration for existing databases: add the new event columns and relax the
-- over-strict NOT NULLs (idempotent / safe to re-run).
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS unique_event_id VARCHAR(6),
    ADD COLUMN IF NOT EXISTS metadata TEXT,
    ADD COLUMN IF NOT EXISTS evidence_storage_path VARCHAR(400),
    ADD COLUMN IF NOT EXISTS number_of_frames INTEGER,
    ADD COLUMN IF NOT EXISTS frames_range VARCHAR(400),
    ADD COLUMN IF NOT EXISTS event_timestamp BIGINT,
    ADD COLUMN IF NOT EXISTS is_email_sent SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_notification_sent SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_event_read SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS event_stream_quality SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS notification_status SMALLINT;
ALTER TABLE events ALTER COLUMN location_id DROP NOT NULL;
ALTER TABLE events ALTER COLUMN usecase_id DROP NOT NULL;
ALTER TABLE events ALTER COLUMN event_start_time DROP NOT NULL;
ALTER TABLE events ALTER COLUMN event_end_time DROP NOT NULL;
ALTER TABLE events ALTER COLUMN created_date_time DROP NOT NULL;

CREATE TABLE IF NOT EXISTS resources (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);

CREATE TABLE IF NOT EXISTS scopes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource_id BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    scope_id BIGINT NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT,
    CONSTRAINT uq_role_permissions UNIQUE (role_id, resource_id, scope_id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_priority_enum') THEN
        CREATE TYPE incident_priority_enum AS ENUM ('Low', 'Medium', 'High', 'Critical');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status_enum') THEN
        CREATE TYPE incident_status_enum AS ENUM ('New', 'In Progress', 'Resolved', 'Closed');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS incident (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(50) UNIQUE NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    priority incident_priority_enum NOT NULL,
    summary VARCHAR(1000),
    description VARCHAR(1000),
    proof_attachment VARCHAR(255),
    status incident_status_enum DEFAULT 'New',
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_comments (
    comment_id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    comment_text TEXT NOT NULL,
    file_attachment VARCHAR(255),
    feedback INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_usecase_translations_usecase_id ON usecase_translations(usecase_id);
CREATE INDEX IF NOT EXISTS idx_usecase_translations_language_code ON usecase_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_location_translations_location_id ON location_translations(location_id);
CREATE INDEX IF NOT EXISTS idx_location_translations_language_code ON location_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_location_translations_name ON location_translations(name);
CREATE INDEX IF NOT EXISTS idx_locations_last_modified_by ON locations(last_modified_by);
CREATE INDEX IF NOT EXISTS idx_camera_translations_camera_id ON camera_translations(camera_id);
CREATE INDEX IF NOT EXISTS idx_camera_translations_language_code ON camera_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_camera_translations_name ON camera_translations(name);
CREATE INDEX IF NOT EXISTS idx_cameras_locationid ON cameras(locationid);
CREATE INDEX IF NOT EXISTS idx_cameras_status_modified_by ON cameras(status_modified_by);
CREATE INDEX IF NOT EXISTS idx_events_camera_id ON events(camera_id);
CREATE INDEX IF NOT EXISTS idx_events_location_id ON events(location_id);
CREATE INDEX IF NOT EXISTS idx_events_usecase_id ON events(usecase_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_token_userid ON users_token(userid);
CREATE INDEX IF NOT EXISTS idx_users_token_active ON users_token(userid, is_revoked, expires_at);
CREATE INDEX IF NOT EXISTS idx_resources_name ON resources(name);
CREATE INDEX IF NOT EXISTS idx_scopes_name ON scopes(name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource_id ON role_permissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_scope_id ON role_permissions(scope_id);
CREATE INDEX IF NOT EXISTS idx_incident_incident_id ON incident(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_created_by ON incident(created_by);
CREATE INDEX IF NOT EXISTS idx_incident_status ON incident(status);
CREATE INDEX IF NOT EXISTS idx_incident_comments_incident_id ON incident_comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_user_id ON incident_comments(user_id);
