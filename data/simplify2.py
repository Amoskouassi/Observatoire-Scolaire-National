import json
import os

def simplify_coords(coords, precision=2):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], precision), round(coords[1], precision)]
    return [simplify_coords(c, precision) for c in coords]

base_dir = r'C:\Users\user\Desktop\Observatoire National\data\simplified'

for name in ['districts', 'regions', 'depts']:
    path = os.path.join(base_dir, name + '.geojson')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for feat in data['features']:
        if feat['geometry']:
            feat['geometry']['coordinates'] = simplify_coords(feat['geometry']['coordinates'], 2)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'))
    size_kb = os.path.getsize(path) / 1024
    count = len(data['features'])
    print(name + '.geojson: ' + str(round(size_kb)) + ' KB (' + str(count) + ' features)')
