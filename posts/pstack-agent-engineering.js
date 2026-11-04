document.querySelectorAll('.pstack-lab[data-experiment]').forEach(section => {
  const form = section.querySelector('form');
  const outcomes = [...section.querySelectorAll('[data-outcome]')];
  function show(key) {
    outcomes.forEach(outcome => { outcome.hidden = outcome.dataset.outcome !== key; });
    section.dataset.result = key;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    show(form.querySelector('input:checked').value);
  });
  form.addEventListener('change', () => show('initial'));
  form.addEventListener('reset', () => show('initial'));
  show('initial');
  form.hidden = false;
});
