import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/routing/RequireAuth'
import { RequireAdmin } from '@/components/routing/RequireAdmin'

import Home from '@/pages/Home'
import WorkDetail from '@/pages/WorkDetail'
import Customize from '@/pages/Customize'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import MyOrders from '@/pages/MyOrders'
import MyOrderDetail from '@/pages/MyOrderDetail'
import PaymentResult from '@/pages/PaymentResult'
import Terms from '@/pages/Terms'
import Privacy from '@/pages/Privacy'
import AdminShell from '@/pages/admin/AdminShell'
import AdminHome from '@/pages/admin/AdminHome'
import AdminQuotes from '@/pages/admin/AdminQuotes'
import AdminOrders from '@/pages/admin/AdminOrders'
import AdminGallery from '@/pages/admin/AdminGallery'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/trabajos/:id" element={<WorkDetail />} />
          <Route path="/personalizar" element={<Customize />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/pago/mercadopago" element={<PaymentResult />} />
          <Route path="/terminos" element={<Terms />} />
          <Route path="/privacidad" element={<Privacy />} />

          <Route element={<RequireAuth />}>
            <Route path="/mis-pedidos" element={<MyOrders />} />
            <Route path="/mis-pedidos/:id" element={<MyOrderDetail />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          <Route element={<AdminShell />}>
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/cotizaciones" element={<AdminQuotes />} />
            <Route path="/admin/pedidos" element={<AdminOrders />} />
            <Route path="/admin/galeria" element={<AdminGallery />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
