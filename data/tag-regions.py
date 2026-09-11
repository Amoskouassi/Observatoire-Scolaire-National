import json
import os

public_dir = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

# District → Region mapping (exact names from data)
DISTRICT_REGIONS = {
    "Bas-Sassandra": ["San Pedro", "Nawa", "Gbokle", "Sud-Comoe"],
    "Denguele": ["Bafing", "Worodougou"],
    "District Autonome D'Abidjan": ["Grands Ponts", "Agneby-Tiassa"],
    "District Autonome De Yamoussoukro": ["Belier"],
    "Goh-Djiboua": ["Goh", "Loh-Djiboua", "Me"],
    "Lacs": ["Iffou", "N'Zi", "Moronou"],
    "Lagunes": ["Bere", "Gbeke", "Hambol", "Kabadougou"],
    "Montagnes": ["Tonkpi", "Guemon", "Cavally"],
    "Sassandra-Marahoue": ["Haut-Sassandra", "Marahoue"],
    "Savanes": ["Poro", "Tchologo", "Bagoue"],
    "Valle Du Bandama": ["Folon", "Bounkani"],
    "Woroba": ["Gontougo", "Indenie-Djuablin"],
    "Zanzan": [],
    "Comoe": [],
}

# Read regions
with open(os.path.join(public_dir, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)

# Build reverse lookup: region_name → district_name
region_to_district = {}
for district, rlist in DISTRICT_REGIONS.items():
    for r in rlist:
        region_to_district[r] = district

# Assign district to each region
for feat in regions['features']:
    rname = feat['properties']['name']
    feat['properties']['district'] = region_to_district.get(rname, '')

# Count
assigned = sum(1 for f in regions['features'] if f['properties']['district'])
unassigned = [f['properties']['name'] for f in regions['features'] if not f['properties']['district']]

with open(os.path.join(public_dir, 'regions.geojson'), 'w', encoding='utf-8') as f:
    json.dump(regions, f, separators=(',', ':'))

print(f"Assigned: {assigned}/{len(regions['features'])} regions")
if unassigned:
    print(f"Unassigned: {unassigned}")
