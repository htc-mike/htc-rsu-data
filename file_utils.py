import csv
import json
import os.path

def is_file(file_name):
    return os.path.isfile(file_name)

def read_file_as_string(file_name):
    with open(file_name, 'r') as f:
        data = f.read()
    return data
    
def read_csv_list(file_name):

    with open(file_name, 'r') as f:
        #need to replace null bytes
        reader = csv.reader(x.replace('\0', '') for x in f)
        #bring rows into a list, instead of reader
        rows = [row for row in reader if row]
        return rows

def read_csv(file_name):

    with open(file_name, 'r') as f:
        reader = csv.DictReader(f)
        data = []
        for line in reader:
            data.append(line)
        return data      

def read_csv_tab(file_name):
    with open(file_name, 'r') as f:
        # header = f.readline()
        # fieldnames=header.split('\t'), 
        reader = csv.DictReader(f,delimiter='\t')
        data = []
        for line in reader:
            data.append(line)
        return data      

def write_csv(file_name, data, columns=None):
    #writer = csv.writer(f, quoting=csv.QUOTE_NONNUMERIC)
    # write_header = os.path.isfile(file_name)    
    with open(file_name, 'w', encoding='UTF-8') as f: 
        if isinstance(data[0],dict):
            if columns is None:
                columns=data[1].keys()
            w = csv.DictWriter(f, columns, lineterminator='\n',quoting=csv.QUOTE_NONNUMERIC)
            # if not write_header:
            w.writeheader()
            w.writerows(data)
        else:
            for item in data:
                f.write(f"{item}\n")

def read_json(file_name):
    with open(file_name, 'r') as f: 
        data = json.load(f)    
    return data

def write_json(file_name, data):
    with open(file_name, 'w', encoding="utf8") as f: 
        json.dump(data,f,indent=4,sort_keys=False)    

def write_file(file_name, data):
    with open(file_name, 'w', encoding="utf8") as f: 
        f.write(data)      

def write_csv_utf8(file_name, data):
    f = open(file_name,'wb')
    f.write(u'\ufeff'.encode('utf8')) # BOM (optional...Excel needs it to open UTF-8 file properly)
    w = csv.DictWriter(f,sorted(data.keys()))
    w.writeheader()
    w.writerow({k:v.encode('utf8') for k,v in data.items()})
    f.close()          