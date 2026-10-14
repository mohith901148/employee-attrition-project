import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import StandaloneSurveyPage from './components/StandaloneSurveyPage.jsx'

function RootRouter() {
  const [route, setRoute] = useState(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    return hash.startsWith('#/survey') || path.endsWith('/survey') ? 'survey' : 'app';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (hash.startsWith('#/survey') || path.endsWith('/survey')) {
        setRoute('survey');
      } else {
        setRoute('app');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  if (route === 'survey') {
    return <StandaloneSurveyPage />;
  }

  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>,
)

