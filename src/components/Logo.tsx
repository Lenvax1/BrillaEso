export function Logo({ size = 44 }: { size?: number }) {
  return (
    <div className="flex items-center">
      <img src="/images/Logo_chico.png" width={size} height={size} alt="Brilla Eso" className="rounded" />
    </div>
  )
}
