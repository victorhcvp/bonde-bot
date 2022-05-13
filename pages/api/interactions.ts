import 'dotenv/config'
import type { NextApiRequest, NextApiResponse } from 'next'
import nacl from 'tweetnacl'
import axios from 'axios'
import { buffer } from 'micro'

type DiscordRequest = {
  application_id: string;
  channel_id: string;
  type: number;
  member: {
    user: {
      id: string;
      username: string;
    },
    nick: string | undefined;
  },
  data: {
    guild_id: string;
    id: string;
    options: {
      name: string;
      value: string;
    }[],
    name: string;
  }
}

type RiotData = {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  summonerLevel: number;
}

type LeagueData = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}[]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const rawBody = (await buffer(req)).toString()

  if(!rawBody) {
    return res.status(401).end('invalid request signature');
  }

  const data:DiscordRequest = JSON.parse(rawBody)

  console.log(req.headers)

  if(req.headers.host !== 'localhost:3000') {

    console.log('a');

    const signature = req.headers['x-signature-ed25519']?.toString()
    const timestamp = req.headers['x-signature-timestamp']

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

  }

  const riotUrl = 'https://br1.api.riotgames.com/lol';

  if(data.type != 1 && data.member && data.data.options) {
    const nick = data.member.nick;
    const nickLol = data.data.options[0].value;

    const riotRes = await axios.get(`${riotUrl}/summoner/v4/summoners/by-name/${nickLol}`, {
      headers: {
        'X-Riot-Token': process.env.RIOT_API_KEY || ''
      }
    })

    const riotData:RiotData = riotRes.data;
    const accountId = riotData.id;

    const leagueRes = await axios.get(`${riotUrl}/league/v4/entries/by-summoner/${accountId}`, {
      headers: {
        'X-Riot-Token': process.env.RIOT_API_KEY || ''
      }
    })

    const leagueData:LeagueData = leagueRes.data;

    let message = `${nick}, aqui vão as informações sobre **${nickLol}**\n`;

    if(leagueData.length > 0) {
      leagueData.forEach((league) => {
        const winRate = ((league.wins / (league.wins + league.losses)) * 100).toFixed(2);

        message += `\`\`\``;
        message += `Queue: ${league.queueType.replace(/[_]+/g, ' ')}\n`;
        message += `Elo: ${league.tier} ${league.rank} | ${league.leaguePoints} LP\n`;
        message += `Wins: ${league.wins} | Losses: ${league.losses} | Win Rate: ${winRate}%\n`;
        message += `Veteran: ${league.veteran} | Inactive: ${league.inactive} | Hot Streak: ${league.hotStreak} | Fresh Blood: ${league.freshBlood}`;
        message += `\`\`\` \n`;
      });
    }
    else {
      message = `${nick}, a conta **${nickLol}** não jogou nenhuma ranked até agora.`;
    }

    return res.status(200).json({ 
      type: 4,
      data: {
        "content": message,
      }
     });
  }

  if(data.type == 1) {
    return res.status(200).json({type: 1});
  }

  return res.status(201);
}

export const config = {
  api: {
    bodyParser: false,
  },
}