export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="container py-8 text-sm text-text-secondary">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Brilla Eso</div>
          <div className="flex items-center gap-4">
            <a href="mailto:hola@brillaeso.com">hola@brillaeso.com</a>
            <a href="#">Términos</a>
            <a href="#">Privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

