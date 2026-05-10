import path from 'path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL ?? "postgres://73bac8127c1081f6f55e7678b44a7ae75df1a574fdbf9894e2b0d2d955ae596b:sk_cN9-flT1LWxkBoAaA0Xi9@db.prisma.io:5432/postgres?sslmode=require",
  },
})
