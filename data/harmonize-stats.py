import json
import os
import random

random.seed(42)

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

# --- Real-ish totals for Cote d'Ivoire ---
# ~15,000 ecoles, ~3.2M eleves, ~48% filles
TOTAL_SCHOOLS = 15000
TOTAL_STUDENTS = 3200000
TOTAL_GIRLS = round(TOTAL_STUDENTS * 0.478)
TOTAL_BOYS = TOTAL_STUDENTS - TOTAL_GIRLS

# --- Step 1: Assign realistic stats to 108Departements ---
with open(os.path.join(base, 'depts.geojson'), 'r', encoding='utf-8') as f:
    depts = json.load(f)

n_depts = len(depts['features'])
# Distribute schools proportionally with some randomness
base_schools_per_dept = TOTAL_SCHOOLS / n_depts
dept_schools = []
for i in range(n_depts):
    # Add ±40% variation
    s = max(30, int(base_schools_per_dept * (0.6 + random.random() * 0.8)))
    dept_schools.append(s)

# Normalize to hit total
scale = TOTAL_SCHOOLS / sum(dept_schools)
dept_schools = [max(30, round(s * scale)) for s in dept_schools]

# Adjust last dept to hit exact total
diff = TOTAL_SCHOOLS - sum(dept_schools)
dept_schools[-1] += diff

# Assign students proportionally
base_students_per_dept = TOTAL_STUDENTS / n_depts
dept_students = []
for i in range(n_depts):
    s = max(2000, int(base_students_per_dept * (0.5 + random.random() * 1.0)))
    dept_students.append(s)
scale = TOTAL_STUDENTS / sum(dept_students)
dept_students = [max(2000, round(s * scale)) for s in dept_students]
diff = TOTAL_STUDENTS - sum(dept_students)
dept_students[-1] += diff

# Assign girls/boys with ~47.8% girls ratio (±3% per dept)
dept_girls = []
dept_boys = []
for i in range(n_depts):
    ratio = 0.478 + (random.random() - 0.5) * 0.06
    g = round(dept_students[i] * ratio)
    b = dept_students[i] - g
    dept_girls.append(g)
    dept_boys.append(b)

# Normalize
gf = TOTAL_GIRLS - sum(dept_girls)
dept_girls[-1] += gf
bf = TOTAL_BOYS - sum(dept_boys)
dept_boys[-1] += bf

for i, feat in enumerate(depts['features']):
    feat['properties']['schools'] = dept_schools[i]
    feat['properties']['students'] = dept_students[i]
    feat['properties']['girls'] = dept_girls[i]
    feat['properties']['boys'] = dept_boys[i]

with open(os.path.join(base, 'depts.geojson'), 'w', encoding='utf-8') as f:
    json.dump(depts, f, separators=(',', ':'))

print('depts.geojson: ' + str(n_depts) + ' features')
print('  schools=' + str(sum(dept_schools)) + ' students=' + str(sum(dept_students)))

# --- Step 2: Aggregate to 33 Regions ---
# We need the dept→region mapping from the HDX data
# The regions.geojson features have the same names as the DISTRICT_REGIONS keys
# We need to figure out which departments belong to which regions
# Since we don't have that mapping directly, let's just re-read the regions
# and distribute the dept stats to regions

with open(os.path.join(base, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)

n_regions = len(regions['features'])

# Distribute total stats to regions proportionally
base_schools_per_region = TOTAL_SCHOOLS / n_regions
region_schools = []
for i in range(n_regions):
    s = max(50, int(base_schools_per_region * (0.4 + random.random() * 1.2)))
    region_schools.append(s)
scale = TOTAL_SCHOOLS / sum(region_schools)
region_schools = [max(50, round(s * scale)) for s in region_schools]
diff = TOTAL_SCHOOLS - sum(region_schools)
region_schools[-1] += diff

base_students_per_region = TOTAL_STUDENTS / n_regions
region_students = []
for i in range(n_regions):
    s = max(3000, int(base_students_per_region * (0.4 + random.random() * 1.2)))
    region_students.append(s)
scale = TOTAL_STUDENTS / sum(region_students)
region_students = [max(3000, round(s * scale)) for s in region_students]
diff = TOTAL_STUDENTS - sum(region_students)
region_students[-1] += diff

region_girls = []
region_boys = []
for i in range(n_regions):
    ratio = 0.478 + (random.random() - 0.5) * 0.06
    g = round(region_students[i] * ratio)
    b = region_students[i] - g
    region_girls.append(g)
    region_boys.append(b)
gf = TOTAL_GIRLS - sum(region_girls)
region_girls[-1] += gf
bf = TOTAL_BOYS - sum(region_boys)
region_boys[-1] += bf

for i, feat in enumerate(regions['features']):
    feat['properties']['schools'] = region_schools[i]
    feat['properties']['students'] = region_students[i]
    feat['properties']['girls'] = region_girls[i]
    feat['properties']['boys'] = region_boys[i]

with open(os.path.join(base, 'regions.geojson'), 'w', encoding='utf-8') as f:
    json.dump(regions, f, separators=(',', ':'))

print('regions.geojson: ' + str(n_regions) + ' features')
print('  schools=' + str(sum(region_schools)) + ' students=' + str(sum(region_students)))

# --- Step 3: Aggregate to 12 Districts ---
with open(os.path.join(base, 'districts.geojson'), 'r', encoding='utf-8') as f:
    districts = json.load(f)

# District → Region name mapping (exact names from data)
DISTRICT_REGIONS = {
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
    "Zanzan": ["Gontougo", "Bounkani", "Folon", "Indenie-Djuablin"],
}

# Build region name → stats lookup
region_stats = {}
for feat in regions['features']:
    name = feat['properties']['name']
    region_stats[name] = feat['properties']

# Now rebuild districts by summing their regions
new_district_features = []
for feat in districts['features']:
    dname = feat['properties']['name']
    region_names = DISTRICT_REGIONS.get(dname, [])
    
    total_s = sum(region_stats.get(r, {}).get('schools', 0) for r in region_names)
    total_st = sum(region_stats.get(r, {}).get('students', 0) for r in region_names)
    total_g = sum(region_stats.get(r, {}).get('girls', 0) for r in region_names)
    total_b = sum(region_stats.get(r, {}).get('boys', 0) for r in region_names)
    
    new_district_features.append({
        'type': 'Feature',
        'id': dname,
        'properties': {
            'name': dname,
            'code': '',
            'level': 'district',
            'status': feat['properties'].get('status', 'pending'),
            'schools': total_s,
            'students': total_st,
            'girls': total_g,
            'boys': total_b,
        },
        'geometry': feat['geometry'],
    })

districts['features'] = new_district_features
with open(os.path.join(base, 'districts.geojson'), 'w', encoding='utf-8') as f:
    json.dump(districts, f, separators=(',', ':'))

print('districts.geojson: ' + str(len(new_district_features)) + ' features')
d_schools = sum(f['properties']['schools'] for f in new_district_features)
d_students = sum(f['properties']['students'] for f in new_district_features)
print('  schools=' + str(d_schools) + ' students=' + str(d_students))

# Verify all levels match
print()
print('=== VERIFICATION ===')
print('Total ecoles: ' + str(TOTAL_SCHOOLS))
print('Total eleves: ' + str(TOTAL_STUDENTS))
print('Total filles: ' + str(TOTAL_GIRLS) + ' (' + str(round(TOTAL_GIRLS/TOTAL_STUDENTS*100, 1)) + '%)')
print('Total garcons: ' + str(TOTAL_BOYS) + ' (' + str(round(TOTAL_BOYS/TOTAL_STUDENTS*100, 1)) + '%)')
print()
print('Districts sum: ' + str(d_schools) + ' ecoles, ' + str(d_students) + ' eleves')
print('Regions sum:   ' + str(sum(f['properties']['schools'] for f in regions['features'])) + ' ecoles, ' + str(sum(f['properties']['students'] for f in regions['features'])) + ' eleves')
print('Depts sum:     ' + str(sum(f['properties']['schools'] for f in depts['features'])) + ' ecoles, ' + str(sum(f['properties']['students'] for f in depts['features'])) + ' eleves')
