-- Migration 06: Fix region/district codes in schools
-- The original 05_fictive_schools.sql used district_code as region_code (wrong).
-- This migration corrects all region_code and district_code values to match the GeoJSON.

-- SAVANES (CI11) - Fix region codes
-- Poro (CI28): Korhogo, Ferké
UPDATE public.ecoles SET region_code = 'CI28' WHERE code_mena IN ('PRM-001', 'PRM-002', 'SEC-001', 'PRV-001');
-- Tchologo (CI31): Katiola, Boundiali
UPDATE public.ecoles SET region_code = 'CI31' WHERE code_mena IN ('PRM-003', 'PRM-004');

-- LAGUNES (CI08) → Abidjan schools should be DA Abidjan (CI04)
UPDATE public.ecoles SET district_code = 'CI04', region_code = 'CI01' WHERE code_mena IN ('PRM-010', 'PRM-011', 'SEC-010', 'PRM-012', 'PRM-013', 'PRV-010', 'PRM-014');
-- Agnéby-Tiassa (CI03): Grand-Bassam, Bingerville, Agboville
UPDATE public.ecoles SET region_code = 'CI03' WHERE code_mena IN ('PRM-020', 'PRM-021', 'SEC-020');

-- BAS-SASSANDRA (CI01) - Fix region codes
-- San-Pédro (CI29): San-Pédro, Sassandra, Grand-Béréby
UPDATE public.ecoles SET region_code = 'CI29' WHERE code_mena IN ('PRM-030', 'PRM-031', 'PRM-032', 'SEC-030');

-- COMOÉ (CI02) - Fix region codes
-- Indénié-Djuablin (CI20): Abengourou, Ayamé
UPDATE public.ecoles SET region_code = 'CI20' WHERE code_mena IN ('PRM-040', 'PRM-041', 'SEC-040');

-- VALLÉE DU BANDAMA (CI12) - Fix region codes
-- Gbêkê (CI11): Bouaké
UPDATE public.ecoles SET region_code = 'CI11' WHERE code_mena IN ('PRM-050', 'SEC-050');
-- Hambol (CI17): Vavoua
UPDATE public.ecoles SET region_code = 'CI17' WHERE code_mena = 'PRM-051';

-- MONTAGNES (CI09) - Fix region codes
-- Tonkpi (CI32): Man, Danané, Zwedru
UPDATE public.ecoles SET region_code = 'CI32' WHERE code_mena IN ('PRM-060', 'PRM-061', 'PRM-062');

-- WOROBA (CI13) - Fix region codes
-- Béré (CI07): Daloa
UPDATE public.ecoles SET region_code = 'CI07' WHERE code_mena IN ('PRM-070', 'SEC-070');
-- Worodougou (CI33): Séguéla
UPDATE public.ecoles SET region_code = 'CI33' WHERE code_mena = 'PRM-071';

-- SASSANDRA-MARAHOUÉ (CI10) - Fix region codes
-- Haut-Sassandra (CI18): Divo
UPDATE public.ecoles SET region_code = 'CI18' WHERE code_mena = 'PRM-080';
-- Marahoué (CI23): Gagnoa (S-M)
UPDATE public.ecoles SET region_code = 'CI23' WHERE code_mena = 'PRM-081';

-- GOH-DJIBOUA (CI06) - Fix region codes
-- Gôh (CI13): Gagnoa (G-D), Oumé
UPDATE public.ecoles SET region_code = 'CI13' WHERE code_mena IN ('PRM-090', 'PRM-091');

-- LACS (CI07) - Fix region codes
-- Iffou (CI19): Dimbokro
UPDATE public.ecoles SET region_code = 'CI19' WHERE code_mena = 'PRM-100';
-- Moronou (CI25): M'Batto
UPDATE public.ecoles SET region_code = 'CI25' WHERE code_mena = 'PRM-101';

-- DENGUELÉ (CI03) - Fix region codes
-- Folon (CI10): Odienné
UPDATE public.ecoles SET region_code = 'CI10' WHERE code_mena = 'PRM-110';

-- ZANZAN (CI14) - Fix region codes
-- Gontougo (CI14): Bondoukou, Tanda
UPDATE public.ecoles SET region_code = 'CI14' WHERE code_mena IN ('PRM-120', 'PRM-121');

-- DA YAMOUSSOUKRO (CI05) - Fix region codes
-- District Autonome de Yamoussoukro (CI02): all Yamoussoukro schools
UPDATE public.ecoles SET region_code = 'CI02' WHERE code_mena IN ('PRM-130', 'SEC-130', 'PRV-130');
