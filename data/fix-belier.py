import json, os
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

with open(os.path.join(base, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)

# Move Belier to Lacs
for feat in regions['features']:
    if feat['properties']['name'] == 'Belier':
        feat['properties']['district'] = 'Lacs'
        print('Belier -> Lacs')

with open(os.path.join(base, 'regions.geojson'), 'w', encoding='utf-8') as f:
    json.dump(regions, f, separators=(',', ':'))

# Rebuild districts
groups = {}
for feat in regions['features']:
    d = feat['properties'].get('district', '')
    if not d:
        continue
    geom = shape(feat['geometry']).buffer(0)
    if d not in groups:
        groups[d] = []
    groups[d].append(geom)

new_features = []
for d, geoms in groups.items():
    merged = unary_union(geoms).buffer(0)
    merged = merged.simplify(0.01, preserve_topology=True)
    if not merged.is_valid:
        merged = merged.buffer(0)
    new_features.append({
        'type': 'Feature',
        'properties': {'name': d},
        'geometry': mapping(merged)
    })

new_districts = {'type': 'FeatureCollection', 'features': new_features}
with open(os.path.join(base, 'districts.geojson'), 'w', encoding='utf-8') as f:
    json.dump(new_districts, f, separators=(',', ':'))

print('\nLacs regions:')
for feat in regions['features']:
    if feat['properties'].get('district') == 'Lacs':
        c = shape(feat['geometry']).centroid
        print('  ' + feat['properties']['name'] + ' centroid=' + str(round(c.x,2)) + ',' + str(round(c.y,2)))

print('\nDistrict Autonome De Yamoussoukro regions:')
for feat in regions['features']:
    if feat['properties'].get('district') == 'District Autonome De Yamoussoukro':
        print('  ' + feat['properties']['name'])

print('\nDone!')
