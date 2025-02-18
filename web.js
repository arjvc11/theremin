// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
    HandLandmarker,
    FilesetResolver,
  } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20";
  
  const demosSection = document.getElementById("demos");
  
  let handLandmarker = undefined;
  let runningMode = "IMAGE";
  let enableWebcamButton;
  let webcamRunning = false;
  
  // Before we can use HandLandmarker class we must wait for it to finish
  // loading. Machine Learning models can be large and take a moment to
  // get everything needed to run.
  const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU",
      },
      runningMode: runningMode,
      numHands: 2,
    });
    demosSection.classList.remove("invisible");
  };
  createHandLandmarker();
  
  const video = document.getElementById("webcam");
  const canvasElement = document.getElementById("output_canvas");
  const canvasCtx = canvasElement.getContext("2d");
  
  //check if webcam
  const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;
  
  // If webcam supported, add event listener to button for when user
  // wants to activate it.
  if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
    enableWebcamButton.addEventListener("click", enableAudio);
  } else {
    console.warn("getUserMedia() is not supported by your browser");
  }
  
  // Enable the live webcam view and start detection.
  function enableCam(event) {
    if (!handLandmarker) {
      console.log("Wait! objectDetector not loaded yet.");
      return;
    }
  
    if (webcamRunning === true) {
      webcamRunning = false;
      enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    } else {
      webcamRunning = true;
      enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }
  
    // getUsermedia parameters.
    const constraints = {
      video: true,
    };
  
    //webcam stream
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
    });
  }
  
  let oscillator = null;
  let gainNode = null;
  
  //init freq and volume
  const WIDTH = 1;
  const HEIGHT = 1;
  
  const maxFreq = 2000000000;
  const maxVol = 0.09;
  const initialVol = 0.10;
  
  function enableAudio(event) {
  
    //soundmaking
    const AudioContext = window.AudioContext;
    const audioCtx = new AudioContext();
  
    //create oscillator
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    window.gainNode = gainNode;
  
    //connect to gain node to speakers
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    //oscillator.connect(audioCtx.destination);
  
    //set oscillator options
    oscillator.detune.value = 100;
    oscillator.start(0);
  
    gainNode.gain.value = initialVol;
    console.log(gainNode.gain.minvalue);
    console.log(gainNode.gain.maxValue);
  }
  
  //declare coords
  let xCoord;
  let yCoord;
  
  let lastVideoTime = -1;
  let results = undefined;
  console.log(video);
  async function predictWebcam() {
    canvasElement.style.width = video.videoWidth;
    canvasElement.style.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
  
    //detect screen
    if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await handLandmarker.setOptions({ runningMode: "VIDEO" });
    }
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      results = handLandmarker.detectForVideo(video, startTimeMs);
    }
  
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);
    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        console.log(landmarks)
        drawingUtils.drawConnectors(landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });
        drawingUtils.drawLandmarks(landmarks, { color: "#FFFFFF", lineWidth: 10 });
      }
      if (results.landmarks.length != 0) {
        console.log(results.landmarks[0][8].x);
        xCoord = results.landmarks[0][8].x;
        console.log(results.landmarks[0][8].y);
        yCoord = results.landmarks[0][8].y;
  
        //set freq and gain
        oscillator.frequency.value = ((1 - xCoord) * maxFreq);
        gainNode.gain.value = (1 - yCoord);
        if (results.landmarks[0][8].x < 0.5) {
          console.log("right");
        } else {
          console.log("left");
        }
      }
    }
    canvasCtx.restore();
  
    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  }
  