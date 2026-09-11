import json, os
from shapely.geometry import shape

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

with open(os.path.join(base, 'sous_prefectures.geojson'), 'r', encoding='utf-8') as f:
    sp = json.load(f)
with open(os.path.join(base, 'depts.geojson'), 'r', encoding='utf-8') as f:
    depts = json.load(f)

# Build dept shapes
dept_shapes = []
for feat in depts['features']:
    geom = shape(feat['geometry']).buffer(0)
    dept_shapes.append({
        'name': feat['properties']['name'],
        'region': feat['properties'].get('region', ''),
        'district': feat['properties'].get('district', ''),
        'shape': geom,
    })

# Assign each SP to a dept by centroid
assigned = 0
for feat in sp['features']:
    geom = shape(feat['geometry']).buffer(0)
    c = geom.centroid
    best = None
    best_dist = float('inf')
    for d in dept_shapes:
        dist = d['shape'].distance(c)
        if dist < best_dist:
            best_dist = dist
            best = d
    if best:
        feat['properties']['departement'] = best['name']
        feat['properties']['region'] = best['region']
        feat['properties']['district'] = best['district']
        assigned += 1

print('Assigned: ' + str(assigned) + '/' + str(len(sp['features'])))

# Verify
unassigned = sum(1 for f in sp['features'] if not f['properties'].get('departement'))
print('Unassigned: ' + str(unassigned))

# Check totals
sp_schools = sum(f['properties'].get('schools', 0) for f in sp['features'])
dp_schools = sum(f['properties'].get('schools', 0) for f in depts['features'])
print('SP schools: ' + str(sp_schools) + ' Depts schools: ' + str(dp_schools))

with open(os.path.join(base, 'sous_prefectures.geojson'), 'w', encoding='utf-8') as f:
    json.dump(sp, f, separators=(',', ':'))

print('Done!')
