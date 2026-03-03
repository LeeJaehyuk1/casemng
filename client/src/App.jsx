import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import MainLayout from './components/MainLayout'
import CaseManagement from './pages/CaseManagement'
import NetworkManagement from './pages/NetworkManagement'
import ProgramManagement from './pages/ProgramManagement'
import AdminPage from './pages/Admin'
import Stats from './pages/Stats'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/cases" replace />} />
          <Route path="cases" element={<CaseManagement />} />
          <Route path="network" element={<NetworkManagement />} />
          <Route path="programs" element={<ProgramManagement />} />
          <Route path="stats" element={<Stats />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
