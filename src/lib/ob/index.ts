import { Ordinalsbot } from 'ordinalsbot';

const ordinalsbotObj = new Ordinalsbot(process.env.ORDINALSBOT_API_KEY, 'signet');

export default ordinalsbotObj;