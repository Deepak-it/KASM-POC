import { NextResponse } from 'next/server'
import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  TerminateInstancesCommand,
} from '@aws-sdk/client-ec2'

const ec2 = new EC2Client({
  region: process.env.AWS_REGION || 'ap-south-1',
})

export async function POST(req: Request) {
  try {
    const { instanceId, action } = await req.json()

    if (!instanceId || !action) {
      return NextResponse.json(
        { success: false, message: 'instanceId and action are required' },
        { status: 400 }
      )
    }

    if (!['start', 'stop', 'terminate'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      )
    }

    let command

    switch (action) {
      case 'start':
        command = new StartInstancesCommand({
          InstanceIds: [instanceId],
        })
        break

      case 'stop':
        command = new StopInstancesCommand({
          InstanceIds: [instanceId],
        })
        break

      case 'terminate':
        command = new TerminateInstancesCommand({
          InstanceIds: [instanceId],
        })
        break
    }

    const response = await ec2.send(command!)

    return NextResponse.json({
      success: true,
      action,
      instanceId,
      response,
    })
  } catch (error: any) {
    console.error('EC2 action error:', error)

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to perform action',
      },
      { status: 500 }
    )
  }
}
