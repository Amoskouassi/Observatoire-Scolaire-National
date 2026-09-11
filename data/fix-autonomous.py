import json, os
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

with open(os.path.join(base, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)

for feat in regions['features']:
    n = feat['properties']['name']
    if 'Abidjan' in n:
        feat['properties']['district'] = n
        print(n + ' -> self')
    elif 'Yamoussoukro' in n:
        feat['properties']['district'] = n
        print(n + ' -> self')

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

print()
print('=== ALL MAPPINGS ===')
for feat in sorted(regions['features'], key=lambda x: x['properties'].get('district','')):
    print('  ' + feat['properties']['name'] + ' -> ' + feat['properties'].get('district',''))

print()
print('Districts:')
for f in sorted(new_features, key=lambda x: x['properties']['name']):
    print('  ' + f['properties']['name'])
