import json
import os

public_dir = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

with open(os.path.join(public_dir, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions_33 = json.load(f)

# Exact region names from the data (no accents)
DISTRICT_REGIONS = {
    "Abidjan": ["District Autonome D'Abidjan", "Grands Ponts"],
    "Yamoussoukro": ["District Autonome De Yamoussoukro", "Belier"],
    "Lacs": ["Goh", "Iffou", "N'Zi"],
    "Lagunes": ["Agneby-Tiassa", "Moronou"],
    "Goh-Djiboua": ["Goh", "Loh-Djiboua", "Me"],
    "Sassandra-Marahoue": ["Haut-Sassandra", "Marahoue"],
    "Bas-Sassandra": ["San Pedro", "Nawa", "Gbokle", "Sud-Comoe"],
    "Montagnes": ["Tonkpi", "Guemon", "Cavally"],
    "Woroba": ["Worodougou", "Bere", "Bafing"],
    "Savanes": ["Poro", "Tchologo", "Bagoue"],
    "Vallee du Bandama": ["Hambol", "Gbeke", "Kabadougou"],
    "Zanzan": ["Gontougo", "Bounkani", "Folon"],
}

# Fix overlaps: Goh appears in Lacs and Goh-Djiboua, Belier in both Yamoussoukro and Lacs
# Use unique assignment
DISTRICT_REGIONS_FIXED = {
    "Abidjan": ["District Autonome D'Abidjan", "Grands Ponts"],
    "Yamoussoukro": ["District Autonome De Yamoussoukro", "Belier"],
    "Lacs": ["Goh", "Iffou", "N'Zi"],
    "Lagunes": ["Agneby-Tiassa", "Moronou"],
    "Goh-Djiboua": ["Loh-Djiboua", "Me"],
    "Sassandra-Marahoue": ["Haut-Sassandra", "Marahoue"],
    "Bas-Sassandra": ["San Pedro", "Nawa", "Gbokle", "Sud-Comoe"],
    "Montagnes": ["Tonkpi", "Guemon", "Cavally"],
    "Woroba": ["Worodougou", "Bere", "Bafing"],
    "Savanes": ["Poro", "Tchologo", "Bagoue"],
    "Vallee du Bandama": ["Hambol", "Gbeke", "Kabadougou"],
    "Zanzan": ["Gontougo", "Bounkani", "Folon"],
}

# Verify
region_names_in_data = {f['properties']['name'] for f in regions_33['features']}
all_assigned = set()
for district, regions in DISTRICT_REGIONS_FIXED.items():
    for r in regions:
        all_assigned.add(r)

unassigned = region_names_in_data - all_assigned
if unassigned:
    print(f"Unassigned regions: {unassigned}")

# Create district features
district_features = []
for district_name, region_names in DISTRICT_REGIONS_FIXED.items():
    matching = [f for f in regions_33['features'] if f['properties']['name'] in region_names]
    
    all_coords = []
    for feat in matching:
        geom = feat['geometry']
        if geom['type'] == 'Polygon':
            all_coords.append(geom['coordinates'])
        elif geom['type'] == 'MultiPolygon':
            all_coords.extend(geom['coordinates'])
    
    total_schools = sum(f['properties'].get('schools', 0) for f in matching)
    total_students = sum(f['properties'].get('students', 0) for f in matching)
    total_girls = sum(f['properties'].get('girls', 0) for f in matching)
    total_boys = sum(f['properties'].get('boys', 0) for f in matching)
    
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

print(f"Created {len(district_features)} districts:")
for d in sorted(district_features, key=lambda x: x['properties']['name']):
    p = d['properties']
    print(f"  {p['name']}: {p['schools']} ecoles")
