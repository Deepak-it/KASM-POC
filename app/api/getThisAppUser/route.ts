// app/api/getAllowedCreators/route.ts

import { NextResponse } from 'next/server'
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'

const ssm = new SSMClient({
  region: process.env.AWS_REGION_ENV,
})

export async function GET() {
  try {
    const command = new GetParameterCommand({
      Name: process.env.ALLOWED_CREATORS_PARAM,
      WithDecryption: true,
    })

    const response = await ssm.send(command)

    const value = response.Parameter?.Value || '[]'
    const users = JSON.parse(value)

    return NextResponse.json({ users })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch allowed creators' },
      { status: 500 }
    )
  }
}