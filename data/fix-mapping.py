import json
import os

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

# CORRECT district→region mapping based on official CI administrative divisions
DISTRICT_REGIONS = {
    "Bas-Sassandra": ["San Pedro", "Nawa", "Gbokle", "Sud-Comoe"],
    "Denguele": ["Bafing", "Worodougou"],
    "District Autonome D'Abidjan": ["Grands Ponts", "Agneby-Tiassa"],
    "District Autonome De Yamoussoukro": ["Belier"],
    "Goh-Djiboua": ["Goh", "Loh-Djiboua", "Me"],
    "Lacs": ["Iffou", "N'Zi", "Moronou"],
    "Lagunes": [],
    "Montagnes": ["Tonkpi", "Guemon", "Cavally"],
    "Sassandra-Marahoue": ["Haut-Sassandra", "Marahoue"],
    "Savanes": ["Poro", "Tchologo", "Bagoue"],
    "Valle Du Bandama": ["Hambol", "Gbeke", "Kabadougou"],
    "Woroba": ["Bere"],
    "Zanzan": ["Gontougo", "Bounkani", "Folon", "Indenie-Djuablin"],
    "Comoe": [],
}

# Read regions
with open(os.path.join(base, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)

# Build reverse lookup
region_to_district = {}
for district, rlist in DISTRICT_REGIONS.items():
    for r in rlist:
        region_to_district[r] = district

# Assign district to each region
for feat in regions['features']:
    rname = feat['properties']['name']
    feat['properties']['district'] = region_to_district.get(rname, '')

# Also assign to autonomous districts
for feat in regions['features']:
    rname = feat['properties']['name']
    if rname == "District Autonome D'Abidjan":
        feat['properties']['district'] = rname
    elif rname == "District Autonome De Yamoussoukro":
        feat['properties']['district'] = rname

with open(os.path.join(base, 'regions.geojson'), 'w', encoding='utf-8') as f:
    json.dump(regions, f, separators=(',', ':'))

print("Updated district assignments:")
for feat in sorted(regions['features'], key=lambda x: x['properties'].get('district','')):
    p = feat['properties']
    print("  " + p['name'] + " -> " + str(p.get('district','')))

# Verify districts match
districts_path = os.path.join(base, 'districts.geojson')
with open(districts_path, 'r', encoding='utf-8') as f:
    districts = json.load(f)

print("\nDistrict features in GeoJSON:")
for f in districts['features']:
    print("  " + f['properties']['name'])
