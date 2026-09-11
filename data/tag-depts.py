import json
import os

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

with open(r'C:\Users\user\Desktop\Observatoire National\data\raw\civ_admin2.geojson', 'r', encoding='utf-8') as f:
    raw = json.load(f)

dept_region = {}
for feat in raw['features']:
    p = feat['properties']
    dept_name = p.get('adm2_name', '')
    region_name = p.get('adm1_name', '')
    if dept_name and region_name:
        dept_region[dept_name] = region_name

print('Mapped ' + str(len(dept_region)) + ' depts to regions')

with open(os.path.join(base, 'depts.geojson'), 'r', encoding='utf-8') as f:
    depts = json.load(f)

matched = 0
unmatched = []
for feat in depts['features']:
    dname = feat['properties']['name']
    region = dept_region.get(dname)
    if not region:
        for raw_name, raw_region in dept_region.items():
            if raw_name.lower() == dname.lower():
                region = raw_region
                break
    feat['properties']['region'] = region or ''
    if region:
        matched += 1
    else:
        unmatched.append(dname)

with open(os.path.join(base, 'depts.geojson'), 'w', encoding='utf-8') as f:
    json.dump(depts, f, separators=(',', ':'))

print('Matched: ' + str(matched) + '/' + str(len(depts['features'])))
if unmatched:
    print('Unmatched: ' + str(unmatched))
