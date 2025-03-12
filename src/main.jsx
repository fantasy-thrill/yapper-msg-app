import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import chat from "./chatdata"

chat.init().then(
  () => {
    console.log("Initialization completed successfully");
  },
  error => {
    console.log("Initialization failed with error:", error);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
)
