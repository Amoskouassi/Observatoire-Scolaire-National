import json, os
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

with open(os.path.join(base, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)

# Group regions by district
groups = {}
for feat in regions['features']:
    d = feat['properties'].get('district', '')
    if not d:
        continue
    geom = shape(feat['geometry']).buffer(0)
    if d not in groups:
        groups[d] = []
    groups[d].append(geom)

print('Districts:')
for d, geoms in sorted(groups.items()):
    print('  ' + d + ': ' + str(len(geoms)) + ' regions')

new_features = []
for d, geoms in groups.items():
    merged = unary_union(geoms)
    merged = merged.buffer(0).simplify(0.01, preserve_topology=True)
    if not merged.is_valid:
        merged = merged.buffer(0)
    new_features.append({
        'type': 'Feature',
        'properties': {'name': d},
        'geometry': mapping(merged)
    })

new_districts = {'type': 'FeatureCollection', 'features': new_features}

with open(os.path.join(base, 'districts.geojson'), 'r', encoding='utf-8') as f:
    old = json.load(f)
print('\nOld: ' + str(len(json.dumps(old))) + ' bytes -> New: ' + str(len(json.dumps(new_districts))) + ' bytes')

with open(os.path.join(base, 'districts.geojson'), 'w', encoding='utf-8') as f:
    json.dump(new_districts, f, separators=(',', ':'))
print('Saved!')
