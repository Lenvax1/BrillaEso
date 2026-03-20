import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function AppShell() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}