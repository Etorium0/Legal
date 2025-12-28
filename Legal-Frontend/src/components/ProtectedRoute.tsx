import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => 
{
  const { tokens, loading } = useAuth()

  console.log('ProtectedRoute:', { loading, hasTokens: !!tokens });

  if (loading) 
  {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3">Đang tải...</span>
      </div>
    )
  }
  if (!tokens) 
{
    console.log('ProtectedRoute: No tokens, BUT BYPASSING for DEBUG');
    // return <Navigate to="/login" replace />
  }
  console.log('ProtectedRoute: Access granted (Bypassed)');
  return children
}

export default ProtectedRoute
