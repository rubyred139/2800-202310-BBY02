const airplaneContainer = document.getElementById('airplane-container');
const offsetPixels = 150;
let isClicked = false;
const startButton = document.getElementById('startButton');
const duckDiv = document.getElementById('duck');

startButton.addEventListener('click', function() {
    if (isClicked) {
        startButton.src='takeOff.png';
        startButton.style.width='35px';
        airplaneContainer.classList.toggle('show')
        isClicked = false;
      
    } else {
        startButton.src='landing.png';
        startButton.style.width='40px';
        isClicked = true;
    }     
    airplaneContainer.style.display = isClicked ? 'block' : 'none';
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
  
  function createConfetti() {
    if(isClicked){
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = `${Math.random() * 100}%`;
    container.appendChild(confetti);

    setTimeout(() => {
        container.removeChild(confetti);
      }, 2000);  

      audio.play(); 
    } else {
        audio.pause();
        audio.currentTime = 0;
    }
  }
  
  // Generate confetti periodically
  setInterval(createConfetti, 200);
  

  //audio
  const audio = new Audio('duckSound.mp4');



  