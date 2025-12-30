import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { ProjectProvider } from './context/ProjectProvider.jsx';
import { PaletteProvider } from './context/PaletteProvider.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotificationProvider>
      <ProjectProvider>
        <PaletteProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </PaletteProvider>
      </ProjectProvider>
    </NotificationProvider>
  </React.StrictMode>,
);
