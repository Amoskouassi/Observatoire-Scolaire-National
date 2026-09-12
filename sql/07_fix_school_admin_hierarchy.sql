-- Migration 07: Fix all 44 school admin codes to match GeoJSON hierarchy
-- Problem: dept_code and commune_code were randomized without respecting the real admin hierarchy
-- Example: school in Poro (CI28) had dept=CI0301 (Agboville in Agneby-Tiassa), should be CI28xx

-- Region → District mapping (from GeoJSON):
-- CI01 Abidjan → CI04, CI02 Yamoussoukro → CI05, CI03 Agneby-Tiassa → CI08 Lagunes
-- CI04 Bafing → CI13, CI05 Bagoue → CI11, CI06 Belier → CI07, CI07 Bere → CI13
-- CI08 Bounkani → CI14, CI09 Cavally → CI09, CI10 Folon → CI03, CI11 Gbeke → CI12
-- CI12 Gbokle → CI01, CI13 Goh → CI06, CI14 Gontougo → CI14, CI15 Grands Ponts → CI08
-- CI16 Guemon → CI09, CI17 Hambol → CI12, CI18 Haut-Sassandra → CI10, CI19 Iffou → CI07
-- CI20 Indenie-Djuablin → CI02, CI21 Kabadougou → CI03, CI22 Loh-Djiboua → CI06
-- CI23 Marahoue → CI10, CI24 Me → CI08, CI25 Moronou → CI07, CI26 Nawa → CI01
-- CI27 N'Zi → CI07, CI28 Poro → CI11, CI29 San Pedro → CI01, CI30 Sud-Comoe → CI02
-- CI31 Tchologo → CI11, CI32 Tonkpi → CI09, CI33 Worodougou → CI13

-- === District Autonome D'Abidjan (CI01/CI04) ===
UPDATE ecoles SET departement_code = 'CI0101', commune_code = 'CI010101' WHERE code_mena = 'SEC-010';
UPDATE ecoles SET departement_code = 'CI0101', commune_code = 'CI010102' WHERE code_mena = 'PRV-010';
UPDATE ecoles SET departement_code = 'CI0101', commune_code = 'CI010103' WHERE code_mena = 'PRM-010';
UPDATE ecoles SET departement_code = 'CI0101', commune_code = 'CI010104' WHERE code_mena = 'PRM-013';
UPDATE ecoles SET departement_code = 'CI0101', commune_code = 'CI010105' WHERE code_mena = 'PRM-011';
UPDATE ecoles SET departement_code = 'CI0101', commune_code = 'CI010106' WHERE code_mena = 'PRM-012';
UPDATE ecoles SET departement_code = 'CI0101', commune_code = 'CI010107' WHERE code_mena = 'PRM-014';

-- === District Autonome De Yamoussoukro (CI02/CI05) ===
UPDATE ecoles SET departement_code = 'CI0201', commune_code = 'CI020101' WHERE code_mena = 'PRV-130';
UPDATE ecoles SET departement_code = 'CI0201', commune_code = 'CI020102' WHERE code_mena = 'PRM-130';
UPDATE ecoles SET departement_code = 'CI0202', commune_code = 'CI020201' WHERE code_mena = 'SEC-130';

-- === Indenie-Djuablin (CI20) in Comoe (CI02) ===
UPDATE ecoles SET departement_code = 'CI2001', commune_code = 'CI200101' WHERE code_mena = 'SEC-040';
UPDATE ecoles SET departement_code = 'CI2002', commune_code = 'CI200201' WHERE code_mena = 'PRM-040';
UPDATE ecoles SET departement_code = 'CI2003', commune_code = 'CI200301' WHERE code_mena = 'PRM-041';

-- === Agneby-Tiassa (CI03) in Lagunes (CI08) ===
UPDATE ecoles SET departement_code = 'CI0301', commune_code = 'CI030101' WHERE code_mena = 'PRM-021';
UPDATE ecoles SET departement_code = 'CI0302', commune_code = 'CI030201' WHERE code_mena = 'PRM-020';
UPDATE ecoles SET departement_code = 'CI0303', commune_code = 'CI030301' WHERE code_mena = 'SEC-020';

-- === Poro (CI28) in Savanes (CI11) ===
UPDATE ecoles SET departement_code = 'CI2801', commune_code = 'CI280101' WHERE code_mena = 'SEC-001';
UPDATE ecoles SET departement_code = 'CI2802', commune_code = 'CI280201' WHERE code_mena = 'PRV-001';
UPDATE ecoles SET departement_code = 'CI2803', commune_code = 'CI280301' WHERE code_mena = 'PRM-001';
UPDATE ecoles SET departement_code = 'CI2804', commune_code = 'CI280401' WHERE code_mena = 'PRM-002';

-- === Tchologo (CI31) in Savanes (CI11) ===
UPDATE ecoles SET departement_code = 'CI3101', commune_code = 'CI310101' WHERE code_mena = 'PRM-004';
UPDATE ecoles SET departement_code = 'CI3102', commune_code = 'CI310201' WHERE code_mena = 'PRM-003';

-- === Gbeke (CI11) in Valle Du Bandama (CI12) ===
UPDATE ecoles SET departement_code = 'CI1101', commune_code = 'CI110101' WHERE code_mena = 'PRM-050';
UPDATE ecoles SET departement_code = 'CI1102', commune_code = 'CI110201' WHERE code_mena = 'SEC-050';

-- === Hambol (CI17) in Valle Du Bandama (CI12) ===
UPDATE ecoles SET departement_code = 'CI1701', commune_code = 'CI170101' WHERE code_mena = 'PRM-051';

-- === Gontougo (CI14) in Zanzan (CI14) ===
UPDATE ecoles SET departement_code = 'CI1401', commune_code = 'CI140101' WHERE code_mena = 'PRM-120';
UPDATE ecoles SET departement_code = 'CI1402', commune_code = 'CI140201' WHERE code_mena = 'PRM-121';

-- === Bere (CI07) in Woroba (CI13) ===
UPDATE ecoles SET departement_code = 'CI0701', commune_code = 'CI070101' WHERE code_mena = 'PRM-070';
UPDATE ecoles SET departement_code = 'CI0702', commune_code = 'CI070201' WHERE code_mena = 'SEC-070';

-- === Worodougou (CI33) in Woroba (CI13) ===
UPDATE ecoles SET departement_code = 'CI3301', commune_code = 'CI330101' WHERE code_mena = 'PRM-071';

-- === Goh (CI13) in Goh-Djiboua (CI06) ===
UPDATE ecoles SET departement_code = 'CI1301', commune_code = 'CI130101' WHERE code_mena = 'PRM-090';
UPDATE ecoles SET departement_code = 'CI1302', commune_code = 'CI130201' WHERE code_mena = 'PRM-091';

-- === Tonkpi (CI32) in Montagnes (CI09) ===
UPDATE ecoles SET departement_code = 'CI3201', commune_code = 'CI320101' WHERE code_mena = 'PRM-061';
UPDATE ecoles SET departement_code = 'CI3202', commune_code = 'CI320201' WHERE code_mena = 'PRM-060';
UPDATE ecoles SET departement_code = 'CI3203', commune_code = 'CI320301' WHERE code_mena = 'PRM-062';

-- === Haut-Sassandra (CI18) in Sassandra-Marahoue (CI10) ===
UPDATE ecoles SET departement_code = 'CI1801', commune_code = 'CI180101' WHERE code_mena = 'PRM-080';

-- === Marahoue (CI23) in Sassandra-Marahoue (CI10) ===
UPDATE ecoles SET departement_code = 'CI2301', commune_code = 'CI230101' WHERE code_mena = 'PRM-081';

-- === Iffou (CI19) in Lacs (CI07) ===
UPDATE ecoles SET departement_code = 'CI1901', commune_code = 'CI190101' WHERE code_mena = 'PRM-100';

-- === Moronou (CI25) in Lacs (CI07) ===
UPDATE ecoles SET departement_code = 'CI2501', commune_code = 'CI250101' WHERE code_mena = 'PRM-101';

-- === San Pedro (CI29) in Bas-Sassandra (CI01) ===
UPDATE ecoles SET departement_code = 'CI2901', commune_code = 'CI290101' WHERE code_mena = 'PRM-032';
UPDATE ecoles SET departement_code = 'CI2901', commune_code = 'CI290102' WHERE code_mena = 'PRM-030';
UPDATE ecoles SET departement_code = 'CI2902', commune_code = 'CI290201' WHERE code_mena = 'PRM-031';
UPDATE ecoles SET departement_code = 'CI2901', commune_code = 'CI290103' WHERE code_mena = 'SEC-030';

-- === Folon (CI10) in Denguele (CI03) ===
UPDATE ecoles SET departement_code = 'CI1001', commune_code = 'CI100101' WHERE code_mena = 'PRM-110';
