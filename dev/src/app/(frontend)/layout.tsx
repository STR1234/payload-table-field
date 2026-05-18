import React from 'react'

type Props = {
  children: React.ReactNode
}

const Layout = ({ children }: Props) => {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

export default Layout
