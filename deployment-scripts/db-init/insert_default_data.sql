INSERT INTO roles (code, name_en, name_es, name_fr)
VALUES
    ('super_admin', 'Super Admin', 'Super Administrador', 'Super Administrateur'),
    ('admin', 'Administrator', 'Administrador', 'Administrateur'),
    ('manager', 'Manager', 'Gerente', 'Gestionnaire'),
    ('user', 'User', 'Usuario', 'Utilisateur')
ON CONFLICT (code) DO NOTHING;

INSERT INTO scopes (name, is_active, created_by, updated_by)
VALUES
    ('create', true, NULL, NULL),
    ('read', true, NULL, NULL),
    ('update', true, NULL, NULL),
    ('delete', true, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO resources (name, is_active, created_by, updated_by)
VALUES
    ('camera', true, NULL, NULL),
    ('usecase', true, NULL, NULL),
    ('user', true, NULL, NULL),
    ('location', true, NULL, NULL),
    ('role', true, NULL, NULL),
    ('event', true, NULL, NULL),
    ('resource', true, NULL, NULL),
    ('scope', true, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (
    email,
    first_name,
    last_name,
    mobile_number,
    role_id,
    hashed_password,
    is_active,
    status
)
SELECT
    'superadmin@visionx.com',
    'Super',
    'Admin',
    NULL,
    r.id,
    'pbkdf2_sha256$100000$YA34Bw+AP/ZbhoATW3MBNQ==$1ldUU7biZpjMELofOv2WJy9Ci9Pd20hMD93F09KzVmc=', -- Password = SuperAdmin@123
    true,
    true
FROM roles r
WHERE r.code = 'super_admin'
ON CONFLICT (email) DO NOTHING;

-- Use cases live in `usecases` (id + status); their names/descriptions live in
-- `usecase_translations`. The parent has no business key, so we insert each
-- parent row together with its translations in one statement: capture the new
-- ids via RETURNING and pair them back to the seed rows by a stable ordinal.
-- Idempotent: re-running skips any use case whose 'en' translation already exists.
WITH seed (name_en, name_es, name_fr, desc_en, desc_es, desc_fr) AS (
    VALUES
        ('Walking in No Walking Zone',
         'Caminando en zona no permitida para peatones',
         'Marche dans une zone interdite aux pietons',
         'Detected a person walking in a restricted no-walking zone.',
         'Se detecto a una persona caminando en una zona restringida para peatones.',
         'Une personne a ete detectee en train de marcher dans une zone interdite aux pietons.'),
        ('Driver Lacking Awareness of People',
         'Conductor sin atencion a las personas',
         'Conducteur manquant de vigilance envers les personnes',
         'Detected a driver not paying attention to nearby people.',
         'Se detecto un conductor que no presta atencion a las personas cercanas.',
         'Un conducteur ne faisant pas attention aux personnes a proximite a ete detecte.'),
        ('Not Wearing Full PPE',
         'No lleva el EPP completo',
         'Ne porte pas l''EPI complet',
         'Detected a person not wearing the required full personal protective equipment.',
         'Se detecto a una persona sin el equipo de proteccion personal completo requerido.',
         'Une personne ne portant pas l''equipement de protection individuelle complet requis a ete detectee.'),
        ('Sleeping in Working Zone',
         'Durmiendo en la zona de trabajo',
         'Dormir dans la zone de travail',
         'Detected a person sleeping inside the working zone.',
         'Se detecto a una persona durmiendo dentro de la zona de trabajo.',
         'Une personne endormie dans la zone de travail a ete detectee.'),
        ('Carrying Cell Phone in the Working Zone',
         'Llevando telefono movil en la zona de trabajo',
         'Transport d''un telephone portable dans la zone de travail',
         'Detected a person carrying or using a cell phone in the working zone.',
         'Se detecto a una persona llevando o usando un telefono movil en la zona de trabajo.',
         'Une personne transportant ou utilisant un telephone portable dans la zone de travail a ete detectee.'),
        ('Speeding',
         'Exceso de velocidad',
         'Exces de vitesse',
         'Detected a vehicle moving above the allowed speed limit.',
         'Se detecto un vehiculo circulando por encima del limite de velocidad permitido.',
         'Un vehicule roulant au-dessus de la limite de vitesse autorisee a ete detecte.'),
        ('Goods Obstructing the Working Zone',
         'Mercancias obstruyendo la zona de trabajo',
         'Marchandises obstruant la zone de travail',
         'Detected goods or materials blocking the working zone.',
         'Se detectaron mercancias o materiales bloqueando la zona de trabajo.',
         'Des marchandises ou materiaux bloquant la zone de travail ont ete detectes.'),
        ('Leaving the Working Zone',
         'Saliendo de la zona de trabajo',
         'Quitter la zone de travail',
         'Detected a person leaving the designated working zone.',
         'Se detecto a una persona saliendo de la zona de trabajo designada.',
         'Une personne quittant la zone de travail designee a ete detectee.')
),
to_insert AS (
    SELECT s.*, row_number() OVER (ORDER BY s.name_en) AS ord
    FROM seed s
    WHERE NOT EXISTS (
        SELECT 1 FROM usecase_translations ut
        WHERE ut.language_code = 'en' AND ut.name = s.name_en
    )
),
ins AS (
    INSERT INTO usecases (status)
    SELECT true FROM to_insert ORDER BY ord
    RETURNING id
),
paired AS (
    SELECT t.*, i.id AS usecase_id
    FROM to_insert t
    JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM ins) i
        ON i.rn = t.ord
)
INSERT INTO usecase_translations (usecase_id, language_code, name, description)
SELECT usecase_id, 'en', name_en, desc_en FROM paired
UNION ALL
SELECT usecase_id, 'es', name_es, desc_es FROM paired
UNION ALL
SELECT usecase_id, 'fr', name_fr, desc_fr FROM paired
ON CONFLICT (usecase_id, language_code) DO NOTHING;

-- Locations follow the same pattern: parent row in `locations`, names in
-- `location_translations`. Insert parent + translations together.
WITH seed (name_en, name_es, name_fr) AS (
    VALUES
        ('Front Gate', 'Puerta Frontal', 'Porte Principale'),
        ('Entry Gate', 'Puerta de Entrada', 'Porte d''Entree'),
        ('Exit Gate', 'Puerta de Salida', 'Porte de Sortie'),
        ('Zone A', 'Zona A', 'Zone A'),
        ('Zone B', 'Zona B', 'Zone B'),
        ('Loading Bay', 'Muelle de Carga', 'Quai de Chargement'),
        ('Parking Area', 'Area de Estacionamiento', 'Zone de Stationnement')
),
to_insert AS (
    SELECT s.*, row_number() OVER (ORDER BY s.name_en) AS ord
    FROM seed s
    WHERE NOT EXISTS (
        SELECT 1 FROM location_translations lt
        WHERE lt.language_code = 'en' AND lt.name = s.name_en
    )
),
ins AS (
    INSERT INTO locations (last_modified_by)
    SELECT NULL FROM to_insert ORDER BY ord
    RETURNING id
),
paired AS (
    SELECT t.*, i.id AS location_id
    FROM to_insert t
    JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM ins) i
        ON i.rn = t.ord
)
INSERT INTO location_translations (location_id, language_code, name)
SELECT location_id, 'en', name_en FROM paired
UNION ALL
SELECT location_id, 'es', name_es FROM paired
UNION ALL
SELECT location_id, 'fr', name_fr FROM paired
ON CONFLICT (location_id, language_code) DO NOTHING;

INSERT INTO cameras (
    locationid,
    codec,
    resolution,
    height,
    fps,
    rtspurl,
    status_modified_by,
    last_modified_at
)
SELECT
    l.id,
    seed.codec,
    seed.resolution,
    seed.height,
    seed.fps,
    seed.rtspurl,
    u.id,
    NOW()
FROM (
    VALUES
        ('Front Gate Camera 01', 'Front Gate Camera 01', 'Front Gate Camera 01', 'Front Gate', 'H.264', '1920x1080', 3.5, '5', 'rtsp://visionx/front-gate-cam-01'),
        ('Entry Gate Camera 01', 'Entry Gate Camera 01', 'Entry Gate Camera 01', 'Entry Gate', 'H.265', '1280x720', 4.0, '5', 'rtsp://visionx/entry-gate-cam-01'),
        ('Exit Gate Camera 01', 'Exit Gate Camera 01', 'Exit Gate Camera 01', 'Exit Gate', 'H.264', '1920x1080', 3.8, '5', 'rtsp://visionx/exit-gate-cam-01'),
        ('Zone A Camera 01', 'Zone A Camera 01', 'Zone A Camera 01', 'Zone A', 'H.265', '2560x1440', 5.5, '10', 'rtsp://visionx/zone-a-cam-01'),
        ('Zone B Camera 01', 'Zone B Camera 01', 'Zone B Camera 01', 'Zone B', 'H.265', '2560x1440', 5.5, '10', 'rtsp://visionx/zone-b-cam-01'),
        ('Loading Bay Camera 01', 'Loading Bay Camera 01', 'Loading Bay Camera 01', 'Loading Bay', 'H.264', '1920x1080', 4.2, '8', 'rtsp://visionx/loading-bay-cam-01'),
        ('Parking Area Camera 01', 'Parking Area Camera 01', 'Parking Area Camera 01', 'Parking Area', 'H.264', '1280x720', 6.0, '5', 'rtsp://visionx/parking-area-cam-01')
) AS seed(name_en, name_es, name_fr, location_name_en, codec, resolution, height, fps, rtspurl)
JOIN location_translations lt ON lt.language_code = 'en' AND lt.name = seed.location_name_en
JOIN locations l ON l.id = lt.location_id
CROSS JOIN LATERAL (
    SELECT id FROM users ORDER BY id LIMIT 1
) u
WHERE NOT EXISTS (
    SELECT 1
    FROM cameras c
    WHERE c.rtspurl = seed.rtspurl
);

INSERT INTO camera_translations (camera_id, language_code, name)
SELECT
    c.id,
    seed.language_code,
    seed.name
FROM (
    VALUES
        ('rtsp://visionx/front-gate-cam-01', 'en', 'Front Gate Camera 01'),
        ('rtsp://visionx/front-gate-cam-01', 'es', 'Front Gate Camera 01'),
        ('rtsp://visionx/front-gate-cam-01', 'fr', 'Front Gate Camera 01'),
        ('rtsp://visionx/entry-gate-cam-01', 'en', 'Entry Gate Camera 01'),
        ('rtsp://visionx/entry-gate-cam-01', 'es', 'Entry Gate Camera 01'),
        ('rtsp://visionx/entry-gate-cam-01', 'fr', 'Entry Gate Camera 01'),
        ('rtsp://visionx/exit-gate-cam-01', 'en', 'Exit Gate Camera 01'),
        ('rtsp://visionx/exit-gate-cam-01', 'es', 'Exit Gate Camera 01'),
        ('rtsp://visionx/exit-gate-cam-01', 'fr', 'Exit Gate Camera 01'),
        ('rtsp://visionx/zone-a-cam-01', 'en', 'Zone A Camera 01'),
        ('rtsp://visionx/zone-a-cam-01', 'es', 'Zone A Camera 01'),
        ('rtsp://visionx/zone-a-cam-01', 'fr', 'Zone A Camera 01'),
        ('rtsp://visionx/zone-b-cam-01', 'en', 'Zone B Camera 01'),
        ('rtsp://visionx/zone-b-cam-01', 'es', 'Zone B Camera 01'),
        ('rtsp://visionx/zone-b-cam-01', 'fr', 'Zone B Camera 01'),
        ('rtsp://visionx/loading-bay-cam-01', 'en', 'Loading Bay Camera 01'),
        ('rtsp://visionx/loading-bay-cam-01', 'es', 'Loading Bay Camera 01'),
        ('rtsp://visionx/loading-bay-cam-01', 'fr', 'Loading Bay Camera 01'),
        ('rtsp://visionx/parking-area-cam-01', 'en', 'Parking Area Camera 01'),
        ('rtsp://visionx/parking-area-cam-01', 'es', 'Parking Area Camera 01'),
        ('rtsp://visionx/parking-area-cam-01', 'fr', 'Parking Area Camera 01')
) AS seed(rtspurl, language_code, name)
JOIN cameras c ON c.rtspurl = seed.rtspurl
ON CONFLICT (camera_id, language_code) DO NOTHING;

INSERT INTO camera_usecase (cameraid, usecaseid, is_active)
SELECT
    c.id,
    uc.id,
    seed.is_active
FROM (
    VALUES
        ('Front Gate Camera 01', 'Walking in No Walking Zone', true),
        ('Front Gate Camera 01', 'Driver Lacking Awareness of People', true),
        ('Entry Gate Camera 01', 'Not Wearing Full PPE', true),
        ('Exit Gate Camera 01', 'Leaving the Working Zone', true),
        ('Zone A Camera 01', 'Sleeping in Working Zone', true),
        ('Zone B Camera 01', 'Carrying Cell Phone in the Working Zone', true),
        ('Loading Bay Camera 01', 'Goods Obstructing the Working Zone', true),
        ('Parking Area Camera 01', 'Speeding', true)
) AS seed(camera_name, usecase_name_en, is_active)
JOIN camera_translations ct ON ct.language_code = 'en' AND ct.name = seed.camera_name
JOIN cameras c ON c.id = ct.camera_id
JOIN usecase_translations ut ON ut.language_code = 'en' AND ut.name = seed.usecase_name_en
JOIN usecases uc ON uc.id = ut.usecase_id
ON CONFLICT (cameraid, usecaseid) DO NOTHING;

-- Super Admin role: Full access to all resources with all scopes (create, read, update, delete)
INSERT INTO role_permissions (role_id, resource_id, scope_id, created_by, updated_by)
SELECT
    r.id,
    res.id,
    s.id,
    NULL,
    NULL
FROM roles r
CROSS JOIN resources res
CROSS JOIN scopes s
WHERE r.code = 'super_admin'
ON CONFLICT (role_id, resource_id, scope_id) DO NOTHING;

-- Admin role: Full access to all resources with all scopes (create, read, update, delete)
INSERT INTO role_permissions (role_id, resource_id, scope_id, created_by, updated_by)
SELECT
    r.id,
    res.id,
    s.id,
    NULL,
    NULL
FROM roles r
CROSS JOIN resources res
CROSS JOIN scopes s
WHERE r.code = 'admin'
ON CONFLICT (role_id, resource_id, scope_id) DO NOTHING;

-- Manager role: Access to camera, usecase, user, location, event with create, read, update (no delete)
INSERT INTO role_permissions (role_id, resource_id, scope_id, created_by, updated_by)
SELECT
    r.id,
    res.id,
    s.id,
    NULL,
    NULL
FROM roles r
CROSS JOIN resources res
CROSS JOIN scopes s
WHERE r.code = 'manager'
AND res.name IN ('camera', 'usecase', 'user', 'location', 'event')
AND s.name IN ('create', 'read', 'update')
ON CONFLICT (role_id, resource_id, scope_id) DO NOTHING;

-- User role: Read-only access to camera and usecase
INSERT INTO role_permissions (role_id, resource_id, scope_id, created_by, updated_by)
SELECT
    r.id,
    res.id,
    s.id,
    NULL,
    NULL
FROM roles r
CROSS JOIN resources res
CROSS JOIN scopes s
WHERE r.code = 'user'
AND res.name IN ('camera', 'usecase')
AND s.name = 'read'
ON CONFLICT (role_id, resource_id, scope_id) DO NOTHING;
