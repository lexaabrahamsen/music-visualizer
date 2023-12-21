import './App.css';
import React from 'react';
import ItsTheNew from './ItsTheNew';

function App() {
  return (
    <div className="App"
    style={{
      backgroundImage: `url(../MusicVizualizerHomepage.jpg)`,
      alignItems: 'center',
      justifyContent: 'center',
    }}
    >
      <h1>React App</h1>
      <ItsTheNew />
    </div>
  );
}

export default App;
