const elements = document.querySelectorAll('[data-i18n]');
for(const element of elements) {
    let text = browser.i18n.getMessage(element.dataset.i18n);
    element.textContent = text;
}
