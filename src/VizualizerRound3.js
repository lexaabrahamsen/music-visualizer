import React, { useEffect, useRef } from 'react';

const AudioVisualizer = () => {
  const GAP = 2;
  const containerRef = useRef(null); // Ref for the container element
  const WIDTH = containerRef.current?.clientWidth || 0; // Accessing width using ref

  useEffect(() => {
    start();

    // Cleanup on unmount
    return () => {
      // Add any cleanup logic if needed
    };
  }, []);

  function start() {
    // Create the Audio
    const song = new Audio('https://codehs.com/uploads/8179d3793582c02c44438d0160d6f0a5');

    // Play the song
    song.play();
    song.loop = true;

    // Visualize the song data
    audioChangeMethod(song, visualize);
  }

  function visualize(frame) {
    // Remove all the bars from the last point in the song
    removeAll();

    // Set the width of the bars
    const barWidth = (WIDTH - GAP) / frame.length - GAP;

    // Loop over the song data and make one bar for each index in the array
    for (let i = 0; i < frame.length; i++) {
      // Set the height of this bar to be the loudness at this index
      const barHeight = frame[i];

      // Make the bar
      const bar = new Rectangle(barWidth, barHeight);
      bar.setPosition(GAP + (barWidth + GAP) * i, (2 * getHeight()) / 3 - barHeight);

      /*
       * The color can be expressed as three values RGB for red, green, blue.
       * Set the red value to be the max possible value
       * Set the green value to be the max value minus how high the bar is
       * Set the blue value to be the same as the bar height
       * The result is a yellow bar that gets more pink the higher it is!
       */
      const color = new Color(255, 255 - barHeight, barHeight);
      bar.setColor(color);

      add(bar);
    }
  }

  return (
    <div ref={containerRef}>
      Audio Visualizer Component
      {/* You can render additional components or elements here */}
    </div>
  );
};

export default AudioVisualizer;
