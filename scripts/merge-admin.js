#!/usr/bin/env node

/**
 * merge-admin.js
 * Fusionne les 4 GeoJSON HDX (adm1→adm4) en un seul fichier
 * avec les properties normalisées et le champ collect_status
 *
 * Usage: node scripts/merge-admin.js
 * Entrée: data/raw/CIV_adm{1,2,3,4}.geojson
 * Sortie: data/processed/admin_all_levels.geojson
 */

const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '..', 'data', 'raw');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'processed');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'admin_all_levels.geojson');

const LEVEL_MAP = {
  1: { level: 'district', codeField: 'ADM1_PCODE', nameField: 'ADM1_EN', parentField: null },
  2: { level: 'region', codeField: 'ADM2_PCODE', nameField: 'ADM2_EN', parentField: 'ADM1_PCODE' },
  3: { level: 'dept', codeField: 'ADM3_PCODE', nameField: 'ADM3_EN', parentField: 'ADM2_PCODE' },
  4: { level: 'commune', codeField: 'ADM4_PCODE', nameField: 'ADM4_EN', parentField: 'ADM3_PCODE' },
};

function loadGeoJSON(filename) {
  const filepath = path.join(INPUT_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Fichier non trouvé: ${filepath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function normalizeProperties(rawProps, levelConfig) {
  return {
    level: levelConfig.level,
    code: rawProps[levelConfig.codeField] || '',
    name: rawProps[levelConfig.nameField] || 'Inconnu',
    parent_code: levelConfig.parentField ? rawProps[levelConfig.parentField] : null,
    collect_status: 'pending', // Par défaut
    ecoles_collectees: 0,
    ecoles_total: 0,
  };
}

function mergeAllLevels() {
  console.log('🔄 Fusion des niveaux admin...\n');

  const allFeatures = [];

  for (const [levelNum, config] of Object.entries(LEVEL_MAP)) {
    const filename = `CIV_adm${levelNum}.geojson`;
    console.log(`📂 Chargement: ${filename}`);

    const geojson = loadGeoJSON(filename);
    console.log(`   ${geojson.features.length} features trouvées`);

    for (const feature of geojson.features) {
      const normalizedFeature = {
        type: 'Feature',
        id: `${config.level}_${feature.properties[config.codeField]}`,
        properties: normalizeProperties(feature.properties, config),
        geometry: feature.geometry,
      };
      allFeatures.push(normalizedFeature);
    }
  }

  // Créer le dossier de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Écrire le résultat
  const mergedGeoJSON = {
    type: 'FeatureCollection',
    metadata: {
      source: 'HDX/OCHA Côte d\'Ivoire',
      merged_at: new Date().toISOString(),
      levels: Object.values(LEVEL_MAP).map((c) => c.level),
      total_features: allFeatures.length,
    },
    features: allFeatures,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mergedGeoJSON, null, 2));

  console.log(`\n✅ Fusion terminée: ${allFeatures.length} features au total`);
  console.log(`📄 Sortie: ${OUTPUT_FILE}`);

  // Statistiques par niveau
  const byLevel = {};
  for (const f of allFeatures) {
    byLevel[f.properties.level] = (byLevel[f.properties.level] || 0) + 1;
  }
  console.log('\n📊 Répartition:');
  for (const [level, count] of Object.entries(byLevel)) {
    console.log(`   ${level}: ${count}`);
  }
}

mergeAllLevels();
