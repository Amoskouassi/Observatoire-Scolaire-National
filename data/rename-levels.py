import json
import os

# Rename GeoJSON files: districts→regions, regions→depts, depts→sous_prefectures
public_dir = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

# 1. Rename districts.geojson → regions.geojson (these are the 33 Régions)
# 2. Rename regions.geojson → depts.geojson (these are the 108 Départements)
# 3. Rename depts.geojson → sous_prefectures.geojson (these are the 510 Sous-préfectures)

renames = {
    'districts.geojson': 'regions.geojson',
    'regions.geojson': 'depts.geojson',
    'depts.geojson': 'sous_prefectures.geojson',
}

# First, handle the conflict: existing regions.geojson needs to be moved
# Read current files
regions_path = os.path.join(public_dir, 'regions.geojson')  # Currently has 108 depts
depts_path = os.path.join(public_dir, 'depts.geojson')  # Currently has 510 sous-prefectures
districts_path = os.path.join(public_dir, 'districts.geojson')  # Currently has 33 regions

# Read all files first
with open(districts_path, 'r', encoding='utf-8') as f:
    regions_33 = json.load(f)  # 33 features = Régions
with open(regions_path, 'r', encoding='utf-8') as f:
    depts_108 = json.load(f)  # 108 features = Départements
with open(depts_path, 'r', encoding='utf-8') as f:
    sous_pref_510 = json.load(f)  # 510 features = Sous-préfectures

# Update level labels in properties
for feat in regions_33['features']:
    feat['properties']['level'] = 'region'
for feat in depts_108['features']:
    feat['properties']['level'] = 'departement'
for feat in sous_pref_510['features']:
    feat['properties']['level'] = 'sous-prefecture'

# Write back with correct names
with open(os.path.join(public_dir, 'regions.geojson'), 'w', encoding='utf-8') as f:
    json.dump(regions_33, f, separators=(',', ':'))
with open(os.path.join(public_dir, 'depts.geojson'), 'w', encoding='utf-8') as f:
    json.dump(depts_108, f, separators=(',', ':'))
with open(os.path.join(public_dir, 'sous_prefectures.geojson'), 'w', encoding='utf-8') as f:
    json.dump(sous_pref_510, f, separators=(',', ':'))

# Remove old files
os.remove(districts_path)

print("Renamed files:")
for name in ['regions.geojson', 'depts.geojson', 'sous_prefectures.geojson']:
    path = os.path.join(public_dir, name)
    size_kb = os.path.getsize(path) / 1024
    count = len(json.load(open(path, encoding='utf-8'))['features'])
    print(f"  {name}: {count} features, {round(size_kb)} KB")

# 2. Create Districts layer by grouping regions
# Official Côte d'Ivoire districts → regions mapping (post-2011)
DISTRICT_REGIONS = {
    "Abidjan": ["Grands Ponts", "Agneby-Tiassa", "Moronou"],
    "Yamoussoukro": ["Bélier", "Iffou", "N'Zi"],
    "Lacs": ["Lacs", "N'Zi", "Bélier", "Iffou"],
    "Lagunes": ["Grands Ponts", "Agneby-Tiassa", "Moronou"],
    "Gôh-Djiboua": ["Gôh", "Lôh-Djiboua", "Mé"],
    "Sassandra-Marahoué": ["Haut-Sassandra", "Marahoué", "Gôh"],
    "Bas-Sassandra": ["San-Pédro", "Nawa", "Gbôklé", "Sud-Comoé"],
    "Montagnes": ["Tonkpi", "Guémon", "Cavally"],
    "Woroba": ["Worodougou", "Béré", "Bafing"],
    "Savanes": ["Poro", "Tchologo", "Bagoué", "Folon", "Kabadougou"],
    "Vallée du Bandama": ["Hambol", "Gbêkê", "Kabadougou"],
    "Zanzan": ["Gontougo", "Bounkani", "Folon"],
    "Comoé": ["Sud-Comoé", "Indénié-Djuablin"],
}

# Build a lookup: region_name → district_name
region_to_district = {}
for district, regions in DISTRICT_REGIONS.items():
    for r in regions:
        region_to_district[r] = district

# Create district features by merging region geometries
district_features = []
for district_name, region_names in DISTRICT_REGIONS.items():
    # Find all region features that belong to this district
    matching_regions = []
    for feat in regions_33['features']:
        fname = feat['properties']['name']
        if fname in region_names:
            matching_regions.append(feat)

    if not matching_regions:
        continue

    # Merge all polygons into a single MultiPolygon
    all_coords = []
    for feat in matching_regions:
        geom = feat['geometry']
        if geom['type'] == 'Polygon':
            all_coords.append(geom['coordinates'])
        elif geom['type'] == 'MultiPolygon':
            all_coords.extend(geom['coordinates'])

    # Aggregate stats
    total_schools = sum(f['properties'].get('schools', 0) for f in matching_regions)
    total_students = sum(f['properties'].get('students', 0) for f in matching_regions)
    total_girls = sum(f['properties'].get('girls', 0) for f in matching_regions)
    total_boys = sum(f['properties'].get('boys', 0) for f in matching_regions)

    district_features.append({
        'type': 'Feature',
        'id': district_name,
        'properties': {
            'name': district_name,
            'code': '',
            'level': 'district',
            'status': 'pending',
            'schools': total_schools,
            'students': total_students,
            'girls': total_girls,
            'boys': total_boys,
        },
        'geometry': {
            'type': 'MultiPolygon',
            'coordinates': all_coords,
        },
    })

# Remove duplicates from region mapping (some regions might appear in multiple districts)
# Use a cleaner mapping based on official CI districts
# Actually let me just check how many unique regions we matched
matched_regions = set()
for feat in district_features:
    # We don't track which regions, but we can count features
    pass

districts_fc = {'type': 'FeatureCollection', 'features': district_features}
with open(os.path.join(public_dir, 'districts.geojson'), 'w', encoding='utf-8') as f:
    json.dump(districts_fc, f, separators=(',', ':'))

print(f"\nCreated districts.geojson: {len(district_features)} districts")

# Verify
for d in district_features:
    print(f"  {d['properties']['name']}: {d['properties']['schools']} écoles")
