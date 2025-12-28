import React from 'react'
import { Outlet } from 'react-router-dom'
import MobileNav from './MobileNav'

const AppLayout: React.FC = () => {
  return (
    <>
      <Outlet />
      <MobileNav />
    </>
  )
}

export default AppLayout
