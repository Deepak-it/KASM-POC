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

    const getCommand = new GetParameterCommand({
      Name: paramName,
      WithDecryption: true,
    })

    const response = await ssm.send(getCommand)
    const currentUsers = JSON.parse(response.Parameter?.Value || '[]')

    const updatedUsers = currentUsers.filter(
      (u: string) => u !== email
    )

    const putCommand = new PutParameterCommand({
      Name: paramName,
      Value: JSON.stringify(updatedUsers),
      Type: 'String',
      Overwrite: true,
    })

    await ssm.send(putCommand)

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