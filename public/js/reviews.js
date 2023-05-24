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

    // Search button click event listener
    searchButton.addEventListener('click', () => {
      const searchValue = searchInput.value.trim();

      // Perform search only if the search value is not empty
      if (searchValue !== '') {
        // Redirect to the same page with the search query parameter
        window.location.href = `/searchReviews?country=${encodeURIComponent(searchValue)}`;
      }
    });

    // Clear button click event listener
    clearButton.addEventListener('click', () => {
      // Clear the search input value
      searchInput.value = '';

      // Redirect to the same page without the search query parameter
      window.location.href = '/reviews';
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
  

 
