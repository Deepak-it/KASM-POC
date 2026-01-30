import { NextResponse } from 'next/server';
import { EC2Client, RunInstancesCommand } from '@aws-sdk/client-ec2';

export async function POST(req: Request) {
  try {
    const body = await req.json();

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
    } = body;

    const client = new EC2Client({ region: aws_region });
    const HOSTED_ZONE_ID=process.env.ROUTE_53_HOSTED_ZONE_ID
const kasmUserData = installKasm
  ? Buffer.from(`#!/bin/bash
LOG=/var/log/kasm-install.log
exec > >(tee -a $LOG) 2>&1
set -e

echo "==== Kasm Full Auto Setup Started ===="

# ---------------- CONFIG ----------------
SUBDOMAIN="ss09"
BASE_DOMAIN="poc.saas.prezm.com"
DOMAIN="$SUBDOMAIN.$BASE_DOMAIN"
REGION="ap-south-1"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID}"

# ---------------- SYSTEM UPDATE ----------------
apt update -y && apt upgrade -y

# ---------------- SWAP (8GB) ----------------
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 8G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------------- PACKAGES ----------------
apt install -y curl unzip jq certbot awscli docker.io dnsutils

systemctl enable docker
systemctl start docker

# ---------------- DOCKER COMPOSE ----------------
DOCKER_COMPOSE_VERSION=2.40.2
curl -SL "https://github.com/docker/compose/releases/download/v$DOCKER_COMPOSE_VERSION/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# ---------------- INSTALL KASM ----------------
cd /tmp
curl -O https://kasm-static-content.s3.amazonaws.com/kasm_release_1.18.1.tar.gz
tar -xf kasm_release_1.18.1.tar.gz

export KASM_EULA=accept
bash kasm_release/install.sh --accept-eula --swap-size 8192

echo "Waiting for Kasm containers..."
sleep 60

# ---------------- ELASTIC IP (REUSE SAFE) ----------------
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)

ALLOC_ID=$(aws ec2 describe-addresses \
  --filters Name=instance-id,Values="$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Addresses[0].AllocationId' \
  --output text)

if [ "$ALLOC_ID" = "None" ] || [ -z "$ALLOC_ID" ]; then
  echo "Allocating new Elastic IP..."
  ALLOC_ID=$(aws ec2 allocate-address \
    --domain vpc \
    --region "$REGION" \
    --query AllocationId \
    --output text)

  aws ec2 associate-address \
    --instance-id "$INSTANCE_ID" \
    --allocation-id "$ALLOC_ID" \
    --region "$REGION"
else
  echo "Reusing existing Elastic IP"
fi

PUBLIC_IP=$(aws ec2 describe-addresses \
  --allocation-ids "$ALLOC_ID" \
  --region "$REGION" \
  --query 'Addresses[0].PublicIp' \
  --output text)

echo "Elastic IP = $PUBLIC_IP"

# ---------------- ROUTE53 DNS ----------------
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
        "ResourceRecords": [
          { "Value": "$PUBLIC_IP" }
        ]
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch file:///tmp/route53.json

echo "DNS updated: $DOMAIN -> $PUBLIC_IP"

# ---------------- WAIT FOR DNS ----------------
echo "Waiting for DNS propagation..."
for i in {1..30}; do
  if dig +short "$DOMAIN" | grep -q "$PUBLIC_IP"; then
    echo "DNS propagated successfully"
    break
  fi
  sleep 10
done

# ---------------- SSL ----------------
echo "Stopping Kasm proxy for Certbot..."
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

echo "Restarting Kasm proxy..."
docker start kasm_proxy

echo "==== Kasm + DNS + SSL FULLY CONFIGURED ===="
`).toString("base64")
  : undefined;


    const command = new RunInstancesCommand({
      ImageId,
      InstanceType,
      MinCount,
      MaxCount,
      KeyName: 'windows-keys',
      SecurityGroupIds,
      SubnetId,
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
      IamInstanceProfile: { Name: 'Api_tasks' },
      UserData: kasmUserData,
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            { Key: 'Name', Value: pocName },
            { Key: 'Project', Value: pocName || 'Kasm POC' },
            { Key: 'Owner', Value: 'Puneet Bunet' },
          ],
        },
      ],
    });

    const response = await client.send(command);

    const instances =
      response.Instances?.map(i => ({
        InstanceId: i.InstanceId,
        State: i.State?.Name,
        PublicIpAddress: i.PublicIpAddress,
        PrivateIpAddress: i.PrivateIpAddress,
        LaunchTime: i.LaunchTime,
      })) || [];

    return NextResponse.json({
      success: true,
      installingKasm: installKasm,
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
