import { NextResponse } from 'next/server';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';

export async function GET() {
  try {
    // Check if AWS credentials are available
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
      region: process.env.AWS_REGION || "us-east-2",
    });

    // Fetch EC2 instances
    const command = new DescribeInstancesCommand({});
    const response = await client.send(command);

    // Format the response
    const instances = response.Reservations?.flatMap(reservation =>
      reservation.Instances?.map(instance => ({
        InstanceId: instance.InstanceId,
        InstanceType: instance.InstanceType,
        State: instance.State?.Name,
        PublicIpAddress: instance.PublicIpAddress,
        PrivateIpAddress: instance.PrivateIpAddress,
        LaunchTime: instance.LaunchTime,
        Tags: instance.Tags?.reduce((acc, tag) => {
          if (tag.Key && tag.Value) {
            acc[tag.Key] = tag.Value;
          }
          return acc;
        }, {} as Record<string, string>),
      }))
    ) || [];

    return NextResponse.json({
      success: true,
      instances,
      totalCount: instances.length,
    });
  } catch (error) {
    console.error('Error fetching EC2 instances:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch EC2 instances',
      },
      { status: 500 }
    );
  }
}