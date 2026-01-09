import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

interface ProtectedRouteProps {
  children: React.ReactElement
  requiredRole?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => 
{
  const { tokens, loading, user } = useAuth()

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
    // console.log('ProtectedRoute: No tokens, redirecting to login');
    return <Navigate to="/login" replace />
  }

  // Check role requirement
  if (requiredRole && user?.role !== requiredRole) 
{
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-red-500">
        <div className="text-center">
          <span className="text-xl font-bold block mb-2">Truy cập bị từ chối</span>
          <span className="text-gray-400">Yêu cầu quyền {requiredRole === 'admin' ? 'Quản trị viên' : requiredRole}</span>
        </div>
      </div>
    )
  }

  // console.log('ProtectedRoute: Access granted');
  return children
}

export default ProtectedRoute
