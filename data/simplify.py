import json
import sys
import os

def simplify_coords(coords, precision=3):
    """Reduce coordinate precision to reduce file size."""
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], precision), round(coords[1], precision)]
    return [simplify_coords(c, precision) for c in coords]

def process_file(input_path, output_path, level_name, precision=3):
    print(f"Processing {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    features = data.get('features', [])
    print(f"  Found {len(features)} features")
    
    # Determine the name property based on level
    name_props = {
        'civ_admin1': ['name', 'NAME_1', 'adm1_name'],
        'civ_admin2': ['name', 'NAME_2', 'adm2_name'],
        'civ_admin3': ['name', 'NAME_3', 'adm3_name'],
    }
    
    code_props = {
        'civ_admin1': ['HASC_1', 'CODE_1', 'adm1_pcode'],
        'civ_admin2': ['HASC_2', 'CODE_2', 'adm2_pcode'],
        'civ_admin3': ['HASC_3', 'CODE_3', 'adm3_pcode'],
    }
    
    out_features = []
    for feat in features:
        props = feat.get('properties', {})
        geom = feat.get('geometry', {})
        
        # Find name
        name = None
        for p in name_props.get(level_name, []):
            if p in props and props[p]:
                name = props[p]
                break
        if not name:
            name = props.get('Name', 'Unknown')
        
        # Find code
        code = None
        for p in code_props.get(level_name, []):
            if p in props and props[p]:
                code = props[p]
                break
        
        # Simplify geometry
        simplified_geom = None
        if geom and geom.get('coordinates'):
            simplified_geom = {
                'type': geom['type'],
                'coordinates': simplify_coords(geom['coordinates'], precision)
            }
        
        out_feat = {
            'type': 'Feature',
            'properties': {
                'name': name,
                'code': code or '',
                'level': level_name.replace('civ_admin', ''),
            },
            'geometry': simplified_geom
        }
        out_features.append(out_feat)
    
    out_data = {
        'type': 'FeatureCollection',
        'features': out_features
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(out_data, f)
    
    size_kb = os.path.getsize(output_path) / 1024
    print(f"  Written {len(out_features)} features to {output_path} ({size_kb:.0f} KB)")
    return out_features

if __name__ == '__main__':
    base_dir = r'C:\Users\user\Desktop\Observatoire National\data\raw'
    out_dir = r'C:\Users\user\Desktop\Observatoire National\data\simplified'
    os.makedirs(out_dir, exist_ok=True)
    
    # Process admin1 (Districts) - use lower precision
    process_file(
        os.path.join(base_dir, 'civ_admin1.geojson'),
        os.path.join(out_dir, 'districts.geojson'),
        'civ_admin1',
        precision=3
    )
    
    # Process admin2 (Regions)
    process_file(
        os.path.join(base_dir, 'civ_admin2.geojson'),
        os.path.join(out_dir, 'regions.geojson'),
        'civ_admin2',
        precision=3
    )
    
    # Process admin3 (Departments) - keep only essential fields, simplify more
    process_file(
        os.path.join(base_dir, 'civ_admin3.geojson'),
        os.path.join(out_dir, 'depts.geojson'),
        'civ_admin3',
        precision=3
    )
    
    print("\nDone! Files are in:", out_dir)
