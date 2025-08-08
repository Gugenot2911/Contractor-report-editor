import polars as pl
import os
import fnmatch


#setting
directory = r'L:\Tech_Maintenance\АВР\АВР 2025'

template_opex = 'НСК-О-25.'
template_capex = 'НСК-К*'

# def list_reports():
#     ls_folder = os.listdir(path)
#
#     return ls_folder



def list_reports(directory, pattern):

    ls_reports = []

    for root, dirs, files in os.walk(directory):
        for filename in fnmatch.filter(files, pattern):
            ls_reports.append(os.path.join(root, filename))

    return  ls_reports

def load_report(site_name = ''):

    n_rows_to_exclude = 6

    df = pl.read_excel(source=list_reports(directory=directory, pattern=template_capex)[0],
                       read_options={"header_row": 10},
                       columns=[1,13],
                       infer_schema_length=0)

    df = df.head(len(df) - n_rows_to_exclude)

    if site_name != '':
        df = df.filter(pl.col('№ Объекта') == site_name)
        return df
    else:
        return df






if __name__ == "__main__":
    print(load_report())