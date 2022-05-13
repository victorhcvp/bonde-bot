import type { NextApiRequest, NextApiResponse } from 'next'
import nacl from 'tweetnacl'
import { buffer } from 'micro'

type DiscordRequest = {
  type: number;
  token: string;
  member: {
    user: {
      id: string;
      username: string;
    },
    nick: string | undefined;
  },
  data: {
    options: {
      name: string;
      value: string;
    }[],
    name: string;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const rawBody = (await buffer(req)).toString()

  if(!rawBody) {
    return res.status(401).end('invalid request signature');
  }

  const data = JSON.parse(rawBody)

  console.log(req.headers)

  const signature = req.headers['x-signature-ed25519']?.toString()
  const timestamp = req.headers['x-signature-timestamp']

  console.log(rawBody)
  console.log(data)
  console.log(signature)
  console.log(timestamp)

  if(!signature || !process.env.PUBLIC_API_KEY) {
    return res.status(401).end('invalid request signature');
  }

  try {
    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, 'hex'),
      Buffer.from(process.env.PUBLIC_API_KEY, 'hex')
    )

    if(!isVerified) {
      return res.status(401).end('invalid request signature');
    }
  } catch (err) {
    return res.status(401).end('invalid request signature');
  }

  if(data.member) {
    const nick = data.member.nick;
    const nickLol = data.data.options[0].value;
    return res.status(200).json({ nick, nickLol })
  }

  return res.status(200).json({type: 1});
}

export const config = {
  api: {
    bodyParser: false,
  },
}