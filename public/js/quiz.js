const optionBtns = document.querySelectorAll('.option-btn');
const activeBtns = {};

optionBtns.forEach((btn) => {
  const question = btn.getAttribute('data-question');

  // Add active class to the first option button by default
  if (!activeBtns[question]) {
    btn.classList.add('active');
    activeBtns[question] = btn;
    const value = btn.getAttribute('data-value');
    const input = document.querySelector(`#${question}-input`);
    input.value = value;
  }

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

// Reset function
function resetAnswers() {
  // Clear input values
  const inputs = document.querySelectorAll('input[type="hidden"]');
  inputs.forEach((input) => {
    input.value = '';
  });

  // Remove active class from all option buttons
  optionBtns.forEach((btn) => {
    btn.classList.remove('active');
  });
}

// Event listener for the reset button
const resetBtn = document.querySelector('#reset-btn');
resetBtn.addEventListener('click', resetAnswers);
