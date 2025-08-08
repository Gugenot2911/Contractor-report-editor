// Основной модуль приложения
const App = {
    init: function() {
        this.loadData();
        this.bindEvents();
    },

    bindEvents: function() {
        // Обработчики событий будут здесь
    },

    loadData: function() {
        fetch('http://127.0.0.1:3000/main_report')
            .then(response => response.json())
            .then(data => this.renderTable(data))
            .catch(error => this.showError(error));
    },

    renderTable: function(data) {
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = data.map((item, index) => this.createTableRow(item, index)).join('');

        // Инициализируем Select2 для всех выпадающих списков
        $('.equipment-select').select2({
            placeholder: "Выберите оборудование",
            allowClear: true,
            language: "ru"
        });

        // Добавляем обработчики для кнопок
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleDetails(e));
        });

        // Обработчики форм
        document.querySelectorAll('.work-form').forEach(form => {
            form.addEventListener('submit', (e) => this.saveForm(e));
        });
    },

    createTableRow: function(item, index) {
        return `
            <tr data-id="${index}">
                <td>${item['№ Объекта']}</td>
                <td>${item['Описание фактически выполненных работ']}</td>
                <td><button class="toggle-btn" data-id="${index}">▼</button></td>
            </tr>
            <tr class="details-row" data-parent="${index}" style="display: none;">
                <td colspan="3">
                    <div class="details-content">
                        ${this.createEquipmentForm(index)}
                    </div>
                </td>
            </tr>
        `;
    },

    createEquipmentForm: function(index) {
        return `
            <form class="work-form" data-id="${index}">
                <div class="form-group">
                    <h3>Демонтаж</h3>
                    <select class="equipment-select demontage-select" multiple="multiple" style="width: 100%">
                        ${this.generateEquipmentOptions('demontage')}
                    </select>
                </div>
                <div class="form-group">
                    <h3>Монтаж</h3>
                    <select class="equipment-select montage-select" multiple="multiple" style="width: 100%">
                        ${this.generateEquipmentOptions('montage')}
                    </select>
                </div>
                <button type="submit" class="save-btn">Сохранить</button>
            </form>
        `;
    },

    generateEquipmentOptions: function(type) {
        const options = {
            demontage: [
                {id: 'd1', text: 'Блок питания'},
                {id: 'd2', text: 'Антенна'},
                {id: 'd3', text: 'Кабель'}
            ],
            montage: [
                {id: 'm1', text: 'Новый блок'},
                {id: 'm2', text: 'Усилитель'},
                {id: 'm3', text: 'Модем'}
            ]
        };

        return options[type].map(opt =>
            `<option value="${opt.id}">${opt.text}</option>`
        ).join('');
    },

    toggleDetails: function(e) {
        const btn = e.target;
        const id = btn.getAttribute('data-id');
        const detailsRow = document.querySelector(`.details-row[data-parent="${id}"]`);
        const isHidden = detailsRow.style.display === 'none';

        detailsRow.style.display = isHidden ? 'table-row' : 'none';
        btn.textContent = isHidden ? '▲' : '▼';
    },

    saveForm: function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = {
            id: form.getAttribute('data-id'),
            demontage: $(form).find('.demontage-select').val(),
            montage: $(form).find('.montage-select').val()
        };
        console.log('Сохраненные данные:', formData);
        alert('Данные сохранены!');
    },

    showError: function(error) {
        console.error('Ошибка:', error);
        document.getElementById('table-body').innerHTML = `
            <tr>
                <td colspan="3">Не удалось загрузить данные</td>
            </tr>
        `;
    }
};

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => App.init());