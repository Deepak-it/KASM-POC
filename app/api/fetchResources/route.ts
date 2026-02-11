import { NextResponse } from "next/server";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

export async function GET(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  const url = new URL(req.url);
  const region = (url.searchParams.get('region') || process.env.AWS_REGION_ENV)
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const email = session.user.email;

  const ec2 = new EC2Client({ region });
  const ssm = new SSMClient({ region });

  const command = new DescribeInstancesCommand({
    Filters: [
      {
        Name: "tag:CreatedBy",
        Values: [email],
      },
    ],
  });

  const response = await ec2.send(command);

  const instances =
    response.Reservations?.flatMap((r) => r.Instances ?? []) ?? [];

  const formattedInstances = await Promise.all(
    instances.map(async (instance) => {
      const tags = instance.Tags || [];

      const pocId =
        tags.find((t) => t.Key === "pocId")?.Value || "";

      let kasmPassword = null;

      if (pocId) {
        try {
          const param = await ssm.send(
            new GetParameterCommand({
              Name: `/kasm/${pocId}/password`,
              WithDecryption: true,
            })
          );

          kasmPassword = param.Parameter?.Value || null;
        } catch (err) {
          console.error(`Failed to fetch password for ${pocId}`);
        }
      }

      return {
        ...instance,
        kasmPassword, 
      };
    })
  );

  return NextResponse.json({
    success: true,
    instances: formattedInstances,
  });
}