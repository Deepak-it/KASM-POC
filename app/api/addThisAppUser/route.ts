import { NextResponse } from 'next/server'
import {
  SSMClient,
  GetParameterCommand,
  PutParameterCommand,
} from '@aws-sdk/client-ssm'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email required' },
        { status: 400 }
      )
    }

    const ssm = new SSMClient({
      region: process.env.AWS_REGION_ENV,
    })

    const PARAM_NAME = process.env.ALLOWED_CREATORS_PARAM

    let existingUsers: string[] = []

    try {
      const param = await ssm.send(
        new GetParameterCommand({ Name: PARAM_NAME })
      )

      existingUsers = JSON.parse(param.Parameter?.Value || '[]')
    } catch (err: any) {
      if (err.name !== 'ParameterNotFound') {
        throw err
      }
    }

    if (existingUsers.includes(email)) {
      return NextResponse.json({
        success: true,
        message: 'creator already exists',
      })
    }

    const updatedUsers = [...existingUsers, email]

    await ssm.send(
      new PutParameterCommand({
        Name: PARAM_NAME,
        Value: JSON.stringify(updatedUsers),
        Type: 'String', // can use SecureString if you prefer
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
      { success: false, error: 'Failed to add creator' },
      { status: 500 }
    )
  }
}