import { NextResponse } from 'next/server';
import { EC2Client, RunInstancesCommand } from '@aws-sdk/client-ec2';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pocName, ImageId = process.env.EC2_IMAGE_ID, InstanceType = process.env.EC2_INSTANCE_TYPE, KeyName, SecurityGroupIds, SubnetId, MinCount = 1, MaxCount = 1 } = body;
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID_ENV || !process.env.AWS_SECRET_ACCESS_KEY_ENV) {
      return NextResponse.json(
        {
          success: false,
          error: 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.',
        },
        { status: 500 }
      );
    }

    const client = new EC2Client({
      region: process.env.AWS_REGION || 'ap-south-1',
    });

    const command = new RunInstancesCommand({
      ImageId,
      InstanceType,
      MinCount,
      MaxCount,
      KeyName,
      SecurityGroupIds,
      SubnetId,
      TagSpecifications: [
        {
          ResourceType: 'instance', // important: indicates this tag is for the EC2 instance
          Tags: [
            { Key: 'Name', Value: 'MyUbuntuInstance' }, // display name
            { Key: 'Project', Value: pocName || 'Default Kasm POC' },      // optional additional tags
            { Key: 'Owner', Value: 'Puneet Bunet' },          // optional
          ],
        },
      ],
    });

    const response = await client.send(command);

    const instances = response.Instances?.map(instance => ({
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
        error: error instanceof Error ? error.message : 'Failed to create EC2 instance',
      },
      { status: 500 }
    );
  }
}
