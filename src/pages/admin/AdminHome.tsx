import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'

export default function AdminHome() {
  return (
    <div className="grid gap-6">
      <div>
        <div className="text-lg font-semibold text-text-primary">Admin</div>
        <div className="mt-1 text-sm text-text-secondary">Gestioná cotizaciones, pedidos y la galería.</div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/admin/cotizaciones">
          <Card className="p-5 hover:bg-white/5">
            <div className="text-sm font-semibold text-text-primary">Cotizaciones</div>
            <div className="mt-2 text-sm text-text-secondary">Revisar solicitudes y presupuestar.</div>
          </Card>
        </Link>
        <Link to="/admin/pedidos">
          <Card className="p-5 hover:bg-white/5">
            <div className="text-sm font-semibold text-text-primary">Pedidos</div>
            <div className="mt-2 text-sm text-text-secondary">Actualizar estados operativos.</div>
          </Card>
        </Link>
        <Link to="/admin/galeria">
          <Card className="p-5 hover:bg-white/5">
            <div className="text-sm font-semibold text-text-primary">Galería</div>
            <div className="mt-2 text-sm text-text-secondary">Alta/edición/baja de trabajos e imágenes.</div>
          </Card>
        </Link>
      </div>
    </div>
  )
}

