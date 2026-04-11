import { Card } from '@/components/ui/Card'
import { Seo } from '@/components/Seo'

export default function Terms() {
  return (
    <>
      <Seo
        title="Términos y condiciones"
        description="Términos y condiciones de Brilla Eso para productos personalizados."
        canonicalPath="/terminos"
      />
      <div className="mx-auto max-w-3xl">
        <Card className="p-6">
          <div className="text-lg font-semibold text-text-primary">Términos y condiciones</div>
          <div className="mt-2 text-sm text-text-secondary">
            Estos términos regulan el uso del sitio y la contratación de productos personalizados de Brilla Eso.
          </div>

        <div className="mt-6 grid gap-5 text-sm text-text-secondary">
          <section>
            <div className="text-sm font-semibold text-text-primary">1. Productos personalizados</div>
            <div className="mt-2">
              Los trabajos se realizan a medida según la información proporcionada por el cliente (medidas, texto, colores, estilo y referencias). El
              resultado final puede variar levemente respecto a las imágenes de referencia por diferencias de materiales, iluminación y representación en
              pantalla.
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-text-primary">2. Cotizaciones y aceptación</div>
            <div className="mt-2">
              Las cotizaciones tienen validez limitada y pueden actualizarse. La aceptación de la cotización implica conformidad con el alcance informado y
              habilita el inicio del proceso de producción.
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-text-primary">3. Pagos</div>
            <div className="mt-2">
              Podés abonar por los medios disponibles en el sitio. En caso de transferencia, podremos solicitar datos mínimos para identificar la operación
              (por ejemplo, titular y/o últimos 4 del número de operación).
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-text-primary">4. Producción, plazos y entregas</div>
            <div className="mt-2">
              Los plazos son estimados y dependen de la complejidad del trabajo, disponibilidad de insumos y logística. Te informaremos actualizaciones a
              través de la sección “Mis pedidos” y notificaciones.
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-text-primary">5. Cambios y cancelaciones</div>
            <div className="mt-2">
              Una vez iniciado el proceso de producción, las modificaciones pueden no ser posibles. Las cancelaciones y reembolsos, si correspondieran, se
              evaluarán según el estado del trabajo.
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-text-primary">6. Contacto</div>
            <div className="mt-2">
              Para consultas o soporte podés escribir a <a href="mailto:brillaesoneon@gmail.com">brillaesoneon@gmail.com</a>.
            </div>
          </section>
        </div>
        </Card>
      </div>
    </>
  )
}
