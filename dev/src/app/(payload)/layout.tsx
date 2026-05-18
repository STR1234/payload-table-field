import '@payloadcms/next/css'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'
import React from 'react'

import config from '../../../payload.config'
import { importMap } from './admin/importMap.js'
import './custom.scss'

type Props = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async args => {
  'use server'

  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Props) => {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  )
}

export default Layout
