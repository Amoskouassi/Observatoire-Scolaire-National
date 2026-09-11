import json, os
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

# Fix: Sud-Comoe belongs to Comoe, not Bas-Sassandra
with open(os.path.join(base, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)

for feat in regions['features']:
    if feat['properties']['name'] == 'Sud-Comoe':
        feat['properties']['district'] = 'Comoe'
        print('Sud-Comoe -> Comoe')

with open(os.path.join(base, 'regions.geojson'), 'w', encoding='utf-8') as f:
    json.dump(regions, f, separators=(',', ':'))

# Rebuild districts from regions
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

# Verify
print('\nBas-Sassandra regions:')
for feat in regions['features']:
    if feat['properties'].get('district') == 'Bas-Sassandra':
        c = shape(feat['geometry']).centroid
        print('  ' + feat['properties']['name'] + ' centroid=' + str(round(c.x,2)) + ',' + str(round(c.y,2)))

print('\nComoe regions:')
for feat in regions['features']:
    if feat['properties'].get('district') == 'Comoe':
        c = shape(feat['geometry']).centroid
        print('  ' + feat['properties']['name'] + ' centroid=' + str(round(c.x,2)) + ',' + str(round(c.y,2)))

# Check no overlap
for f1 in new_features:
    g1 = shape(f1['geometry'])
    for f2 in new_features:
        if f1['properties']['name'] >= f2['properties']['name']:
            continue
        g2 = shape(f2['geometry'])
        inter = g1.intersection(g2)
        if inter.area > 0.001:
            print('\nOVERLAP: ' + f1['properties']['name'] + ' <-> ' + f2['properties']['name'] + ': ' + str(round(inter.area, 4)))

print('\nDone!')
