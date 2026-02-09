import { NextResponse } from "next/server";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

export async function GET() {
  const session: any = await getServerSession(authOptions as any);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const email = session.user.email;

  const client = new EC2Client({
    region: process.env.AWS_REGION_ENV || "ap-south-1",
  });

  const command = new DescribeInstancesCommand({
    Filters: [
      {
        Name: "tag:CreatedBy",
        Values: [email],
      },
    ],
  });

  const response = await client.send(command);

  return NextResponse.json({
    success: true,
    instances:
      response.Reservations?.flatMap(r => r.Instances ?? []) ?? [],
  });
}
