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

            // Для добавления новых позиций
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-item-btn')) {
                this.addEquipmentItem(e.target);
            }

            // Для удаления позиций
            if (e.target.classList.contains('remove-item-btn')) {
                e.target.closest('.selected-item').remove();
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('equipment-select')) {
                const select = e.target;
                const container = select.closest('.select-with-custom');
                const customInput = container.querySelector('.custom-equipment-input');

                if (select.value === 'custom') {
                    select.style.display = 'none';
                    customInput.style.display = 'block';
                    customInput.focus();
                }
            }
        });

        // Возврат к select при пустом ручном вводе
        document.addEventListener('blur', (e) => {
            if (e.target.classList.contains('custom-equipment-input') && !e.target.value) {
                const input = e.target;
                const container = input.closest('.select-with-custom');
                const select = container.querySelector('.equipment-select');

                input.style.display = 'none';
                select.style.display = 'block';
                select.value = '';
            }
        });

    },

    // Метод для добавления оборудования
    addEquipmentItem: function(button) {
        const formGroup = button.closest('.form-group');
        const select = formGroup.querySelector('.equipment-select');
        const codeInput = formGroup.querySelector('.text-field');
        const quantityInput = formGroup.querySelector('.quantity-field');
        const commentInput = formGroup.querySelector('.comment-field');

        // Проверка обязательных полей
        if (!codeInput.value || codeInput.value.length !== 4) {
            this.showToast('Введите корректный код склада (4 символа)', 'warning');
            return;
        }

        if (!quantityInput.value || quantityInput.value < 1) {
            this.showToast('Введите корректное количество', 'warning');
            return;
        }

        // Определяем название оборудования
        let equipmentName = commentInput.value.trim();
        let equipmentId = 'comment_' + Date.now();

        // Если выбрано оборудование из списка, используем его
        if (select.value) {
            equipmentId = select.value;
            equipmentName = select.options[select.selectedIndex].text +
                            (equipmentName ? ` (${equipmentName})` : '');
        } else if (!equipmentName) {
            equipmentName = "Без названия";
        }

        // Создаем элемент для добавленной позиции
        const container = formGroup.querySelector('.selected-items-container');
        const itemElement = document.createElement('div');
        itemElement.className = 'selected-item';
        itemElement.innerHTML = `
            <div class="item-info">
                <span class="item-name">${equipmentName}</span>
                <span class="item-details">${codeInput.value} × ${quantityInput.value}</span>
                ${!select.value ? '<span class="comment-badge">комментарий</span>' : ''}
            </div>
            <input type="hidden" name="equipment_id" value="${equipmentId}">
            <input type="hidden" name="equipment_name" value="${equipmentName}">
            <input type="hidden" name="storage_code" value="${codeInput.value}">
            <input type="hidden" name="quantity" value="${quantityInput.value}">
            <input type="hidden" name="is_comment" value="${!select.value}">
            <button type="button" class="remove-item-btn">×</button>
        `;

        container.appendChild(itemElement);

        // Сбрасываем форму
        select.value = '';
        codeInput.value = '';
        quantityInput.value = '1';
        commentInput.value = '';
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

        // Используем стрелочные функции для сохранения контекста
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
            this.showError(errorMsg);
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
                    let optionText = `${item.text} | (Партия: ${item.batch}  | ${item.id}`;
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

    updateResultsTable: function() {
        const resultsBody = document.getElementById('results-body');
        resultsBody.innerHTML = '';

        if (!this.reportData) return;

        this.reportData.forEach((site, index) => {
            const form = document.querySelector(`form[data-id="${index}"]`);
            if (!form) return;

            const siteNumber = site['№ Объекта'] || 'Без номера';

            // Добавляем демонтаж
            const demontageItems = this.collectSelectedItems(form.querySelector('#demontage-items-container'));
            demontageItems.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${siteNumber}</td>
                    <td>Демонтаж</td>
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td></td>
                    <td>${item.quantity}</td>
                    <td>${item.storage_code}</td>
                    <td>${item.is_comment ? 'Комментарий: ' + item.name : ''}</td>
                `;
                resultsBody.appendChild(row);
            });

            // Добавляем монтаж
            const montageItems = this.collectSelectedItems(form.querySelector('#montage-items-container'));
            montageItems.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${siteNumber}</td>
                    <td>Монтаж</td>
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.storage_code}</td>
                    <td>${item.is_comment ? 'Комментарий: ' + item.name : ''}</td>
                `;
                resultsBody.appendChild(row);
            });
        });
    },

    // Сохранение формы
    // Модифицируем метод saveForm
    saveForm: function(form) {
        const formData = {
            id: form.getAttribute('data-id'),
            demontage: this.collectSelectedItems(form.querySelector('#demontage-items-container')),
            montage: this.collectSelectedItems(form.querySelector('#montage-items-container'))
        };

        console.log('Сохраненные данные:', formData);
        this.showToast('Данные сохранены успешно!');

        // Обновляем таблицу результатов
        this.updateResultsTable();
    },

    // Метод для сбора выбранных позиций
    collectSelectedItems: function(container) {
        const items = [];
        container.querySelectorAll('.selected-item').forEach(item => {
            items.push({
                id: item.querySelector('input[name="equipment_id"]').value,
                name: item.querySelector('input[name="equipment_name"]').value,
                storage_code: item.querySelector('input[name="storage_code"]').value,
                quantity: item.querySelector('input[name="quantity"]').value,
                is_comment: item.querySelector('input[name="is_comment"]').value === 'true'
            });
        });
        return items;
    },

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