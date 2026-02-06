import { NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  EC2Client,
  RunInstancesCommand,
} from '@aws-sdk/client-ec2'
import {
  SSMClient,
  PutParameterCommand,
  GetParameterCommand,
} from '@aws-sdk/client-ssm'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const session: any = await getServerSession(authOptions as any)

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const createdByUserId = session?.user?.email
    const {
      pocName,
      installKasm = true,
      ImageId = process.env.EC2_IMAGE_ID,
      InstanceType = process.env.EC2_INSTANCE_TYPE || 't3.large',
      SecurityGroupIds,
      SubnetId,
      MinCount = 1,
      MaxCount = 1,
      aws_region = process.env.AWS_REGION || 'ap-south-1',
    } = body

    if (!pocName || !createdByUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'pocName and createdByUserId are required',
        },
        { status: 400 }
      )
    }

    /* ================================
       SSM – POC COUNTER
    ================================= */
    const ssm = new SSMClient({ region: aws_region })
    const COUNTER_PARAM = '/kasm/KasmPocCounter'

    let nextCounter = 1

    try {
      const counterRes = await ssm.send(
        new GetParameterCommand({
          Name: COUNTER_PARAM,
        })
      )
      nextCounter = Number(counterRes.Parameter?.Value || '0') + 1
    } catch (err: any) {
      if (err.name !== 'ParameterNotFound') {
        throw err
      }
    }

    const pocId = `kasmPoc${nextCounter}`
    const createdDate = new Date().toISOString()

    /* ================================
       KASM CREDENTIALS
    ================================= */
    const kasmUsername = `admin_${pocId}`
    const kasmPassword = crypto
      .randomBytes(16)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 20)

    await ssm.send(
      new PutParameterCommand({
        Name: `/kasm/${pocId}/username`,
        Value: kasmUsername,
        Type: 'SecureString',
        Overwrite: true,
      })
    )

    await ssm.send(
      new PutParameterCommand({
        Name: `/kasm/${pocId}/password`,
        Value: kasmPassword,
        Type: 'SecureString',
        Overwrite: true,
      })
    )

    /* ================================
       USER DATA (KASM INSTALL)
    ================================= */
    const HOSTED_ZONE_ID = process.env.ROUTE_53_HOSTED_ZONE_ID

    const kasmUserData = installKasm
      ? Buffer.from(`#!/bin/bash
LOG=/var/log/kasm-install.log
exec > >(tee -a $LOG) 2>&1
set -e

echo "==== Kasm Full Auto Setup Started ===="

KASM_USER="${kasmUsername}"
KASM_PASS="${kasmPassword}"

SUBDOMAIN="${pocId}"
BASE_DOMAIN="poc.saas.prezm.com"
DOMAIN="$SUBDOMAIN.$BASE_DOMAIN"
REGION="ap-south-1"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID}"

apt update -y && apt upgrade -y

if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 8G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt install -y curl unzip jq certbot awscli docker.io dnsutils
systemctl enable docker
systemctl start docker

DOCKER_COMPOSE_VERSION=2.40.2
curl -SL "https://github.com/docker/compose/releases/download/v$DOCKER_COMPOSE_VERSION/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

cd /tmp
curl -O https://kasm-static-content.s3.amazonaws.com/kasm_release_1.18.1.tar.gz
tar -xf kasm_release_1.18.1.tar.gz

export KASM_EULA=accept
bash kasm_release/install.sh --accept-eula --swap-size 8192 --admin-password "$KASM_PASS"

sleep 60

INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)

ALLOC_ID=$(aws ec2 describe-addresses \
  --filters Name=instance-id,Values="$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Addresses[0].AllocationId' \
  --output text)

if [ "$ALLOC_ID" = "None" ] || [ -z "$ALLOC_ID" ]; then
  ALLOC_ID=$(aws ec2 allocate-address --domain vpc --region "$REGION" --query AllocationId --output text)
  aws ec2 associate-address --instance-id "$INSTANCE_ID" --allocation-id "$ALLOC_ID" --region "$REGION"
fi

PUBLIC_IP=$(aws ec2 describe-addresses \
  --allocation-ids "$ALLOC_ID" \
  --region "$REGION" \
  --query 'Addresses[0].PublicIp' \
  --output text)

cat >/tmp/route53.json <<EOF
{
  "Comment": "Auto update Kasm DNS",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$DOMAIN",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{ "Value": "$PUBLIC_IP" }]
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch file:///tmp/route53.json

docker stop kasm_proxy || true

certbot certonly --standalone \
  -d "$DOMAIN" \
  --agree-tos \
  --email admin@$BASE_DOMAIN \
  --non-interactive

KASM_CERT_DIR="/opt/kasm/current/certs"
CERTBOT_LIVE_DIR="/etc/letsencrypt/live/$DOMAIN"

cp "$CERTBOT_LIVE_DIR/fullchain.pem" "$KASM_CERT_DIR/kasm_nginx.crt"
cp "$CERTBOT_LIVE_DIR/privkey.pem" "$KASM_CERT_DIR/kasm_nginx.key"

docker start kasm_proxy

echo "==== Kasm + DNS + SSL FULLY CONFIGURED ===="
`).toString('base64')
      : undefined

    /* ================================
       EC2 RUN INSTANCE
    ================================= */
    const ec2 = new EC2Client({ region: aws_region })

    const command = new RunInstancesCommand({
      ImageId,
      InstanceType,
      MinCount,
      MaxCount,
      KeyName: 'windows-keys',
      SecurityGroupIds,
      SubnetId,
      IamInstanceProfile: { Name: 'Api_tasks' },
      UserData: kasmUserData,
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/sda1',
          Ebs: {
            VolumeSize: 100,
            VolumeType: 'gp3',
            DeleteOnTermination: true,
          },
        },
      ],
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            { Key: 'Name', Value: pocId },
            { Key: 'pocId', Value: pocId },
            { Key: 'Owner', Value: 'Puneet Bunet' },
            { Key: 'ClientName', Value: pocName },
            { Key: 'CreatedBy', Value: createdByUserId },
            { Key: 'CreatedDate', Value: createdDate },
          ],
        },
      ],
    })

    const response = await ec2.send(command)

    /* ================================
       UPDATE COUNTER (SUCCESS ONLY)
    ================================= */
    await ssm.send(
      new PutParameterCommand({
        Name: COUNTER_PARAM,
        Value: String(nextCounter),
        Type: 'String',
        Overwrite: true,
      })
    )

    const instances =
      response.Instances?.map(i => ({
        InstanceId: i.InstanceId,
        State: i.State?.Name,
        PublicIpAddress: i.PublicIpAddress,
        PrivateIpAddress: i.PrivateIpAddress,
        LaunchTime: i.LaunchTime,
      })) || []

    return NextResponse.json({
      success: true,
      pocId,
      pocName,
      createdBy: createdByUserId,
      createdDate,
      instances,
    })
  } catch (error) {
    console.error('Error creating EC2 instance:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create EC2 instance',
      },
      { status: 500 }
    )
  }
}