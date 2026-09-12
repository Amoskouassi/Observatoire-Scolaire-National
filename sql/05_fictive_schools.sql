-- Migration 05: Insert fictive school data for testing
-- Run this in Supabase SQL Editor AFTER running 04_profile_zones_and_roles.sql

INSERT INTO public.ecoles (
  code_mena, nom_etablissement, statut, niveau_enseignement, milieu_implantation,
  annee_creation, longitude, latitude,
  commune_code, departement_code, region_code, district_code,
  nombre_filles, nombre_garcons, enseignants_presents, salles_classe_total,
  toilettes_filles_fonctionnelles, eau_potable, electricite, materiaux_precaires,
  inventaire_classes, collect_status, last_collecte_at
) VALUES
-- SAVANES (CI11) - Région Poro (CI03) - Département Tchologo
('PRM-001', 'École Primaire de Korhogo Centre', 'public', 'primaire', 'urbain', 1965, -5.6338, 9.4496, 'CI030101', 'CI0301', 'CI03', 'CI11', 180, 210, 12, 8, true, true, true, '{}', '[{"classe":"CP1","filles":30,"garcons":35,"bancs_actifs":28,"besoin_bancs":7},{"classe":"CE1","filles":28,"garcons":32,"bancs_actifs":25,"besoin_bancs":35}]', 'collected', '2026-08-15'),
('PRM-002', 'École Primaire Ferké', 'public', 'primaire', 'rural', 1978, -5.3167, 9.6000, 'CI030102', 'CI0301', 'CI03', 'CI11', 45, 52, 4, 3, false, false, false, '{paillote}', '[{"classe":"CP1","filles":22,"garcons":25,"bancs_actifs":10,"besoin_bancs":37}]', 'collected', '2026-07-20'),
('PRM-003', 'École Primaire de Katiola', 'public', 'primaire', 'urbain', 1982, -5.5500, 9.3333, 'CI030201', 'CI0302', 'CI03', 'CI11', 120, 135, 8, 6, true, true, true, '{}', '[{"classe":"CP1","filles":25,"garcons":28,"bancs_actifs":20,"besoin_bancs":33}]', 'waiting', '2026-06-10'),
('SEC-001', 'Collège Moderne de Korhogo', 'public', 'secondaire', 'urbain', 1990, -5.6350, 9.4510, 'CI030101', 'CI0301', 'CI03', 'CI11', 350, 420, 25, 15, true, true, true, '{}', '[]', 'collected', '2026-09-01'),
('PRV-001', 'École Les Palmiers', 'prive_laic', 'primaire', 'urbain', 2005, -5.6400, 9.4480, 'CI030101', 'CI0301', 'CI03', 'CI11', 95, 85, 8, 6, true, true, true, '{}', '[]', 'collected', '2026-08-20'),
('PRM-004', 'École Primaire Boundiali', 'public', 'primaire', 'rural', 1970, -5.7833, 9.5167, 'CI030103', 'CI0301', 'CI03', 'CI11', 35, 40, 3, 2, false, false, false, '{brique_terre,paillote}', '[{"classe":"CP1","filles":18,"garcons":20,"bancs_actifs":5,"besoin_bancs":33}]', 'pending', NULL),

-- LAGUNES (CI08) - Région Lagunes (CI08) - Département Abidjan
('PRM-010', 'École Primaire Cocody Riviéra', 'public', 'primaire', 'urbain', 1985, -3.8500, 5.3500, 'CI080101', 'CI0801', 'CI08', 'CI08', 220, 240, 14, 10, true, true, true, '{}', '[]', 'collected', '2026-09-10'),
('PRM-011', 'École Primaire Marcory', 'public', 'primaire', 'urbain', 1992, -3.8300, 5.3100, 'CI080102', 'CI0801', 'CI08', 'CI08', 180, 195, 12, 8, true, true, true, '{}', '[]', 'collected', '2026-08-25'),
('SEC-010', 'Collège International d''Abidjan', 'prive_confessionnel', 'secondaire', 'urbain', 2000, -3.8200, 5.3400, 'CI080101', 'CI0801', 'CI08', 'CI08', 400, 450, 30, 18, true, true, true, '{}', '[]', 'collected', '2026-09-15'),
('PRM-012', 'École Primaire Yopougon', 'public', 'primaire', 'urbain', 1988, -3.8800, 5.3300, 'CI080103', 'CI0801', 'CI08', 'CI08', 280, 310, 18, 12, true, true, false, '{}', '[]', 'waiting', '2026-07-05'),
('PRM-013', 'École Primaire Abobo', 'public', 'primaire', 'urbain', 1995, -3.8700, 5.4100, 'CI080104', 'CI0801', 'CI08', 'CI08', 350, 380, 20, 14, true, false, false, '{}', '[]', 'collected', '2026-08-30'),
('PRV-010', 'École Bilingue Cocody', 'prive_laic', 'primaire', 'urbain', 2010, -3.8450, 5.3550, 'CI080101', 'CI0801', 'CI08', 'CI08', 60, 55, 6, 4, true, true, true, '{}', '[]', 'collected', '2026-09-05'),
('PRM-014', 'École Primaire Port-Bouët', 'public', 'primaire', 'urbain', 1978, -3.7800, 5.2600, 'CI080105', 'CI0801', 'CI08', 'CI08', 195, 210, 13, 9, true, true, true, '{}', '[]', 'pending', NULL),

-- LAGUNES - Région Agnéby-Tiassa (CI01)
('PRM-020', 'École Primaire Grand-Bassam', 'public', 'primaire', 'urbain', 1980, -3.7500, 5.2100, 'CI080201', 'CI0802', 'CI08', 'CI08', 140, 155, 10, 7, true, true, true, '{}', '[]', 'collected', '2026-08-18'),
('PRM-021', 'École Primaire Bingerville', 'public', 'primaire', 'rural', 1990, -3.7333, 5.3667, 'CI080202', 'CI0802', 'CI08', 'CI08', 65, 72, 5, 4, false, true, false, '{brique_terre}', '[{"classe":"CP1","filles":32,"garcons":36,"bancs_actifs":15,"besoin_bancs":53}]', 'collected', '2026-07-12'),
('SEC-020', 'Lycée Moderne d''Agboville', 'public', 'secondaire', 'urbain', 1995, -3.8000, 5.2500, 'CI080203', 'CI0802', 'CI08', 'CI08', 280, 310, 22, 14, true, true, true, '{}', '[]', 'collected', '2026-09-12'),

-- BAS-SASSANDRA (CI01) - Région San-Pédro (CI09)
('PRM-030', 'École Primaire San-Pédro Centre', 'public', 'primaire', 'urbain', 1988, -6.4833, 4.7500, 'CI010101', 'CI0101', 'CI01', 'CI01', 160, 175, 11, 8, true, true, false, '{}', '[]', 'collected', '2026-08-22'),
('PRM-031', 'École Primaire Sassandra', 'public', 'primaire', 'rural', 1975, -6.0833, 4.9500, 'CI010102', 'CI0101', 'CI01', 'CI01', 40, 45, 3, 2, false, false, false, '{paillote,boue_banco}', '[{"classe":"CP1","filles":20,"garcons":22,"bancs_actifs":8,"besoin_bancs":34}]', 'pending', NULL),
('PRM-032', 'École Primaire Grand-Béréby', 'public', 'primaire', 'rural', 1992, -6.2167, 4.8833, 'CI010103', 'CI0101', 'CI01', 'CI01', 28, 32, 2, 2, false, false, false, '{paillote}', '[{"classe":"CP1","filles":14,"garcons":16,"bancs_actifs":5,"besoin_bancs":25}]', 'waiting', '2026-06-25'),
('SEC-030', 'Lycée de San-Pédro', 'public', 'secondaire', 'urbain', 2001, -6.4850, 4.7520, 'CI010101', 'CI0101', 'CI01', 'CI01', 220, 250, 18, 12, true, true, true, '{}', '[]', 'collected', '2026-09-08'),

-- COMOÉ (CI02) - Région Indénié-Djuablin
('PRM-040', 'École Primaire Abengourou', 'public', 'primaire', 'urbain', 1972, -3.5000, 6.7333, 'CI020101', 'CI0201', 'CI02', 'CI02', 150, 165, 10, 7, true, true, true, '{}', '[]', 'collected', '2026-08-15'),
('PRM-041', 'École Primaire Ayamé', 'public', 'primaire', 'rural', 1988, -3.3500, 6.6667, 'CI020102', 'CI0201', 'CI02', 'CI02', 35, 40, 3, 2, false, false, false, '{bois,paillote}', '[{"classe":"CP1","filles":18,"garcons":20,"bancs_actifs":7,"besoin_bancs":31}]', 'pending', NULL),
('SEC-040', 'Collège d''Abengourou', 'public', 'secondaire', 'urbain', 1998, -3.4980, 6.7350, 'CI020101', 'CI0201', 'CI02', 'CI02', 180, 200, 15, 10, true, true, true, '{}', '[]', 'collected', '2026-09-02'),

-- VALLÉE DU BANDAMA (CI12) - Région Gbêkê
('PRM-050', 'École Primaire Bouaké Centre', 'public', 'primaire', 'urbain', 1960, -5.0333, 7.6833, 'CI120101', 'CI1201', 'CI12', 'CI12', 250, 280, 16, 10, true, true, true, '{}', '[]', 'collected', '2026-09-10'),
('PRM-051', 'École Primaire Vavoua', 'public', 'primaire', 'rural', 1985, -5.2667, 7.3833, 'CI120102', 'CI1201', 'CI12', 'CI12', 55, 60, 4, 3, false, true, false, '{brique_terre}', '[{"classe":"CP1","filles":28,"garcons":30,"bancs_actifs":12,"besoin_bancs":46}]', 'collected', '2026-07-28'),
('SEC-050', 'Lycée de Bouaké', 'public', 'secondaire', 'urbain', 1970, -5.0350, 7.6850, 'CI120101', 'CI1201', 'CI12', 'CI12', 420, 480, 32, 20, true, true, true, '{}', '[]', 'collected', '2026-09-14'),

-- MONTAGNES (CI09) - Région Tonkpi (CI10)
('PRM-060', 'École Primaire Man Centre', 'public', 'primaire', 'urbain', 1968, -7.3667, 7.3833, 'CI090101', 'CI0901', 'CI09', 'CI09', 170, 185, 12, 8, true, true, false, '{}', '[]', 'collected', '2026-08-28'),
('PRM-061', 'École Primaire Danané', 'public', 'primaire', 'rural', 1980, -7.5333, 7.2500, 'CI090102', 'CI0901', 'CI09', 'CI09', 42, 48, 3, 2, false, false, false, '{paillote,boue_banco}', '[{"classe":"CP1","filles":21,"garcons":24,"bancs_actifs":6,"besoin_bancs":39}]', 'waiting', '2026-06-30'),
('PRM-062', 'École Primaire Zwedru', 'communautaire_non_reconnue', 'primaire', 'rural', 2010, -7.4500, 7.3200, 'CI090103', 'CI0901', 'CI09', 'CI09', 22, 25, 2, 1, false, false, false, '{paillote,bois}', '[{"classe":"CP1","filles":11,"garcons":12,"bancs_actifs":3,"besoin_bancs":20}]', 'pending', NULL),

-- WOROBA (CI13) - Région Béré
('PRM-070', 'École Primaire Daloa Centre', 'public', 'primaire', 'urbain', 1975, -6.0833, 6.8833, 'CI130101', 'CI1301', 'CI13', 'CI13', 200, 220, 14, 9, true, true, true, '{}', '[]', 'collected', '2026-09-05'),
('PRM-071', 'École Primaire Séguéla', 'public', 'primaire', 'rural', 1988, -6.5167, 7.9667, 'CI130102', 'CI1301', 'CI13', 'CI13', 38, 42, 3, 2, false, false, false, '{brique_terre}', '[{"classe":"CP1","filles":19,"garcons":21,"bancs_actifs":8,"besoin_bancs":32}]', 'collected', '2026-07-15'),
('SEC-070', 'Lycée de Daloa', 'public', 'secondaire', 'urbain', 1992, -6.0850, 6.8850, 'CI130101', 'CI1301', 'CI13', 'CI13', 320, 360, 24, 16, true, true, true, '{}', '[]', 'collected', '2026-09-11'),

-- SASSANDRA-MARAHOUÉ (CI10) - Région Haut-Sassandra
('PRM-080', 'École Primaire Divo', 'public', 'primaire', 'rural', 1982, -5.8333, 6.2500, 'CI100101', 'CI1001', 'CI10', 'CI10', 60, 68, 5, 3, false, false, false, '{paillote}', '[{"classe":"CP1","filles":30,"garcons":34,"bancs_actifs":10,"besoin_bancs":54}]', 'waiting', '2026-07-20'),
('PRM-081', 'École Primaire Gagnoa', 'public', 'primaire', 'urbain', 1978, -5.8833, 6.1333, 'CI100102', 'CI1001', 'CI10', 'CI10', 130, 145, 9, 6, true, true, false, '{}', '[]', 'collected', '2026-08-10'),

-- GOH-DJIBOUA (CI06) - Région Gôh
('PRM-090', 'École Primaire Gagnoa', 'public', 'primaire', 'urbain', 1980, -5.8833, 6.1333, 'CI060101', 'CI0601', 'CI06', 'CI06', 140, 155, 10, 7, true, true, true, '{}', '[]', 'collected', '2026-08-20'),
('PRM-091', 'École Primaire Oumé', 'public', 'primaire', 'rural', 1990, -5.9167, 6.3000, 'CI060102', 'CI0601', 'CI06', 'CI06', 30, 35, 2, 2, false, false, false, '{brique_terre}', '[{"classe":"CP1","filles":15,"garcons":17,"bancs_actifs":6,"besoin_bancs":26}]', 'pending', NULL),

-- LACS (CI07) - Région Iffou
('PRM-100', 'École Primaire Dimbokro', 'public', 'primaire', 'urbain', 1975, -4.8333, 6.9167, 'CI070101', 'CI0701', 'CI07', 'CI07', 110, 125, 8, 6, true, true, false, '{}', '[]', 'collected', '2026-09-01'),
('PRM-101', 'École Primaire M''Batto', 'public', 'primaire', 'rural', 1985, -4.5167, 6.4667, 'CI070102', 'CI0701', 'CI07', 'CI07', 25, 28, 2, 1, false, false, false, '{paillote}', '[{"classe":"CP1","filles":12,"garcons":14,"bancs_actifs":4,"besoin_bancs":22}]', 'waiting', '2026-06-18'),

-- DENGUELÉ (CI03) - Région Folon
('PRM-110', 'École Primaire Odienné', 'public', 'primaire', 'rural', 1978, -7.5667, 9.5167, 'CI030101', 'CI0301', 'CI03', 'CI03', 45, 50, 3, 3, false, false, false, '{paillote,boue_banco}', '[{"classe":"CP1","filles":22,"garcons":25,"bancs_actifs":8,"besoin_bancs":39}]', 'pending', NULL),

-- ZANZAN (CI14) - Région Gontougo
('PRM-120', 'École Primaire Bondoukou', 'public', 'primaire', 'urbain', 1982, -3.0167, 8.0333, 'CI140101', 'CI1401', 'CI14', 'CI14', 100, 115, 7, 5, true, true, false, '{}', '[]', 'collected', '2026-08-12'),
('PRM-121', 'École Primaire Tanda', 'public', 'primaire', 'rural', 1995, -3.1667, 7.8000, 'CI140102', 'CI1401', 'CI14', 'CI14', 28, 32, 2, 2, false, false, false, '{bois,paillote}', '[{"classe":"CP1","filles":14,"garcons":16,"bancs_actifs":5,"besoin_bancs":25}]', 'pending', NULL),

-- DA YAMOUSSOUKRO (CI05)
('PRM-130', 'École Primaire Yamoussoukro Centre', 'public', 'primaire', 'urbain', 1960, -5.2833, 6.9167, 'CI050101', 'CI0501', 'CI05', 'CI05', 200, 220, 14, 10, true, true, true, '{}', '[]', 'collected', '2026-09-12'),
('SEC-130', 'Lycée Science et Technologie Yamoussoukro', 'public', 'secondaire', 'urbain', 1990, -5.2850, 6.9180, 'CI050101', 'CI0501', 'CI05', 'CI05', 350, 400, 28, 16, true, true, true, '{}', '[]', 'collected', '2026-09-15'),
('PRV-130', 'École Internationale de Yamoussoukro', 'prive_confessionnel', 'primaire', 'urbain', 2005, -5.2800, 6.9200, 'CI050101', 'CI0501', 'CI05', 'CI05', 80, 75, 8, 6, true, true, true, '{}', '[]', 'collected', '2026-09-08');
