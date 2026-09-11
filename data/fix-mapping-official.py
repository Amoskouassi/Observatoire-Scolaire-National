import json
import os

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

# OFFICIAL CI district→region structure (source: METR-PNTI 2011)
DISTRICT_REGIONS = {
    "Bas-Sassandra": ["San Pedro", "Nawa", "Gbokle", "Sud-Comoe"],
    "Comoe": ["Indenie-Djuablin"],
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
    "Zanzan": ["Gontougo", "Bounkani", "Folon"],
}

# Load regions
with open(os.path.join(base, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)

# Build lookup
region_to_district = {}
for district, rlist in DISTRICT_REGIONS.items():
    for r in rlist:
        region_to_district[r] = district

# Apply
for feat in regions['features']:
    rname = feat['properties']['name']
    feat['properties']['district'] = region_to_district.get(rname, '')

# Also assign autonomous districts
for feat in regions['features']:
    rname = feat['properties']['name']
    if rname in ("District Autonome D'Abidjan", "District Autonome De Yamoussoukro"):
        feat['properties']['district'] = rname

# Save
with open(os.path.join(base, 'regions.geojson'), 'w', encoding='utf-8') as f:
    json.dump(regions, f, separators=(',', ':'))

print("Final assignments:")
for feat in sorted(regions['features'], key=lambda x: x['properties'].get('district','')):
    p = feat['properties']
    print("  " + p['name'] + " -> " + str(p.get('district','')))

# Update depts
with open(os.path.join(base, 'depts.geojson'), 'r', encoding='utf-8') as f:
    depts = json.load(f)

# Load raw HDX for dept→region
with open(r'C:\Users\user\Desktop\Observatoire National\data\raw\civ_admin2.geojson', 'r', encoding='utf-8') as f:
    raw = json.load(f)

dept_region_raw = {}
for feat in raw['features']:
    p = feat['properties']
    dept_name = p.get('adm2_name', '')
    region_name = p.get('adm1_name', '')
    if dept_name and region_name:
        dept_region_raw[dept_name] = region_name

region_district = {}
for feat in regions['features']:
    region_district[feat['properties']['name']] = feat['properties'].get('district', '')

for feat in depts['features']:
    dname = feat['properties']['name']
    region = dept_region_raw.get(dname)
    if not region:
        for rn, rr in dept_region_raw.items():
            if rn.lower() == dname.lower():
                region = rr
                break
    feat['properties']['region'] = region or ''
    feat['properties']['district'] = region_district.get(region, '') if region else ''

with open(os.path.join(base, 'depts.geojson'), 'w', encoding='utf-8') as f:
    json.dump(depts, f, separators=(',', ':'))

print("\nDone!")
