//easter egg container div variable
const airplaneContainer = document.getElementById('airplane-container');
const offsetPixels = 150;
//let the button that triggers easter egg initially false
let isClicked = false;
const startButton = document.getElementById('startButton');
const duckDiv = document.getElementById('duck');

//event listener for easter egg button 
startButton.addEventListener('click', function () {
  //if its clicked, toggles the easter egg container to show the animation
  if (isClicked) {
    startButton.src = 'takeOff.png';
    startButton.style.width = '20';
    airplaneContainer.classList.toggle('show')
    isClicked = false;
  } else {
    startButton.src = 'landing.png';
    startButton.style.width = '30';
    isClicked = true;
  }
  airplaneContainer.style.display = isClicked ? 'inline-block' : 'none';
});

//confetti 
const colors = [
  '#ff0000', // red
  '#ffa500', // orange
  '#ffff00', // yellow
  '#00ff00', // green
  '#0000ff', // blue
  '#4b0082', // indigo
  '#ee82ee'  // violet
];

const container = document.getElementById('confetti-container');

//function that creates the confetti to rain down in random places
function createConfetti() {
  if (isClicked) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.zIndex = 2;
    container.appendChild(confetti);

    //sets timeout for confetti after easter egg is disabled
    setTimeout(() => {
      container.removeChild(confetti);
    }, 2000);

    //play the audio
    audio.play();
  } else {
    audio.pause();
    audio.currentTime = 0;
  }
}

// Generate confetti periodically
setInterval(createConfetti, 200);

//import audio
const audio = new Audio('duckSound.mp4');




