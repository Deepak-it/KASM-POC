import { NextResponse } from 'next/server'
import {
  SSMClient,
  GetParameterCommand,
  PutParameterCommand,
} from '@aws-sdk/client-ssm'

export async function POST(req: Request) {
  try {
    const { email, isAdmin } = await req.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email required' },
        { status: 400 }
      )
    }

    const ssm = new SSMClient({
      region: process.env.AWS_REGION_ENV,
    })

    const PARAM_NAME = process.env.ALLOWED_CREATORS_PARAM!

    let existingUsers: any[] = []

    try {
      const param = await ssm.send(
        new GetParameterCommand({ Name: PARAM_NAME })
      )

      const parsed = JSON.parse(param.Parameter?.Value || '[]')

      // 🔥 Backward compatibility (if old data was string[])
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
        existingUsers = parsed.map((email: string) => ({
          email,
          isAdmin: false,
        }))
      } else {
        existingUsers = parsed
      }

    } catch (err: any) {
      if (err.name !== 'ParameterNotFound') {
        throw err
      }
    }

    // ✅ Check duplicate
    const alreadyExists = existingUsers.some(
      (user: any) => user.email === email
    )

    if (alreadyExists) {
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        users: existingUsers,
      })
    }

    const updatedUsers = [
      ...existingUsers,
      {
        email,
        isAdmin: Boolean(isAdmin),
      },
    ]

    await ssm.send(
      new PutParameterCommand({
        Name: PARAM_NAME,
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
      { success: false, error: 'Failed to add creator' },
      { status: 500 }
    )
  }
}