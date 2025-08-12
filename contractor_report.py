import polars as pl
import os
import fnmatch
import re

from polars import DataFrame

from balance import Balance

#setting
directory = r'L:\Tech_Maintenance\АВР\АВР 2025'

template_opex = 'НСК-О-25.'
template_capex = 'НСК-К*'

# def list_reports():
#     ls_folder = os.listdir(path)
#
#     return ls_folder

def validator_site_name(site_name:str) -> str:

    pattern_rdb = r"^\w{2,2}\d{6}$"
    pattern_short = r"^\w{2,2}\d{4}$"

    try:
        if re.search(pattern_rdb, site_name):
            return site_name
        elif re.search(pattern_short, site_name):
            site_name = site_name[0:2] + '00' + site_name[2:7]
            return site_name
        else:
            print(f' имя сайта {site_name} неккорректно!')

    except Exception as e:
        print(f' {site_name} {e}!')
        return site_name



def list_reports(directory, pattern):

    ls_reports = []

    for root, dirs, files in os.walk(directory):
        for filename in fnmatch.filter(files, pattern):
            ls_reports.append(os.path.join(root, filename))

    return  ls_reports

def load_report(path_report:str):

    n_rows_to_exclude = 6
    df = pl.read_excel(source=path_report,
                       read_options={"header_row": 10},
                       columns=[1,13],
                       infer_schema_length=0)

    df = df.head(len(df) - n_rows_to_exclude)
    df = df.with_columns(pl.col('№ Объекта').map_elements(validator_site_name, return_dtype=pl.String).alias('№ Объекта'))
    print(df)

    return df



def storage_zip(storage:str, sorted_data = True) -> DataFrame:

    balance = Balance(site_name=storage).sap_tmc().sort('Количество дней хранения', descending=True)

    return balance


def dismantling_report(site_names:list) -> DataFrame:

    balance = Balance(site_name=site_names).sap_os().drop('Партия')

    return balance



# if __name__ == "__main__":