import { Link } from 'react-router-dom'
import { Instagram } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="container py-8 text-sm text-text-secondary">
        <div className="flex flex-col gap-6">
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
          
          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-secondary/60">
            <p>
              Desarrollado por{' '}
              <a 
                href="https://instagram.com/valen.fndz" 
                target="_blank" 
                rel="noreferrer"
                className="hover:text-text-secondary transition-colors"
              >
                @valen.fndz
              </a>
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="mailto:valentinfernandez2006@gmail.com"
                className="hover:text-text-secondary transition-colors"
              >
                valentinfernandez2006@gmail.com
              </a>
              <span>•</span>
              <a 
                href="https://wa.me/5493537300912" 
                target="_blank" 
                rel="noreferrer"
                className="hover:text-text-secondary transition-colors"
              >
                +54 9 3537 300-912
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
