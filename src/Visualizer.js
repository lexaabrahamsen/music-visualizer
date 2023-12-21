import React, { useRef, useEffect } from 'react';

function Visualizer() {
  const canvasRef = useRef(null),
    buttonRef = useRef(null);

  const audioVisualizerLogic = () => {
    const context = new (window.AudioContext || window.webkitAudioContext)(),
      source = context.createBufferSource();

    //fetch remote audio source
    fetch('https://jplayer.org/audio/mp3/RioMez-01-Sleep_together.mp3')
      .then((response) => response.arrayBuffer())
      .then((response) => {
        context.decodeAudioData(response, (buffer) => {
          source.buffer = buffer;
          source.connect(context.destination);
          // auto play
          source.start(0);
        });
      });

    const audio = new Audio(source),
      canvas = canvasRef.current,
      muteButton = buttonRef.current;

    //mute or play on click
    const mutePlay = () => {
      context.state === 'running' ? context.suspend() : context.resume();
    };
    muteButton.onclick = () => mutePlay();

    //config canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    //config audio analyzer
    const analyser = context.createAnalyser();
    source.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount,
      dataArray = new Uint8Array(bufferLength),
      WIDTH = canvas.width,
      HEIGHT = canvas.height,
      barWidth = (WIDTH / bufferLength) * 2.5;
    let barHeight = null,
      x = null;

    //core logic for the visualizer
    const timeouts = [];
    const renderFrame = () => {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      requestAnimationFrame(renderFrame);
      x = 0;
      analyser.getByteFrequencyData(dataArray);
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (let i = 0; i < bufferLength; i++) {
        //color based upon frequency
        barHeight = dataArray[i];
        let r = barHeight + 22 * (i / bufferLength),
          g = 333 * (i / bufferLength),
          b = 47;
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth + 1;

        //Allows visualizer to overlay on a background/video by clearing the rects after painting.
        let timer = setTimeout(() => {
          ctx.clearRect(0, 0, WIDTH, HEIGHT);
        }, 50);
        timeouts.push(timer);
      }
    };
    //Clears the accumulating timeouts.
    setTimeout(() => {
      for (let i = 0; i < timeouts.length; i++) {
        return clearTimeout(timeouts[i]);
      }
    }, 51);
    renderFrame();
  };

  //connect audio visualizer to DOM and execute logic
  useEffect(() => {
    audioVisualizerLogic();
  }, []);
  return (
    <div className="App">
      <header>
        <h1>React Audio Visualizer</h1>
      </header>
      <span>(Click page to start/stop)</span>
      <main>
        <button className="contextButton" ref={buttonRef}>
          <canvas ref={canvasRef} className="canvas"></canvas>
        </button>
      </main>
    </div>
  );
}

export default Visualizer;
