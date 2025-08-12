from flask import Flask, jsonify, render_template, request
import contractor_report
import tempfile
import shutil
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Убедимся, что папка для загрузок существует
UPLOAD_FOLDER = 'temp_uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/main_report', methods=['POST'])
def process_report():
    if 'file' not in request.files:
        return jsonify({"error": "Файл не загружен"}), 400

    uploaded_file = request.files['file']
    if uploaded_file.filename == '':
        return jsonify({"error": "Не выбран файл"}), 400

    filename = secure_filename(uploaded_file.filename)
    if not filename.lower().endswith(('.xlsx', '.xls')):
        return jsonify({"error": "Допустимы только файлы Excel (.xlsx, .xls)"}), 400

    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        uploaded_file.save(filepath)
        print(filepath)

        # Загружаем данные через Polars
        report_df = contractor_report.load_report(path_report=filepath)  # Или другой метод загрузки
        sites = report_df['№ Объекта'].to_list()  # Получаем список значений

        # Предположим, что dismantling_report возвращает Polars DataFrame
        dismantling_df = contractor_report.dismantling_report(site_names=sites)

        # Преобразуем Polars DataFrame в список словарей
        response_data = {
            "contractor_report": report_df.to_dicts(),  # Метод Polars для списка словарей
            "dismantling_report": dismantling_df.to_dicts()
        }

        os.remove(filepath)
        return jsonify(response_data)

    except Exception as e:
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": str(e)}), 500


@app.route('/zip_storage/<string:storage>', methods = ['GET'])
def zip_storage(storage):

    storage = contractor_report.storage_zip(storage=storage)
    print(f'ЗИП {storage} загружен в кэш')

    return jsonify(storage.to_dicts())


@app.route('/dismantling', methods = ['GET'])
def dismantling(site_name):

    dismantling_report = contractor_report.dismantling_report(site_name=site_name)
    print(f'Основные средства объекта {site_name} загружены в кэш')
    return jsonify(dismantling_report.to_dicts())



if __name__ == '__main__':
    app.run('0.0.0.0', 3000, debug=True)

