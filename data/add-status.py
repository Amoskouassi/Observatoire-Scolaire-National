import json
import os
import random

random.seed(42)  # reproducible

base_dir = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

for name in ['districts', 'regions', 'depts']:
    path = os.path.join(base_dir, name + '.geojson')
    if not os.path.exists(path):
        print(f'SKIP {path} not found')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for feat in data['features']:
        # Assign random status for demo: ~30% collected, ~30% waiting, ~40% pending
        r = random.random()
        if r < 0.30:
            feat['properties']['status'] = 'collected'
        elif r < 0.60:
            feat['properties']['status'] = 'waiting'
        else:
            feat['properties']['status'] = 'pending'
        # Add placeholder stats
        feat['properties']['schools'] = random.randint(50, 800)
        feat['properties']['students'] = random.randint(5000, 100000)
        feat['properties']['girls'] = random.randint(2000, 50000)
        feat['properties']['boys'] = random.randint(2000, 50000)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'))
    count = len(data['features'])
    print(f'{name}.geojson: {count} features, status assigned')

print('Done!')
