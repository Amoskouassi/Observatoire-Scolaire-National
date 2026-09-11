import json, os

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

with open(os.path.join(base, 'districts.geojson'), 'r', encoding='utf-8') as f:
    districts = json.load(f)
with open(os.path.join(base, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)
with open(os.path.join(base, 'depts.geojson'), 'r', encoding='utf-8') as f:
    depts = json.load(f)

DISTRICT_CODES = {
    'Bas-Sassandra': 'CI01', 'Comoe': 'CI02', 'Denguele': 'CI03',
    "District Autonome D'Abidjan": 'CI04',
    'District Autonome De Yamoussoukro': 'CI05',
    'Goh-Djiboua': 'CI06', 'Lacs': 'CI07', 'Lagunes': 'CI08',
    'Montagnes': 'CI09', 'Sassandra-Marahoue': 'CI10', 'Savanes': 'CI11',
    'Valle Du Bandama': 'CI12', 'Woroba': 'CI13', 'Zanzan': 'CI14',
}

for feat in districts['features']:
    name = feat['properties']['name']
    feat['properties']['code'] = DISTRICT_CODES.get(name, '')
    feat['properties']['level'] = 'district'
    if not feat['properties'].get('status'):
        feat['properties']['status'] = 'waiting'

for feat in regions['features']:
    if not feat['properties'].get('code'):
        feat['properties']['code'] = ''

for feat in depts['features']:
    if not feat['properties'].get('district'):
        feat['properties']['district'] = ''

d_schools = sum(f['properties'].get('schools', 0) for f in districts['features'])
r_schools = sum(f['properties'].get('schools', 0) for f in regions['features'])
dp_schools = sum(f['properties'].get('schools', 0) for f in depts['features'])
print('Schools: d=' + str(d_schools) + ' r=' + str(r_schools) + ' dp=' + str(dp_schools))

d_students = sum(f['properties'].get('students', 0) for f in districts['features'])
r_students = sum(f['properties'].get('students', 0) for f in regions['features'])
dp_students = sum(f['properties'].get('students', 0) for f in depts['features'])
print('Students: d=' + str(d_students) + ' r=' + str(r_students) + ' dp=' + str(dp_students))

for fname, data in [('districts.geojson', districts), ('regions.geojson', regions), ('depts.geojson', depts)]:
    with open(os.path.join(base, fname), 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'))

print('Done!')
