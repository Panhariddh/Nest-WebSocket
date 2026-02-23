import * as dotenv from 'dotenv';
import { StringValue } from 'ms';

dotenv.config();

const jwtConstants = {
  access: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: '15m' as StringValue, // short life
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET as string,
    expiresIn: '7d' as StringValue, // long life
  },
};

export default jwtConstants;
