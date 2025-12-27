import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => 
{
  const { tokens, loading } = useAuth()

  if (loading) {return null}
  if (!tokens) {return <Navigate to="/login" replace />}
  return children
}

export default ProtectedRoute
