import json, os
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'
raw_dir = r'C:\Users\user\Desktop\Observatoire National\data\raw'

# Load regions and districts
with open(os.path.join(base, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)

# Load country boundary from HDX
with open(os.path.join(raw_dir, 'civ_admin0.geojson'), 'r', encoding='utf-8') as f:
    country_raw = json.load(f)
country_geom = shape(country_raw['features'][0]['geometry']).buffer(0)

# Build region geometries
region_geoms = []
for feat in regions['features']:
    geom = shape(feat['geometry']).buffer(0)
    region_geoms.append((feat, geom))

# Union of all regions
all_regions = unary_union([g for _, g in region_geoms])

# Find gaps (country minus all regions)
gaps = country_geom.difference(all_regions)
print('Gaps: ' + gaps.geom_type + ' area=' + str(round(gaps.area, 3)))

# For each gap, find nearest region and merge
if gaps.geom_type == 'MultiPolygon':
    gap_polys = list(gaps.geoms)
elif gaps.geom_type == 'Polygon':
    gap_polys = [gaps]
else:
    gap_polys = []

print('Processing ' + str(len(gap_polys)) + ' gaps...')

for gap in gap_polys:
    c = gap.centroid
    # Find nearest region
    best_dist = float('inf')
    best_idx = -1
    for i, (feat, geom) in enumerate(region_geoms):
        dist = geom.distance(c)
        if dist < best_dist:
            best_dist = dist
            best_idx = i
    if best_idx >= 0:
        feat, geom = region_geoms[best_idx]
        # Merge gap into region
        new_geom = unary_union([geom, gap]).buffer(0)
        region_geoms[best_idx] = (feat, new_geom)

# Save updated regions
for feat, geom in region_geoms:
    feat['geometry'] = mapping(geom)

with open(os.path.join(base, 'regions.geojson'), 'w', encoding='utf-8') as f:
    json.dump(regions, f, separators=(',', ':'))

# Verify no gaps remain
all_new = unary_union([g for _, g in region_geoms])
new_gaps = country_geom.difference(all_new)
print('Remaining gaps: ' + str(new_gaps.area))

# Rebuild districts from updated regions
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

print('Districts: ' + str(len(new_features)))
print('Done!')
