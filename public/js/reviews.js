document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const clearButton = document.getElementById('clearButton');

  // Retrieve the initial search value from the query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const initialSearchValue = urlParams.get('country');

  // Set the initial search value in the search input
  if (initialSearchValue) {
    searchInput.value = initialSearchValue;
  }

  const performSearch = () => {
    const searchValue = searchInput.value.trim();

    // Perform search only if the search value is not empty
    if (searchValue !== '') {
      // Redirect to the reviews page with the search query parameter
      window.location.href = `/searchReviews?country=${encodeURIComponent(searchValue)}`;
    }
  };

  // Search button click event listener
  searchButton.addEventListener('click', performSearch);

  // Clear button click event listener
  clearButton.addEventListener('click', () => {
    // Clear the search input value
    searchInput.value = '';

    // Redirect to the reviews page without the search query parameter
    window.location.href = '/reviews';
  });

  // Search input keypress event listener to perform search on "Enter"
  searchInput.addEventListener('keypress', (event) => {
    // Check if the Enter key is pressed (keyCode 13)
    if (event.keyCode === 13) {
      performSearch();
    }
  });

  const deleteReviewButtons = document.querySelectorAll("[data-bs-target='#deleteModal']");
  const deleteReviewBtn = document.getElementById("deleteReviewBtn");

  deleteReviewButtons.forEach((button) => {
    button.addEventListener("click", function() {
      const reviewId = this.getAttribute("data-review-id");
      deleteReviewBtn.setAttribute("href", `/deleteReview?id=${reviewId}`);
    });
  });
});