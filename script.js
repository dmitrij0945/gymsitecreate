'use strict';

/* ============================================================
   1. ДЕЛЕГИРОВАНИЕ СОБЫТИЙ
   Один обработчик на документе ловит клики по ссылкам
   вспомогательного меню и плавно скроллит к секции.
   ============================================================ */
document.addEventListener('click', function (event) {
  const link = event.target.closest('aside a[href^="#"]');
  if (!link) return;

  const targetId = link.getAttribute('href').slice(1);
  const target = document.getElementById(targetId);
  if (!target) return;

  event.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

/* ============================================================
   2. DRAG & DROP (мышь) + клавиатурная альтернатива
   Перетаскивание элементов из списка «Доступные» в «Выбранные».
   Выбранные элементы затем можно отправить через форму.
   ============================================================ */
(function initDnD() {
  const sourceList = document.getElementById('dnd-source');
  const targetList = document.getElementById('dnd-target');
  if (!sourceList || !targetList) return;

  let draggedItem = null;

  // --- события мыши ---
  function onDragStart(e) {
    const item = e.target.closest('.dnd-item');
    if (!item) return;
    draggedItem = item;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.value || item.textContent.trim());
  }

  function onDragEnd(e) {
    const item = e.target.closest('.dnd-item');
    if (item) item.classList.remove('dragging');
    draggedItem = null;
    document.querySelectorAll('.dnd-zone').forEach(z => z.classList.remove('dragover'));
  }

  function onDragOver(e) {
    const zone = e.target.closest('.dnd-zone');
    if (!zone) return;
    e.preventDefault(); // разрешаем drop
    e.dataTransfer.dropEffect = 'move';
    zone.classList.add('dragover');
  }

  function onDragLeave(e) {
    const zone = e.target.closest('.dnd-zone');
    if (zone) zone.classList.remove('dragover');
  }

  function onDrop(e) {
    const zone = e.target.closest('.dnd-zone');
    if (!zone || !draggedItem) return;
    e.preventDefault();
    zone.classList.remove('dragover');

    const list = zone.querySelector('ul');
    if (!list) return;

    // Нельзя перетаскивать в тот же список
    if (list === draggedItem.parentElement) return;

    list.appendChild(draggedItem);
    updateSelectedHiddenField();
  }

  // Делегирование: слушаем на контейнере
  const wrapper = document.querySelector('.dnd-wrapper');
  if (wrapper) {
    wrapper.addEventListener('dragstart', onDragStart);
    wrapper.addEventListener('dragend', onDragEnd);
    wrapper.addEventListener('dragover', onDragOver);
    wrapper.addEventListener('dragleave', onDragLeave);
    wrapper.addEventListener('drop', onDrop);
  }

  // --- клавиатурная альтернатива (Enter/Space перемещает элемент) ---
  function onItemKeydown(e) {
    const item = e.target.closest('.dnd-item');
    if (!item) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();

    const currentList = item.parentElement;
    const otherList = currentList === sourceList ? targetList : sourceList;
    otherList.appendChild(item);
    item.focus();
    updateSelectedHiddenField();
  }

  if (wrapper) {
    wrapper.addEventListener('keydown', onItemKeydown);
  }

  // Обновляем скрытое поле для формы
  function updateSelectedHiddenField() {
    const hidden = document.getElementById('selected-trainings');
    if (!hidden) return;
    const values = Array.from(targetList.querySelectorAll('.dnd-item'))
      .map(li => li.dataset.value || li.textContent.trim());
    hidden.value = values.join(', ');
  }
})();

/* ============================================================
   3. FOCUS / BLUR — подсветка полей и подсказки
   ============================================================ */
(function initFocusBlur() {
  const fields = document.querySelectorAll('input, textarea, select');

  fields.forEach(field => {
    field.addEventListener('focus', function () {
      this.classList.add('focused');
      const hint = document.getElementById(this.id + '-hint');
      if (hint) hint.hidden = false;
    });

    field.addEventListener('blur', function () {
      this.classList.remove('focused');
      const hint = document.getElementById(this.id + '-hint');
      if (hint) hint.hidden = true;
    });
  });
})();

/* ============================================================
   4. ОТПРАВКА ФОРМ — событие submit
   Валидация + имитация отправки (замените action на свой почтовый сервис).
   ============================================================ */
(function initForms() {
  const forms = document.querySelectorAll('form[data-ajax]');

  forms.forEach(form => {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const messageBox = form.querySelector('.form-message');
      if (!messageBox) return;

      // Простая валидация
      let valid = true;
      form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
          valid = false;
          field.setAttribute('aria-invalid', 'true');
        } else {
          field.removeAttribute('aria-invalid');
        }
      });

      if (!valid) {
        messageBox.textContent = 'Пожалуйста, заполните обязательные поля.';
        messageBox.className = 'form-message error';
        return;
      }

      // Имитация успешной отправки
      // В реальном проекте здесь fetch() на сервер или action формы
      messageBox.textContent = 'Спасибо! Ваше сообщение отправлено. Мы свяжемся с вами.';
      messageBox.className = 'form-message success';
      form.reset();

      // Сброс выбранных тренингов
      const hidden = document.getElementById('selected-trainings');
      if (hidden) hidden.value = '';

      // Убрать сообщение через 6 секунд
      setTimeout(() => {
        messageBox.className = 'form-message';
        messageBox.textContent = '';
      }, 6000);
    });
  });
})();

/* ============================================================
   5. ВНУТРЕННИЙ ПОИСК (по страницам сайта)
   ============================================================ */
(function initSearch() {
  const input = document.getElementById('site-search');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  // База страниц (в реальном проекте — с сервера)
  const pages = [
    { title: 'Главная — Спортзал «Силач»', url: 'index.html', text: 'спортзал силач главная тренировки фитнес' },
    { title: 'О нас — история и миссия', url: 'about.html', text: 'о нас история миссия команда зал' },
    { title: 'Услуги — тренировки и направления', url: 'services.html', text: 'услуги тренировки йога бокс кроссфит бассейн' },
    { title: 'Тренеры — специалисты зала', url: 'trainers.html', text: 'тренеры инструкторы специалисты' },
    { title: 'Расписание занятий', url: 'schedule.html', text: 'расписание занятия время группы' },
    { title: 'Цены и абонементы', url: 'prices.html', text: 'цены абонементы стоимость скидки' },
    { title: 'Контакты и обратная связь', url: 'contacts.html', text: 'контакты адрес телефон почта обратная связь' }
  ];

  input.addEventListener('input', function () {
    const query = this.value.trim().toLowerCase();
    results.innerHTML = '';

    if (query.length < 2) return;

    const found = pages.filter(p =>
      p.title.toLowerCase().includes(query) || p.text.includes(query)
    );

    if (found.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Ничего не найдено. Попробуйте другой запрос.';
      results.appendChild(li);
      return;
    }

    found.forEach(p => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = p.url;
      a.textContent = p.title;
      li.appendChild(a);
      results.appendChild(li);
    });
  });
})();

/* ============================================================
   6. АКТИВНАЯ ССЫЛКА В МЕНЮ (подсветка текущей страницы)
   ============================================================ */
(function markActive() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.main-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === current) a.classList.add('active');
  });
})();