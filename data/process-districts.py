import json
import os

# Read the World Bank districts file (cleaned)
with open(r'C:\Users\user\Desktop\Observatoire National\data\raw\civ_districts_wb.geojson', 'r', encoding='utf-8') as f:
    content = f.read()

last_brace = content.rfind('}')
clean = content[:last_brace+1]
wb_data = json.loads(clean)

print(f"World Bank: {len(wb_data['features'])} districts")

# Simplify and rewrite
def simplify_coords(coords, precision=3):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], precision), round(coords[1], precision)]
    return [simplify_coords(c, precision) for c in coords]

district_features = []
for feat in wb_data['features']:
    p = feat['properties']
    g = feat['geometry']
    
    name = p.get('admin1Name', 'Unknown')
    code = p.get('admin1Pcod', '')
    
    # Simplify geometry
    if g and g.get('coordinates'):
        simp_geom = {
            'type': g['type'],
            'coordinates': simplify_coords(g['coordinates'], 3)
        }
    else:
        simp_geom = g
    
    district_features.append({
        'type': 'Feature',
        'id': name,
        'properties': {
            'name': name,
            'code': code,
            'level': 'district',
            'status': 'pending',
            'schools': 0,
            'students': 0,
            'girls': 0,
            'boys': 0,
        },
        'geometry': simp_geom,
    })

# Print names
print("\nDistricts:")
for f in district_features:
    print(f"  {f['properties']['name']} ({f['properties']['code']})")

# Write simplified districts
out = {'type': 'FeatureCollection', 'features': district_features}
out_path = r'C:\Users\user\Desktop\Observatoire National\frontend\public\districts.geojson'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(out, f, separators=(',', ':'))

size_kb = os.path.getsize(out_path) / 1024
print(f"\nWrote {len(district_features)} districts to districts.geojson ({round(size_kb)} KB)")
