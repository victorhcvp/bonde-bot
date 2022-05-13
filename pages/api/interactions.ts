import type { NextApiRequest, NextApiResponse } from 'next'

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

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse<Data>
) {
  const data = request.body;

  const nick = data.member.nick;
  const nickLol = data.data.options[0].value;

  response.status(200).json({ nick, nickLol })
}
