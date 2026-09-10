#!/usr/bin/env node

/**
 * seed-communes.js
 * Insère les 31 régions de Côte d'Ivoire dans la table admin_zones
 * Utilise les données de merge-admin.js
 *
 * Usage: node scripts/seed-communes.js
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'data', 'processed', 'admin_all_levels.geojson');

// Mapping des collect_status (à personnaliser selon l'avancement du terrain)
const STATUS_OVERRIDES = {
  // Districts (adm1)
  'DI1': 'collected',   // Abidjan
  'DI2': 'collected',   // Yamoussoukro
  'DI3': 'waiting',     // Bouaké
  'DI4': 'waiting',     // Korhogo
  // Ajouter les autres au fur et à mesure
};

function seedCommunes() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('❌ Fichier non trouvé. Lancez merge-admin.js d\'abord.');
    process.exit(1);
  }

  const geojson = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

  console.log(`📊 ${geojson.features.length} zones administratives trouvées\n`);

  // Générer le SQL d'insertion
  const sqlLines = [];

  for (const feature of geojson.features) {
    const p = feature.properties;
    const status = STATUS_OVERRIDES[p.code] || p.collect_status;

    sqlLines.push(
      `INSERT INTO admin_zones (level, code, name, parent_code, collect_status, ecoles_collectees, ecoles_total) VALUES ('${p.level}', '${p.code}', '${p.name.replace(/'/g, "''")}', ${p.parent_code ? `'${p.parent_code}'` : 'NULL'}, '${status}', ${p.ecoles_collectees}, ${p.ecoles_total}) ON CONFLICT (code) DO NOTHING;`
    );
  }

  const sqlContent = `-- Seed généré automatiquement\n-- Date: ${new Date().toISOString()}\n\n${sqlLines.join('\n')}\n`;

  const outputFile = path.join(__dirname, '..', 'sql', '02_seed_admin_zones.sql');
  fs.writeFileSync(outputFile, sqlContent);

  console.log(`✅ ${sqlLines.length} lignes SQL générées`);
  console.log(`📄 Sortie: ${outputFile}`);
  console.log('\n📌 Pour appliquer: exécutez ce fichier SQL dans Supabase SQL Editor');
}

seedCommunes();
