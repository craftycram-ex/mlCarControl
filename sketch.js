const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let trackButton = document.getElementById("trackbutton");
let updateNote = document.getElementById("updatenote");

let song;
let songIndex = 0;
const songTitles = ['iot.mp3', 'dsmn.mp3', 'hge.mp3'];
const songs = [];
let volume = 0.5;

let isVideo = false;
let model = null;
let eX = 0;
let eY = 0;
let startX = 0, startY = 0;
let vX = 0, vY = 0;
let tX = 0, tY = 0;
let xDif, yDif;
let lastState = '';
let stateHistory = [];

const modelParams = {
    flipHorizontal: true,   // flip e.g for video  
    maxNumBoxes: 20,        // maximum number of boxes to detect
    iouThreshold: 0.5,      // ioU threshold for non-max suppression
    scoreThreshold: 0.6,    // confidence threshold for predictions.
}

function startVideo() {
    handTrack.startVideo(video).then(function (status) {
        console.log("video started", status);
        if (status) {
            updateNote.innerText = "Video started. Now tracking"
            isVideo = true
            runDetection()
        } else {
            updateNote.innerText = "Please enable video"
        }
    });
}

function toggleVideo() {
    if (!isVideo) {
        updateNote.innerText = "Starting video"
        startVideo();
    } else {
        updateNote.innerText = "Stopping video"
        handTrack.stopVideo(video)
        isVideo = false;
        updateNote.innerText = "Video stopped"
    }
}



function runDetection() {
    model.detect(video).then(predictions => {
        const filteredPredictions = predictions.filter((p) => p.label === 'open' || p.label === 'pinch' || p.label === 'point' || p.label === 'closed');

        let current;
        // ignore empty array filteredPredictions as current is undefined
        if (filteredPredictions.length === 1) current = filteredPredictions[0];
        if (filteredPredictions.length === 2) current = filteredPredictions.sort((a, b) => a.bbox[0] < b.bbox[0])[0];
        if (current) stateHistory.push(current.label);
        if (stateHistory.length >= 4) stateHistory = stateHistory.slice(-4) || [];
        // console.log(stateHistory);
        // if (stateHistory.filter((e) => stateHistory[0] === e).length === 4) console.log('tada');
        
        const vidW = document.getElementById('myvideo').width;
        const vidH = document.getElementById('myvideo').height;

        const detected = stateHistory.filter((e) => stateHistory[0] === e).length === 4 ? stateHistory[0] : false;
        console.log(detected);
        
        if (detected && current) {

          vX = map(current.bbox[0], 0, vidW, 0, width / 2);
          tX = current.bbox[0];
          vY = map(current.bbox[1], 0, vidH, 0, height / 2);
          tY = current.bbox[1];

          // reset
          if (detected === 'point') {
            eX = width/2;
            eY = height/2;
            if (!song.isPlaying()) song.play();
          }
          if (detected === 'closed') {
            eX = width/2;
            eY = height/2;
            if (song.isPlaying()) song.pause();
          }
          
          // start
          if (lastState === 'open' && detected === 'pinch') {
            console.log('start');
            startX = vX;
            startY = vY;
          }
  
          // end
          if (lastState === 'pinch' && detected === 'open') {
            console.log('end');
            eX += (vX - startX);
            eY += (vY - startY);
            const dirVH = Math.abs(vX - startX) - Math.abs(vY - startY) > 0 ? 'h' : 'v';
            console.log(dirVH);
            switch (dirVH) {
              case 'h':
                const next = vX - startX > 0 ? +1 : -1;
                console.log('n',next);
                songIndex += next;
                if (songIndex < 0) songIndex = songs.length + songIndex;
                if (songIndex > songs.length - 1) songIndex = 0;
                song.stop();
                song = songs[songIndex];
                if (!song.isPlaying()) song.play();
                break;
              case 'v':
                volume -= map(vY - startY, 0, vidH / 2, 0, 1);
                song.setVolume(volume);
                console.log(volume);
                break;
              default:
                break;
            }
          }

          lastState = detected;
        }
        // console.log(predictions);
        model.renderPredictions(predictions, canvas, context, video);
        if (isVideo) {
            requestAnimationFrame(runDetection);
        }
    });
}

// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    updateNote.innerText = "Loaded Model!"
    trackButton.disabled = false
});

function preload() {
  for (let i = 0; i < songTitles.length; ++i)
    songs[i] = loadSound(`assets/${songTitles[i]}`);
}

function setup() {
  song = loadSound('assets/iot.mp3');
  song.setVolume(volume);
  createCanvas(640, 480);
  eX = width / 2;
  eY = height / 2;
}

function draw() {
  if (lastState === 'none' || lastState === 'closed') background(220);
  background(220);
  noStroke();
  fill(255, 0, 0);
  ellipse(eX, eY, 10);
  fill(125);
  ellipse(tX, tY, 10);
  line(eX, eY, startX, startY);
  // text(lastState, width / 2, height / 2);
}