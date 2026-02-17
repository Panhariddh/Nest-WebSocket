import * as dotenv from 'dotenv';
dotenv.config();

const jwtConstants = {
    expiresIn: '1d',
    secret: process.env.JWT_SECRET as string,
};

export default jwtConstants;
