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

INSERT INTO usecases (status)
SELECT true
FROM (
    VALUES
        ('Walking in No Walking Zone'),
        ('Driver Lacking Awareness of People'),
        ('Not Wearing Full PPE'),
        ('Sleeping in Working Zone'),
        ('Carrying Cell Phone in the Working Zone'),
        ('Speeding'),
        ('Goods Obstructing the Working Zone'),
        ('Leaving the Working Zone')
) AS seed(name_en)
WHERE NOT EXISTS (
    SELECT 1
    FROM usecase_translations ut
    WHERE ut.language_code = 'en'
    AND ut.name = seed.name_en
);

INSERT INTO usecase_translations (usecase_id, language_code, name, description)
SELECT
    uc.id,
    seed.language_code,
    seed.name,
    seed.description
FROM (
    VALUES
        (
            'Walking in No Walking Zone',
            'en',
            'Walking in No Walking Zone',
            'Detected a person walking in a restricted no-walking zone.'
        ),
        (
            'Walking in No Walking Zone',
            'es',
            'Caminando en zona no permitida para peatones',
            'Se detecto a una persona caminando en una zona restringida para peatones.'
        ),
        (
            'Walking in No Walking Zone',
            'fr',
            'Marche dans une zone interdite aux pietons',
            'Une personne a ete detectee en train de marcher dans une zone interdite aux pietons.'
        ),
        (
            'Driver Lacking Awareness of People',
            'en',
            'Driver Lacking Awareness of People',
            'Detected a driver not paying attention to nearby people.'
        ),
        (
            'Driver Lacking Awareness of People',
            'es',
            'Conductor sin atencion a las personas',
            'Se detecto un conductor que no presta atencion a las personas cercanas.'
        ),
        (
            'Driver Lacking Awareness of People',
            'fr',
            'Conducteur manquant de vigilance envers les personnes',
            'Un conducteur ne faisant pas attention aux personnes a proximite a ete detecte.'
        ),
        (
            'Not Wearing Full PPE',
            'en',
            'Not Wearing Full PPE',
            'Detected a person not wearing the required full personal protective equipment.'
        ),
        (
            'Not Wearing Full PPE',
            'es',
            'No lleva el EPP completo',
            'Se detecto a una persona sin el equipo de proteccion personal completo requerido.'
        ),
        (
            'Not Wearing Full PPE',
            'fr',
            'Ne porte pas l''EPI complet',
            'Une personne ne portant pas l''equipement de protection individuelle complet requis a ete detectee.'
        ),
        (
            'Sleeping in Working Zone',
            'en',
            'Sleeping in Working Zone',
            'Detected a person sleeping inside the working zone.'
        ),
        (
            'Sleeping in Working Zone',
            'es',
            'Durmiendo en la zona de trabajo',
            'Se detecto a una persona durmiendo dentro de la zona de trabajo.'
        ),
        (
            'Sleeping in Working Zone',
            'fr',
            'Dormir dans la zone de travail',
            'Une personne endormie dans la zone de travail a ete detectee.'
        ),
        (
            'Carrying Cell Phone in the Working Zone',
            'en',
            'Carrying Cell Phone in the Working Zone',
            'Detected a person carrying or using a cell phone in the working zone.'
        ),
        (
            'Carrying Cell Phone in the Working Zone',
            'es',
            'Llevando telefono movil en la zona de trabajo',
            'Se detecto a una persona llevando o usando un telefono movil en la zona de trabajo.'
        ),
        (
            'Carrying Cell Phone in the Working Zone',
            'fr',
            'Transport d''un telephone portable dans la zone de travail',
            'Une personne transportant ou utilisant un telephone portable dans la zone de travail a ete detectee.'
        ),
        (
            'Speeding',
            'en',
            'Speeding',
            'Detected a vehicle moving above the allowed speed limit.'
        ),
        (
            'Speeding',
            'es',
            'Exceso de velocidad',
            'Se detecto un vehiculo circulando por encima del limite de velocidad permitido.'
        ),
        (
            'Speeding',
            'fr',
            'Exces de vitesse',
            'Un vehicule roulant au-dessus de la limite de vitesse autorisee a ete detecte.'
        ),
        (
            'Goods Obstructing the Working Zone',
            'en',
            'Goods Obstructing the Working Zone',
            'Detected goods or materials blocking the working zone.'
        ),
        (
            'Goods Obstructing the Working Zone',
            'es',
            'Mercancias obstruyendo la zona de trabajo',
            'Se detectaron mercancias o materiales bloqueando la zona de trabajo.'
        ),
        (
            'Goods Obstructing the Working Zone',
            'fr',
            'Marchandises obstruant la zone de travail',
            'Des marchandises ou materiaux bloquant la zone de travail ont ete detectes.'
        ),
        (
            'Leaving the Working Zone',
            'en',
            'Leaving the Working Zone',
            'Detected a person leaving the designated working zone.'
        ),
        (
            'Leaving the Working Zone',
            'es',
            'Saliendo de la zona de trabajo',
            'Se detecto a una persona saliendo de la zona de trabajo designada.'
        ),
        (
            'Leaving the Working Zone',
            'fr',
            'Quitter la zone de travail',
            'Une personne quittant la zone de travail designee a ete detectee.'
        )
) AS seed(name_en, language_code, name, description)
JOIN usecase_translations source_en
    ON source_en.language_code = 'en'
    AND source_en.name = seed.name_en
JOIN usecases uc ON uc.id = source_en.usecase_id
ON CONFLICT (usecase_id, language_code) DO NOTHING;

INSERT INTO locations (name_en, name_es, name_fr)
VALUES
    ('Front Gate', 'Puerta Frontal', 'Porte Principale'),
    ('Entry Gate', 'Puerta de Entrada', 'Porte d''Entree'),
    ('Exit Gate', 'Puerta de Salida', 'Porte de Sortie'),
    ('Zone A', 'Zona A', 'Zone A'),
    ('Zone B', 'Zona B', 'Zone B'),
    ('Loading Bay', 'Muelle de Carga', 'Quai de Chargement'),
    ('Parking Area', 'Area de Estacionamiento', 'Zone de Stationnement')
ON CONFLICT (name_en) DO NOTHING;

INSERT INTO cameras (
    name_en,
    name_es,
    name_fr,
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
    seed.name,
    seed.name,
    seed.name,
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
        ('Front Gate Camera 01', 'Front Gate', 'H.264', '1920x1080', 3.5, '5', 'rtsp://visionx/front-gate-cam-01'),
        ('Entry Gate Camera 01', 'Entry Gate', 'H.265', '1280x720', 4.0, '5', 'rtsp://visionx/entry-gate-cam-01'),
        ('Exit Gate Camera 01', 'Exit Gate', 'H.264', '1920x1080', 3.8, '5', 'rtsp://visionx/exit-gate-cam-01'),
        ('Zone A Camera 01', 'Zone A', 'H.265', '2560x1440', 5.5, '10', 'rtsp://visionx/zone-a-cam-01'),
        ('Zone B Camera 01', 'Zone B', 'H.265', '2560x1440', 5.5, '10', 'rtsp://visionx/zone-b-cam-01'),
        ('Loading Bay Camera 01', 'Loading Bay', 'H.264', '1920x1080', 4.2, '8', 'rtsp://visionx/loading-bay-cam-01'),
        ('Parking Area Camera 01', 'Parking Area', 'H.264', '1280x720', 6.0, '5', 'rtsp://visionx/parking-area-cam-01')
) AS seed(name, location_name_en, codec, resolution, height, fps, rtspurl)
JOIN locations l ON l.name_en = seed.location_name_en
CROSS JOIN LATERAL (
    SELECT id FROM users ORDER BY id LIMIT 1
) u
WHERE NOT EXISTS (
    SELECT 1
    FROM cameras c
    WHERE c.name_en = seed.name
);

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
JOIN cameras c ON c.name_en = seed.camera_name
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
