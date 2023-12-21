import React, { useState, useEffect, useRef } from 'react';

const ItsTheNew = () => {
  // State to hold frequency data
  // eslint-disable-next-line no-unused-vars
  const [frames, setFrames] = useState([]);
  // State to display current frame data
  const [currentFrame, setCurrentFrame] = useState('');
  // State to track whether the song is playing
  // eslint-disable-next-line no-unused-vars
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs to maintain the audio context and source across renders
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);

  // Function to play or stop the song and visualize it
  const togglePlay = async () => {
    // If the song is currently playing, stop it
    if (isPlaying) {
      sourceRef.current.stop();
      // Close the audio context if it's not already closed
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      setIsPlaying(false);
      return;
    }

    // Create an audio context and set up analyser
    audioContextRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
    const analyser = audioContextRef.current.createAnalyser();
    sourceRef.current = audioContextRef.current.createBufferSource();

    // Fetch and decode the audio file
    const response = await fetch(
      'https://cdn.pixabay.com/audio/2022/04/25/audio_5d61b5204f.mp3'
    );
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContextRef.current.decodeAudioData(
      arrayBuffer
    );

    // Set up audio source, connect to analyser and destination
    sourceRef.current.buffer = audioBuffer;
    sourceRef.current.connect(analyser);
    analyser.connect(audioContextRef.current.destination);

    // Set up analyser properties
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    // Function to draw bars expanding from the center
    const drawBars = (frameData) => {
      const canvas = document.getElementById('visualizerCanvas');
      const ctx = canvas.getContext('2d');
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const barWidth = canvasWidth / frameData.length;
      const gapWidth = 4; // Adjust the gap width as needed
      const centerY = canvasHeight / 2;

      // Clear the canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw bars expanding from the center
      frameData.forEach((value, index) => {
        const barHeight = (value / 255) * centerY; // Scale the height based on the value
        const x = index * (barWidth + gapWidth);
        const yTop = centerY - barHeight / 2;
        const yBottom = centerY + barHeight / 2;

        // Draw the bar from the middle outward without border radius
        ctx.fillStyle = `rgb(${value}, 0, 255)`; // Color based on frame value

        // Draw top rectangle
        ctx.fillRect(x, yTop, barWidth, barHeight);

        // Draw bottom rectangle
        ctx.fillRect(x, yBottom - barHeight, barWidth, barHeight);
      });
    };

    // Function to update frames and visualize the song
    const updateFrames = () => {
      analyser.getByteFrequencyData(dataArray);
      setFrames([...dataArray]);
      setCurrentFrame(JSON.stringify(dataArray, null, 2));

      // Draw bars expanding from the center
      drawBars(dataArray);

      requestAnimationFrame(updateFrames);
    };

    // Start playing the song and initiate frame update
    sourceRef.current.start(0);
    updateFrames();

    setIsPlaying(true);
  };

  // Cleanup function to clear the canvas when the component unmounts
  useEffect(() => {
    return () => {
      const canvas = document.getElementById('visualizerCanvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // If the song is playing and source is defined, stop it and close the audio context
      if (isPlaying && sourceRef.current) {
        sourceRef.current.stop();
        if (
          audioContextRef.current &&
          audioContextRef.current.state !== 'closed'
        ) {
          audioContextRef.current.close();
        }
        setIsPlaying(false);
      }
    };
  }, [isPlaying]);

  return (
    <card>
      <h1>It's the new</h1>
      <button onClick={() => togglePlay()}>
        {isPlaying ? 'Stop' : 'Start'}
      </button>
      <div>{/* <pre>{currentFrame}</pre> */}</div>
      <canvas id="visualizerCanvas" width="600" height="400"></canvas>
    </card>
  );
};

export default ItsTheNew;
