import { Link } from 'react-router-dom'
import { Instagram } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="container py-8 text-sm text-text-secondary">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div>© {new Date().getFullYear()} Brilla Eso</div>
            <a href="mailto:brillaesoneon@gmail.com">brillaesoneon@gmail.com</a>
            <a
              href="https://www.instagram.com/brillaeso/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="inline-flex items-center text-text-secondary hover:text-text-primary"
            >
              <Instagram className="h-6 w-6" />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/terminos">Términos</Link>
            <Link to="/privacidad">Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
