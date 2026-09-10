import json
import os
import random

random.seed(42)

base = r'C:\Users\user\Desktop\Observatoire National\frontend\public'

TOTAL_SCHOOLS = 15000
TOTAL_STUDENTS = 3200000
TOTAL_GIRLS = round(TOTAL_STUDENTS * 0.478)
TOTAL_BOYS = TOTAL_STUDENTS - TOTAL_GIRLS

with open(os.path.join(base, 'districts.geojson'), 'r', encoding='utf-8') as f:
    districts = json.load(f)

n = len(districts['features'])

# Distribute schools with variation
base_s = TOTAL_SCHOOLS / n
schools = [max(200, int(base_s * (0.3 + random.random() * 1.4))) for _ in range(n)]
scale = TOTAL_SCHOOLS / sum(schools)
schools = [max(200, round(s * scale)) for s in schools]
schools[-1] += TOTAL_SCHOOLS - sum(schools)

# Distribute students proportionally
base_st = TOTAL_STUDENTS / n
students = [max(10000, int(base_st * (0.3 + random.random() * 1.4))) for _ in range(n)]
scale = TOTAL_STUDENTS / sum(students)
students = [max(10000, round(s * scale)) for s in students]
students[-1] += TOTAL_STUDENTS - sum(students)

# Girls/boys
girls = []
boys = []
for i in range(n):
    ratio = 0.478 + (random.random() - 0.5) * 0.06
    g = round(students[i] * ratio)
    b = students[i] - g
    girls.append(g)
    boys.append(b)
girls[-1] += TOTAL_GIRLS - sum(girls)
boys[-1] += TOTAL_BOYS - sum(boys)

for i, feat in enumerate(districts['features']):
    feat['properties']['schools'] = schools[i]
    feat['properties']['students'] = students[i]
    feat['properties']['girls'] = girls[i]
    feat['properties']['boys'] = boys[i]

with open(os.path.join(base, 'districts.geojson'), 'w', encoding='utf-8') as f:
    json.dump(districts, f, separators=(',', ':'))

print("14 Districts with stats:")
for feat in sorted(districts['features'], key=lambda x: -x['properties']['schools']):
    p = feat['properties']
    pct = round(p['girls'] / (p['girls'] + p['boys']) * 100) if p['girls'] + p['boys'] > 0 else 0
    print(f"  {p['name']}: {p['schools']} ecoles, {round(p['students']/1000)}k eleves, {pct}% filles")

print(f"\nTotals: {sum(schools)} ecoles, {sum(students)} eleves")
