import { NextResponse } from 'next/server'
import {
  SSMClient,
  GetParameterCommand,
  PutParameterCommand,
} from '@aws-sdk/client-ssm'

const ssm = new SSMClient({
  region: process.env.AWS_REGION_ENV,
})

export async function DELETE(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      )
    }

    const paramName = process.env.ALLOWED_CREATORS_PARAM!

    const response = await ssm.send(
      new GetParameterCommand({
        Name: paramName,
        WithDecryption: true,
      })
    )

    let currentUsers = JSON.parse(response.Parameter?.Value || '[]')

    // 🔥 Handle old string[] data
    if (Array.isArray(currentUsers) && typeof currentUsers[0] === 'string') {
      currentUsers = currentUsers.map((email: string) => ({
        email,
        isAdmin: false,
      }))
    }

    const updatedUsers = currentUsers.filter(
      (u: any) => u.email !== email
    )

    await ssm.send(
      new PutParameterCommand({
        Name: paramName,
        Value: JSON.stringify(updatedUsers),
        Type: 'String',
        Overwrite: true,
      })
    )

    return NextResponse.json({
      success: true,
      users: updatedUsers,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete creator' },
      { status: 500 }
    )
  }
}