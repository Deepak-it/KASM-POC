import { NextResponse } from 'next/server';
import { EC2Client, RunInstancesCommand } from '@aws-sdk/client-ec2';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      pocName,
      ImageId = process.env.EC2_IMAGE_ID,
      InstanceType = process.env.EC2_INSTANCE_TYPE,
      SecurityGroupIds,
      SubnetId,
      MinCount = 1,
      MaxCount = 1,
      aws_region = process.env.AWS_REGION
    } = body;

    // 🔐 Check AWS credentials
    if (
      !process.env.AWS_ACCESS_KEY_ID_ENV ||
      !process.env.AWS_SECRET_ACCESS_KEY_ENV
    ) {
      return NextResponse.json(
        { success: false, error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    const client = new EC2Client({
      region: aws_region,
    });

    const command = new RunInstancesCommand({
      ImageId,
      InstanceType,
      MinCount,
      MaxCount,

      // 🔑 Use Windows key pair
      KeyName: 'windows-keys',

      // 🌐 Network
      SecurityGroupIds,
      SubnetId,

      // 💾 Root disk size → 50 GB
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/sda1',
          Ebs: {
            VolumeSize: 50,        // ✅ 50 GB
            VolumeType: 'gp3',
            DeleteOnTermination: true,
          },
        },
      ],

      // 🧑‍💼 IAM Instance Profile (Advanced Details)
      IamInstanceProfile: {
        Name: 'ssmecn', // must already exist
      },

      // 🏷️ Tags
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            { Key: 'Name', Value: pocName || 'Default Kasm POC' },
            { Key: 'Project', Value: pocName || 'Default Kasm POC' },
            { Key: 'Owner', Value: 'Puneet Bunet' },
          ],
        },
      ],
    });

    const response = await client.send(command);

    const instances =
      response.Instances?.map(instance => ({
        InstanceId: instance.InstanceId,
        InstanceType: instance.InstanceType,
        State: instance.State?.Name,
        PublicIpAddress: instance.PublicIpAddress,
        PrivateIpAddress: instance.PrivateIpAddress,
        LaunchTime: instance.LaunchTime,
      })) || [];

    return NextResponse.json({
      success: true,
      instances,
      totalCount: instances.length,
    });
  } catch (error) {
    console.error('Error creating EC2 instance:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create EC2 instance',
      },
      { status: 500 }
    );
  }
}
