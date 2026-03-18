import { useState } from 'react'
import Home from './pages/Home'
import About from './pages/About'

function App() {
  const [page, setPage] = useState('home')

  return (
    <>
      <nav className="navbar navbar-expand navbar-dark bg-dark px-3">
        <span className="navbar-brand">My Site</span>
        <div className="navbar-nav">
          <button
            className={`nav-link btn btn-link ${page === 'home' ? 'active' : ''}`}
            onClick={() => setPage('home')}
          >
            Home
          </button>
          <button
            className={`nav-link btn btn-link ${page === 'about' ? 'active' : ''}`}
            onClick={() => setPage('about')}
          >
            About
          </button>
        </div>
      </nav>

      {page === 'home' ? <Home /> : <About />}
    </>
  )
}

export default App
