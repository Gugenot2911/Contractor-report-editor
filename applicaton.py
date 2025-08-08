from flask import Flask, jsonify, render_template
import contractor_report

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/main_report', methods = ['GET'])
def main_report():

    report = contractor_report.load_report()
    return jsonify(report.to_dicts())

if __name__ == '__main__':
    app.run('0.0.0.0', 3000, debug=True)