import { NextResponse } from 'next/server'
import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  TerminateInstancesCommand,
  DescribeAddressesCommand,
  DisassociateAddressCommand,
  ReleaseAddressCommand,
} from '@aws-sdk/client-ec2'
import {
  Route53Client,
  ChangeResourceRecordSetsCommand,
} from '@aws-sdk/client-route-53'

const REGION = process.env.AWS_REGION_ENV
const HOSTED_ZONE_ID = process.env.ROUTE_53_HOSTED_ZONE_ID!

const ec2 = new EC2Client({ region: REGION })
const route53 = new Route53Client({ region: REGION })

export async function POST(req: Request) {
  try {
    const { instanceId, action, pocId } = await req.json()

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

    /* =========================
       START / STOP (unchanged)
    ========================== */
    if (action === 'start') {
      await ec2.send(
        new StartInstancesCommand({ InstanceIds: [instanceId] })
      )

      return NextResponse.json({ success: true, action, instanceId })
    }

    if (action === 'stop') {
      await ec2.send(
        new StopInstancesCommand({ InstanceIds: [instanceId] })
      )

      return NextResponse.json({ success: true, action, instanceId })
    }

    /* =========================
       TERMINATE (WITH CLEANUP)
    ========================== */
    if (action === 'terminate') {
      if (!pocId) {
        return NextResponse.json(
          { success: false, message: 'pocId is required for terminate' },
          { status: 400 }
        )
      }

      /* ---- 1. Find Elastic IP ---- */
      const addrRes = await ec2.send(
        new DescribeAddressesCommand({
          Filters: [{ Name: 'instance-id', Values: [instanceId] }],
        })
      )

      const eip = addrRes.Addresses?.[0]

      /* ---- 2. Delete Route53 A record ---- */
      if (eip?.PublicIp) {
        const DOMAIN = `${pocId}.poc.saas.prezm.com`

        await route53.send(
          new ChangeResourceRecordSetsCommand({
            HostedZoneId: HOSTED_ZONE_ID,
            ChangeBatch: {
              Changes: [
                {
                  Action: 'DELETE',
                  ResourceRecordSet: {
                    Name: DOMAIN,
                    Type: 'A',
                    TTL: 300,
                    ResourceRecords: [{ Value: eip.PublicIp }],
                  },
                },
              ],
            },
          })
        )
      }

      /* ---- 3. Disassociate EIP ---- */
      if (eip?.AssociationId) {
        await ec2.send(
          new DisassociateAddressCommand({
            AssociationId: eip.AssociationId,
          })
        )
      }

      /* ---- 4. Release EIP ---- */
      if (eip?.AllocationId) {
        await ec2.send(
          new ReleaseAddressCommand({
            AllocationId: eip.AllocationId,
          })
        )
      }

      /* ---- 5. Terminate instance ---- */
      await ec2.send(
        new TerminateInstancesCommand({
          InstanceIds: [instanceId],
        })
      )

      return NextResponse.json({
        success: true,
        action,
        instanceId,
        cleaned: {
          eipReleased: !!eip?.AllocationId,
          dnsDeleted: !!eip?.PublicIp,
        },
      })
    }
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