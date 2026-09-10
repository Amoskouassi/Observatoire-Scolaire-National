import json
import os

public_dir = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

# Read the 33 Régions
with open(os.path.join(public_dir, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions_33 = json.load(f)

# Official 12 Districts → 33 Régions mapping (unique, no overlaps)
# Source: https://www.stat.ci/administration/admin-702/
DISTRICT_REGIONS = {
    "Abidjan": ["Grands Ponts"],
    "Yamoussoukro": ["Bélier"],
    "Lacs": ["Lacs", "N'Zi", "Iffou"],
    "Lagunes": ["Agneby-Tiassa", "Moronou"],
    "Gôh-Djiboua": ["Gôh", "Lôh-Djiboua", "Mé"],
    "Sassandra-Marahoué": ["Haut-Sassandra", "Marahoué"],
    "Bas-Sassandra": ["San-Pédro", "Nawa", "Gbôklé", "Sud-Comoé"],
    "Montagnes": ["Tonkpi", "Guémon", "Cavally"],
    "Woroba": ["Worodougou", "Béré", "Bafing"],
    "Savanes": ["Poro", "Tchologo", "Bagoué"],
    "Vallée du Bandama": ["Hambol", "Gbêkê", "Kabadougou"],
    "Zanzan": ["Gontougo", "Bounkani", "Folon"],
    "Comoé": ["Indénié-Djuablin"],
}

# Verify all 33 regions are assigned exactly once
all_regions = set()
for district, regions in DISTRICT_REGIONS.items():
    for r in regions:
        if r in all_regions:
            print(f"WARNING: {r} appears in multiple districts!")
        all_regions.add(r)

# Check for unassigned regions
region_names_in_data = {f['properties']['name'] for f in regions_33['features']}
unassigned = region_names_in_data - all_regions
if unassigned:
    print(f"WARNING: Unassigned regions: {unassigned}")

assigned = all_regions - region_names_in_data
if assigned:
    print(f"WARNING: Assigned but not in data: {assigned}")

print(f"Total regions assigned: {len(all_regions)}")
print(f"Total regions in data: {len(region_names_in_data)}")

# Create district features by merging region geometries
district_features = []
for district_name, region_names in DISTRICT_REGIONS.items():
    matching_regions = []
    for feat in regions_33['features']:
        if feat['properties']['name'] in region_names:
            matching_regions.append(feat)

    if not matching_regions:
        print(f"WARNING: No matching regions for {district_name}")
        continue

    # Merge all polygons into MultiPolygon
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

districts_fc = {'type': 'FeatureCollection', 'features': district_features}
with open(os.path.join(public_dir, 'districts.geojson'), 'w', encoding='utf-8') as f:
    json.dump(districts_fc, f, separators=(',', ':'))

print(f"\nCreated districts.geojson: {len(district_features)} districts")
for d in sorted(district_features, key=lambda x: x['properties']['name']):
    print(f"  {d['properties']['name']}: {d['properties']['schools']} écoles, {d['properties']['students']} élèves")
