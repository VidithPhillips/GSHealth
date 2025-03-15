import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

// Components
import Header from './components/Header'
import MapView from './components/MapView'
import About from './components/About'
import Facilities from './components/Facilities'
import Analytics from './components/Analytics'

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f7f9fc',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 500,
    },
  },
});

function App() {
  const [selectedRegion, setSelectedRegion] = useState('Himachal Pradesh');
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app">
        <Header selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} />
        <main>
          <Routes>
            <Route path="/" element={<MapView selectedRegion={selectedRegion} />} />
            <Route path="/facilities" element={<Facilities selectedRegion={selectedRegion} />} />
            <Route path="/analytics" element={<Analytics selectedRegion={selectedRegion} />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App 