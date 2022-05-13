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

type Data = {
  nick: string;
  nickLol: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const rawBody = (await buffer(req)).toString()
  const data = JSON.parse(rawBody)
  const signature = req.headers['x-kc-signature']?.toString()
  const timestamp = req.headers['X-Signature-Timestamp']?.toString()

  if(!signature || !process.env.PUBLIC_API_KEY) {
    return res.status(401).end('invalid request signature');
  }

  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + rawBody),
    Buffer.from(signature, 'hex'),
    Buffer.from(process.env.PUBLIC_API_KEY, 'hex')
  )

  if(!isVerified) {
    return res.status(401).end('invalid request signature');
  }

  const nick = data.member.nick;
  const nickLol = data.data.options[0].value;

  return res.status(200).json({ nick, nickLol })
}

export const config = {
  api: {
    bodyParser: false,
  },
}