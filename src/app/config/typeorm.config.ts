// ===========================================================================>> Core Library
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// ===========================================================================>> Third Party Library
import * as dotenv from 'dotenv';

dotenv.config();

/** @Postgresql */
const typeOrmConfig: TypeOrmModuleOptions = {
    type: process.env.DB_CONNECTION as 'postgres' || 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [__dirname + '/../**/*.model{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: false,
    extra: {
        timezone: process.env.DB_TIMEZONE || 'Asia/Phnom_Penh',
    },
};

export default typeOrmConfig;