import csv
import json
import os


def remap_csv_columns(source_csv_path, mapping_json_path, output_csv_path, race_id=None, event_id=None):
    """
    Remap columns from a source CSV file according to a mapping JSON file.
    
    Args:
        source_csv_path: Path to the source CSV file
        mapping_json_path: Path to the JSON file containing column mappings
        output_csv_path: Path to the output CSV file
        race_id: Optional race_id to populate for race_id column if mapped to null
        event_id: Optional event_id to populate for event_id column if mapped to null
    """
    # Read the mapping JSON
    with open(mapping_json_path, 'r', encoding='utf-8') as f:
        mapping = json.load(f)
    
    # Read the source CSV
    with open(source_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        source_rows = list(reader)
        source_fieldnames = reader.fieldnames
    
    # Create the output rows with remapped columns
    output_rows = []
    for source_row in source_rows:
        output_row = {}
        for target_col, source_col in mapping.items():
            if source_col is None:
                # Use provided race_id/event_id if available for those specific columns
                if target_col == 'race_id' and race_id is not None:
                    output_row[target_col] = race_id
                elif target_col == 'event_id' and event_id is not None:
                    output_row[target_col] = event_id
                # Handle special transformations for null-mapped columns
                elif target_col == 'pace':
                    # Calculate pace: time / dist_mi, formatted as ##:##
                    if 'time' in source_row and 'dist_mi' in source_row:
                        time_str = source_row['time']
                        dist_mi = source_row['dist_mi']
                        if time_str and dist_mi:
                            try:
                                # Parse time (HH:MM:SS) to total minutes
                                time_parts = time_str.split(':')
                                if len(time_parts) == 3:
                                    hours = int(time_parts[0])
                                    minutes = int(time_parts[1])
                                    seconds = int(time_parts[2])
                                    total_minutes = hours * 60 + minutes + seconds / 60
                                    # Calculate pace (minutes per mile)
                                    pace_minutes = total_minutes / float(dist_mi)
                                    # Convert to MM:SS format
                                    pace_mins = int(pace_minutes)
                                    pace_secs = int((pace_minutes - pace_mins) * 60)
                                    output_row[target_col] = f"{pace_mins}:{pace_secs:02d}"
                                else:
                                    output_row[target_col] = None
                            except (ValueError, ZeroDivisionError):
                                output_row[target_col] = None
                        else:
                            output_row[target_col] = None
                    else:
                        output_row[target_col] = None
                elif target_col == 'country_code':
                    # Extract first two characters of regionId
                    if 'regionId' in source_row and source_row['regionId']:
                        region_id = source_row['regionId']
                        output_row[target_col] = region_id[:2] if len(region_id) >= 2 else None
                    else:
                        output_row[target_col] = None
                elif target_col == 'state':
                    # Extract last two characters of regionId
                    if 'regionId' in source_row and source_row['regionId']:
                        region_id = source_row['regionId']
                        output_row[target_col] = region_id[-2:] if len(region_id) >= 2 else None
                    else:
                        output_row[target_col] = None
                else:
                    output_row[target_col] = None
            elif source_col in source_row:
                output_row[target_col] = source_row[source_col]
                # Handle null/empty gender values
                if target_col == 'gender' and (output_row[target_col] is None or output_row[target_col] == '' or output_row[target_col] == 'U'):
                    output_row[target_col] = 'X'
            else:
                output_row[target_col] = None
        output_rows.append(output_row)
    
    # Write the output CSV
    target_fieldnames = list(mapping.keys())
    with open(output_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=target_fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)
    
    print(f"Successfully remapped {len(output_rows)} rows from {source_csv_path} to {output_csv_path}")
    return output_rows


def main():
    # Default paths
    source_csv = r'data\results\quarter.20250412.csv'
    mapping_json = r'data\results\hogsback.athlinks.mapping.json'
    output_csv = r'data\results\quarter.20250412.new.csv'

    race_id = 117812
    event_id = 995207
    
    # Remap the CSV
    remap_csv_columns(source_csv, mapping_json, output_csv, race_id, event_id)


if __name__ == '__main__':
    main()
