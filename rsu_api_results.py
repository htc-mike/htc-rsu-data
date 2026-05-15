import requests
import json


def main():
    pass

def get_results_all(race_id, event_id):
    results_list = []
    results_header_list = []
    page = 1

    results, results_header = get_results_page(race_id, event_id, page)
    results_list.extend(results)
    # if results_header is not None:
    # results_header_list.extend(results_header)

    while len(results)==200:
        page += 1
        results, results_header = get_results_page(race_id, event_id, page)
        results_list.extend(results)
        # results_header_list.extend(results_header)

    return results_list, results_header

def get_results_page(race_id, event_id, page = 1):
    url=f"https://runsignup.com/Rest/race/{race_id}/results/get-results?format=json&event_id={event_id}&include_total_finishers=T&include_split_time_ms=F&page={page}&results_per_page=200"
    r = requests.get(url)
    results = []
    results_header = None
    entry = {}
    if r.ok:
        obj = json.loads(r.text)
        # file_utils.write_json(f"data\\race_results_raw.json",obj)
        if len(obj)>0:
            if len(obj['individual_results_sets'])>0:

                for result_set in obj['individual_results_sets']:

                    if 'results_headers' in result_set:
                        results_header = result_set['results_headers']
                        if len(results_header)>0:
                            cols = list(results_header.keys())

                    if len(result_set['results'])>0:
                        # resultsets=len(obj['individual_results_sets'])
                        for result in result_set['results']:
                            entry = {}
                            for key in results_header:
                                # print(key, '->', results_header[key])
                                entry[key] = result[key]
                            results.append(entry)
                        # print(f'race_id={race_id},event_id={event_id},entries={str(len(results))}')

    return results, results_header


if __name__ == '__main__':
    main()