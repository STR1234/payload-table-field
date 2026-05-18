import type { Metadata } from 'next'

import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import config from '../../../../../payload.config'

import { importMap } from '../importMap.js'

type Props = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = ({ params, searchParams }: Props): Promise<Metadata> =>
  generatePageMetadata({
    config,
    params,
    searchParams,
  })

const Page = ({ params, searchParams }: Props) => {
  return RootPage({
    config,
    importMap,
    params,
    searchParams,
  })
}

export default Page
