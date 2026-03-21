import { Card } from '@/components/ui/Card'

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-6">
        <div className="text-lg font-semibold text-text-primary">Política de privacidad</div>
        <div className="mt-2 text-sm text-text-secondary">
          Esta política describe cómo Brilla Eso recopila y utiliza información para gestionar cotizaciones, pedidos y soporte.
        </div>

        <div className="mt-6 grid gap-5 text-sm text-text-secondary">
          <section>
            <div className="text-sm font-semibold text-text-primary">1. Datos que recopilamos</div>
            <div className="mt-2">
              Podemos recopilar: email de contacto, número de teléfono, especificaciones del pedido (medidas, texto, estilo), imágenes de referencia
              aportadas por el cliente y datos operativos relacionados con el pago y seguimiento del pedido.
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-text-primary">2. Para qué usamos la información</div>
            <div className="mt-2">
              Usamos la información para: cotizar y producir tu pedido, comunicarnos sobre cambios de estado, brindar soporte y mejorar la experiencia dentro
              del sitio.
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-text-primary">3. Almacenamiento y proveedores</div>
            <div className="mt-2">
              Utilizamos servicios de terceros para operar el sitio (por ejemplo, almacenamiento y base de datos). Estos servicios procesan datos
              únicamente para proveer la funcionalidad del producto.
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-text-primary">4. Conservación de contenido multimedia</div>
            <div className="mt-2">
              Las imágenes de referencia y aproximación se conservan mientras son necesarias para producir y gestionar el pedido. Al finalizar el pedido,
              podemos eliminar automáticamente este contenido.
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-text-primary">5. Tus derechos</div>
            <div className="mt-2">Podés solicitar acceso, actualización o eliminación de tus datos escribiendo a nuestro contacto.</div>
          </section>

          <section>
            <div className="text-sm font-semibold text-text-primary">6. Contacto</div>
            <div className="mt-2">
              Para consultas de privacidad podés escribir a <a href="mailto:brillaesoneon@gmail.com">brillaesoneon@gmail.com</a>.
            </div>
          </section>
        </div>
      </Card>
    </div>
  )
}
