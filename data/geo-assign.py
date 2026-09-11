import json
import os
from shapely.geometry import shape, mapping

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

# Load WB districts
with open(os.path.join(base, 'districts.geojson'), 'r', encoding='utf-8') as f:
    districts = json.load(f)

# Load HDX regions
with open(os.path.join(base, 'regions.geojson'), 'r', encoding='utf-8') as f:
    regions = json.load(f)

# Convert district geometries to shapely
district_shapes = []
for feat in districts['features']:
    geom = shape(feat['geometry'])
    district_shapes.append({
        'name': feat['properties']['name'],
        'shape': geom,
    })

print("Districts:")
for d in district_shapes:
    print("  " + d['name'] + " (" + str(round(d['shape'].area, 2)) + " sq deg)")

# For each region, find which district contains its centroid
# If centroid is not in any district, try the largest overlapping district
unassigned = []
for rfeat in regions['features']:
    rgeom = shape(rfeat['geometry'])
    centroid = rgeom.centroid
    
    # Find which district contains the centroid
    found = None
    for d in district_shapes:
        if d['shape'].contains(centroid):
            found = d['name']
            break
    
    # If no district contains centroid, find the one with largest overlap
    if not found:
        max_overlap = 0
        for d in district_shapes:
            try:
                overlap = rgeom.intersection(d['shape']).area
                if overlap > max_overlap:
                    max_overlap = overlap
                    found = d['name']
            except:
                pass
    
    if not found:
        found = ''
        unassigned.append(rfeat['properties']['name'])
    
    rfeat['properties']['district'] = found

# Print results
print("\nRegion -> District assignments:")
for feat in sorted(regions['features'], key=lambda x: x['properties'].get('district','')):
    p = feat['properties']
    print("  " + p['name'] + " -> " + str(p.get('district','')))

if unassigned:
    print("\nUnassigned: " + str(unassigned))

# Save
with open(os.path.join(base, 'regions.geojson'), 'w', encoding='utf-8') as f:
    json.dump(regions, f, separators=(',', ':'))

# Also update depts to use the same district mapping
with open(os.path.join(base, 'depts.geojson'), 'r', encoding='utf-8') as f:
    depts = json.load(f)

# Load raw HDX to get dept->region mapping
with open(r'C:\Users\user\Desktop\Observatoire National\data\raw\civ_admin2.geojson', 'r', encoding='utf-8') as f:
    raw = json.load(f)

dept_region_raw = {}
for feat in raw['features']:
    p = feat['properties']
    dept_name = p.get('adm2_name', '')
    region_name = p.get('adm1_name', '')
    if dept_name and region_name:
        dept_region_raw[dept_name] = region_name

# Build region->district lookup
region_district = {}
for feat in regions['features']:
    region_district[feat['properties']['name']] = feat['properties'].get('district', '')

# Update depts
for feat in depts['features']:
    dname = feat['properties']['name']
    # Find region for this dept
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
