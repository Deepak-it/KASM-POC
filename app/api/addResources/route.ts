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
      aws_region = process.env.AWS_REGION
    } = body;

    const client = new EC2Client({ region: aws_region || 'ap-south-1' });

    // 🚀 Cloud-init script for Kasm Workspaces with swap, Docker, Docker Compose
    const kasmUserData = installKasm
      ? Buffer.from(`#!/bin/bash
LOG=/var/log/kasm-install.log
exec > >(tee -a $LOG) 2>&1

echo "==== Kasm 1.18.1 automated installation started ===="

# 0️⃣ Update system
apt update -y && apt upgrade -y

# 1️⃣ Create swap (8GB) for stability
if ! swapon --show | grep -q '/swapfile'; then
  echo "Creating 8GB swap file..."
  fallocate -l 8G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 2️⃣ Install required packages
apt install -y apt-transport-https ca-certificates curl software-properties-common lsb-release gnupg

# 3️⃣ Install Docker (>=25) from official repo
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt update -y
apt install -y docker-ce docker-ce-cli containerd.io

# Enable Docker service
systemctl enable docker
systemctl start docker

# 4️⃣ Install Docker Compose (>=2.40)
DOCKER_COMPOSE_VERSION=2.40.2
curl -SL "https://github.com/docker/compose/releases/download/v${process.env.DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose || true

# 5️⃣ Ensure required storage (Kasm default: /var/lib/docker >= 75GB)
ROOT_DISK_SIZE=$(df -BG / | tail -1 | awk '{print $2}' | sed 's/G//')
if [ "$ROOT_DISK_SIZE" -lt 75 ]; then
  echo "WARNING: Root disk size is less than 75GB. Kasm installation may fail."
fi

# 6️⃣ Change to tmp directory and download Kasm
cd /tmp
curl -O https://kasm-static-content.s3.amazonaws.com/kasm_release_1.18.1.tar.gz
tar -xf kasm_release_1.18.1.tar.gz

# 7️⃣ Run Kasm installer unattended
export KASM_EULA=accept
export KASM_SWAP_AUTO=true
bash kasm_release/install.sh --accept-eula --swap-size 8192

# 8️⃣ Ensure Kasm service starts
systemctl enable kasm
systemctl start kasm

echo "==== Kasm installation completed successfully ===="
`).toString('base64')
      : undefined;

    const command = new RunInstancesCommand({
      ImageId,
      InstanceType,
      MinCount,
      MaxCount,
      KeyName: 'windows-keys', // your existing key
      SecurityGroupIds,
      SubnetId,
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/sda1',
          Ebs: {
            VolumeSize: 100, // ensure enough disk space for Kasm and Docker
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
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create EC2 instance',
      },
      { status: 500 }
    );
  }
}
