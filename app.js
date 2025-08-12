/**
 * Главный модуль приложения
 */
const App = {
    // Данные приложения
    reportData: null,
    dismantlingData: null,
    equipmentCache: null,
    currentStorage: null,

    // Инициализация приложения
    init: function() {
        this.cacheElements();
        this.bindEvents();
        this.setupFileUpload();
    },

    // Кэширование DOM-элементов
    cacheElements: function() {
        this.elements = {
            // Элементы загрузки файла
            fileInput: document.getElementById('file-input'),
            uploadBtn: document.getElementById('upload-btn'),
            statusText: document.getElementById('upload-status'),

            // Элементы таблицы
            tableBody: document.getElementById('table-body'),
            rowTemplate: document.getElementById('row-template'),
            formTemplate: document.getElementById('equipment-form-template'),

            // Элементы управления складом
            storageInput: document.getElementById('storage-input'),
            loadStorageBtn: document.getElementById('load-storage'),
            storageHint: document.getElementById('storage-hint')
        };
    },

    // Настройка загрузки файлов
    setupFileUpload: function() {
        this.elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.elements.uploadBtn.disabled = false;
                this.elements.statusText.textContent = `Выбран файл: ${e.target.files[0].name}`;
                this.elements.statusText.className = 'upload-status ready';
            }
        });
    },

    // Навешивание обработчиков событий
    bindEvents: function() {
        // Для загрузки файла
        this.elements.uploadBtn.addEventListener('click', () => this.uploadAndProcessFile());

        // Для загрузки со склада
        this.elements.storageInput.addEventListener('input', () => {
            this.elements.loadStorageBtn.disabled = !this.elements.storageInput.value.trim();
        });

        this.elements.loadStorageBtn.addEventListener('click', () => this.loadStorageData());

        // Для таблицы
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-btn')) {
                this.toggleDetails(e.target);
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('work-form')) {
                e.preventDefault();
                this.saveForm(e.target);
            }
        });
    },

    // Загрузка и обработка файла
    uploadAndProcessFile: function() {
        const file = this.elements.fileInput.files[0];
        if (!file) {
            this.showToast('Выберите файл для загрузки', 'error');
            return;
        }

        // Проверка расширения файла
        const validExtensions = ['.xlsx', '.xls'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            this.showToast('Допустимы только файлы Excel (.xlsx, .xls)', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        this.elements.uploadBtn.disabled = true;
        this.elements.statusText.textContent = 'Обработка файла...';
        this.elements.statusText.className = 'upload-status processing';

        fetch('http://10.77.28.241:3000/main_report', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text || 'Ошибка обработки файла');
                });
            }

            return response.json();
        })
        .then(data => {
            if (!data || !data.contractor_report) {
                throw new Error('Некорректный формат ответа от сервера');
            }

            this.reportData = data.contractor_report;
            this.dismantlingData = data.dismantling_report;
            this.renderTable();
            this.initSelects();
            this.showToast('Файл успешно обработан');
            this.elements.statusText.className = 'upload-status success';
        })
        .catch(error => {
            console.error('Ошибка:', error);
            const errorMsg = error.message.includes('<!DOCTYPE html>')
                ? 'Серверная ошибка (проверьте логи сервера)'
                : error.message;
            this.showError(new Error(errorMsg));
            this.elements.statusText.className = 'upload-status error';
        })
        .finally(() => {
            this.elements.uploadBtn.disabled = false;
            this.elements.statusText.textContent = 'Готово к новой загрузке';
        });
    },

    // Загрузка данных со склада
    loadStorageData: function() {
        this.currentStorage = this.elements.storageInput.value.trim();
        if (!this.currentStorage) {
            this.showToast('Введите код склада', 'error');
            return;
        }

        this.elements.loadStorageBtn.textContent = 'Загрузка...';
        this.elements.loadStorageBtn.disabled = true;

        fetch(`http://10.77.28.241:3000/zip_storage/${this.currentStorage}`)
            .then(response => {
                if (!response.ok) throw new Error(`Склад ${this.currentStorage} не найден`);
                return response.json();
            })
            .then(data => {
                this.processStorageData(data);
                this.showToast(`Загружено ${data.length} позиций со склада ${this.currentStorage}`);
            })
            .catch(error => {
                console.error('Ошибка загрузки со склада:', error);
                this.showToast(error.message, 'error');
                this.equipmentCache = null;
            })
            .finally(() => {
                this.elements.loadStorageBtn.textContent = 'Загрузить со склада';
                this.elements.loadStorageBtn.disabled = !this.elements.storageInput.value.trim();
            });
    },

    // Обработка данных склада
    processStorageData: function(data) {
        this.equipmentCache = data.map(item => ({
            id: item['СПП-элемент'],
            text: item['КрТекстМатериала'],
            days: parseInt(item['Количество дней хранения']) || 0,
            batch: item['Партия'],
            asset: item['Основное средство'],
            quantity: item['Количество запаса в партии']
        }));

        this.updateMontageSelects();
        this.elements.storageHint.textContent = `Текущий склад: ${this.currentStorage}`;
    },

    // Рендер таблицы
    renderTable: function() {
        try {
            if (!Array.isArray(this.reportData)) {
                throw new Error('Некорректный формат данных отчета');
            }

            this.elements.tableBody.innerHTML = '';

            this.reportData.forEach((item, index) => {
                const rowClone = this.elements.rowTemplate.content.cloneNode(true);
                const row = rowClone.querySelector('tr[data-id]');

                row.setAttribute('data-id', index);
                row.querySelector('.object-number').textContent = item['№ Объекта'] || '';
                row.querySelector('.work-description').textContent =
                    item['Описание фактически выполненных работ'] || '';
                row.querySelector('.toggle-btn').setAttribute('data-id', index);

                const detailsRow = rowClone.querySelector('.details-row');
                detailsRow.setAttribute('data-parent', index);

                const formClone = this.elements.formTemplate.content.cloneNode(true);
                const form = formClone.querySelector('form');
                form.setAttribute('data-id', index);

                // Добавляем данные для демонтажа
                const siteDismantling = this.getDismantlingForSite(item['№ Объекта']);
                this.fillDemontageSelect(form, siteDismantling);

                detailsRow.querySelector('.details-content').appendChild(form);
                this.elements.tableBody.appendChild(rowClone);
            });
        } catch (error) {
            console.error('Ошибка рендеринга таблицы:', error);
            this.showError(error);
        }
    },

    // Получение данных для демонтажа по сайту
    getDismantlingForSite: function(siteName) {
        if (!Array.isArray(this.dismantlingData)) return [];
        return this.dismantlingData.filter(item => item['Сайт'] === siteName);
    },

    // Заполнение select'а демонтажа
    fillDemontageSelect: function(form, items) {
        const select = form.querySelector('.demontage-select');
        select.innerHTML = '';

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item['Основное средство'];
            option.textContent = `${item['Название основного средства']} | ${item['Основное средство']}`;
            select.appendChild(option);
        });
    },

    // Обновление списка монтажа (данные со склада)
    updateMontageSelects: function() {
        if (!this.equipmentCache || !Array.isArray(this.equipmentCache)) {
            return;
        }

        $('.montage-select').each((index, select) => {
            const $select = $(select);
            const selected = $select.val() || [];

            $select.empty().append('<option value="">-- Выберите оборудование --</option>');

            // Сортируем по сроку хранения (сначала старые)
            [...this.equipmentCache]
                //.sort((a, b) => a.days - b.days)
                .forEach(item => {
                    let optionText = `${item.text} (Партия: ${item.batch}`;
                    if (item.days) optionText += `, ${item.days} дн.`;
                    optionText += ')';

                    $select.append(new Option(optionText, item.id));
                });

            $select.val(selected).trigger('change');
        });
    },

    // Инициализация Select2
    initSelects: function() {
        if (typeof $().select2 === 'function') {
            $('.equipment-select').select2({
                placeholder: "Выберите оборудование",
                allowClear: true,
                language: "ru",
                width: '100%'
            });
        }
    },

    // Переключение деталей строки
    toggleDetails: function(button) {
        const id = button.getAttribute('data-id');
        const detailsRow = document.querySelector(`.details-row[data-parent="${id}"]`);

        if (detailsRow) {
            const isHidden = detailsRow.style.display === 'none';
            detailsRow.style.display = isHidden ? 'table-row' : 'none';
            button.textContent = isHidden ? '▲' : '▼';
        }
    },

    // Сохранение формы
    saveForm: function(form) {
        const formData = {
            id: form.getAttribute('data-id'),
            demontage: $(form).find('.demontage-select').val() || [],
            montage: $(form).find('.montage-select').val() || []
        };
        console.log('Сохраненные данные:', formData);
        this.showToast('Данные сохранены успешно!');
    },

    // Показ уведомлений
    showToast: function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    // Показ ошибки
    showError: function(error) {
        console.error('Ошибка:', error);
        this.showToast('Ошибка загрузки данных', 'error');

        if (this.elements.tableBody) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="3">Ошибка загрузки данных: ${this.escapeHtml(error.message)}</td>
                </tr>
            `;
        }
    },

    // Экранирование HTML
    escapeHtml: function(unsafe) {
        if (unsafe == null) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => App.init());