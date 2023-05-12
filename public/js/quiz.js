
  const optionBtns = document.querySelectorAll('.option-btn');
  const activeBtns = {};

  optionBtns.forEach((btn) => {
    const question = btn.getAttribute('data-question');

    btn.addEventListener('click', (e) => {
      const value = e.target.getAttribute('data-value');
      const input = document.querySelector(`#${question}-input`);

      // Remove active class from previously active button for this question
      if (activeBtns[question]) {
        activeBtns[question].classList.remove('active');
      }

      // Add active class to newly selected button and update input value
      e.target.classList.add('active');
      activeBtns[question] = e.target;
      input.value = value;
    });
  });
