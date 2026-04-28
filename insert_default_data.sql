INSERT INTO roles (code, name_en, name_es, name_fr)
VALUES
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

INSERT INTO usecases (
    code,
    name_en,
    name_es,
    name_fr,
    description_en,
    description_es,
    description_fr
)
VALUES
    (
        'walking_in_no_walking_zone',
        'Walking in No Walking Zone',
        'Caminando en zona no permitida para peatones',
        'Marche dans une zone interdite aux pietons',
        'Detected a person walking in a restricted no-walking zone.',
        'Se detecto a una persona caminando en una zona restringida para peatones.',
        'Une personne a ete detectee en train de marcher dans une zone interdite aux pietons.'
    ),
    (
        'driver_lacking_awareness_of_people',
        'Driver Lacking Awareness of People',
        'Conductor sin atencion a las personas',
        'Conducteur manquant de vigilance envers les personnes',
        'Detected a driver not paying attention to nearby people.',
        'Se detecto un conductor que no presta atencion a las personas cercanas.',
        'Un conducteur ne faisant pas attention aux personnes a proximite a ete detecte.'
    ),
    (
        'not_wearing_full_ppe',
        'Not Wearing Full PPE',
        'No lleva el EPP completo',
        'Ne porte pas l''EPI complet',
        'Detected a person not wearing the required full personal protective equipment.',
        'Se detecto a una persona sin el equipo de proteccion personal completo requerido.',
        'Une personne ne portant pas l''equipement de protection individuelle complet requis a ete detectee.'
    ),
    (
        'sleeping_in_working_zone',
        'Sleeping in Working Zone',
        'Durmiendo en la zona de trabajo',
        'Dormir dans la zone de travail',
        'Detected a person sleeping inside the working zone.',
        'Se detecto a una persona durmiendo dentro de la zona de trabajo.',
        'Une personne endormie dans la zone de travail a ete detectee.'
    ),
    (
        'carrying_cell_phone_in_the_working_zone',
        'Carrying Cell Phone in the Working Zone',
        'Llevando telefono movil en la zona de trabajo',
        'Transport d''un telephone portable dans la zone de travail',
        'Detected a person carrying or using a cell phone in the working zone.',
        'Se detecto a una persona llevando o usando un telefono movil en la zona de trabajo.',
        'Une personne transportant ou utilisant un telephone portable dans la zone de travail a ete detectee.'
    ),
    (
        'speeding',
        'Speeding',
        'Exceso de velocidad',
        'Exces de vitesse',
        'Detected a vehicle moving above the allowed speed limit.',
        'Se detecto un vehiculo circulando por encima del limite de velocidad permitido.',
        'Un vehicule roulant au-dessus de la limite de vitesse autorisee a ete detecte.'
    ),
    (
        'goods_obstructing_the_working_zone',
        'Goods Obstructing the Working Zone',
        'Mercancias obstruyendo la zona de trabajo',
        'Marchandises obstruant la zone de travail',
        'Detected goods or materials blocking the working zone.',
        'Se detectaron mercancias o materiales bloqueando la zona de trabajo.',
        'Des marchandises ou materiaux bloquant la zone de travail ont ete detectes.'
    ),
    (
        'leaving_the_working_zone',
        'Leaving the Working Zone',
        'Saliendo de la zona de trabajo',
        'Quitter la zone de travail',
        'Detected a person leaving the designated working zone.',
        'Se detecto a una persona saliendo de la zona de trabajo designada.',
        'Une personne quittant la zone de travail designee a ete detectee.'
    )
ON CONFLICT (code) DO NOTHING;

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
    name,
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
    WHERE c.name = seed.name
);

INSERT INTO camera_usecase (cameraid, usecaseid, is_active)
SELECT
    c.id,
    uc.id,
    seed.is_active
FROM (
    VALUES
        ('Front Gate Camera 01', 'walking_in_no_walking_zone', true),
        ('Front Gate Camera 01', 'driver_lacking_awareness_of_people', true),
        ('Entry Gate Camera 01', 'not_wearing_full_ppe', true),
        ('Exit Gate Camera 01', 'leaving_the_working_zone', true),
        ('Zone A Camera 01', 'sleeping_in_working_zone', true),
        ('Zone B Camera 01', 'carrying_cell_phone_in_the_working_zone', true),
        ('Loading Bay Camera 01', 'goods_obstructing_the_working_zone', true),
        ('Parking Area Camera 01', 'speeding', true)
) AS seed(camera_name, usecase_code, is_active)
JOIN cameras c ON c.name = seed.camera_name
JOIN usecases uc ON uc.code = seed.usecase_code
ON CONFLICT (cameraid, usecaseid) DO NOTHING;

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
