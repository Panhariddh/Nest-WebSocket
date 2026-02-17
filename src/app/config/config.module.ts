// ===========================================================================>> Core Library
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ===========================================================================>> Custom Library
import typeOrmConfig from './typeorm.config';

/** @noded We use Global that allow all module can access and use all models */
@Global()
@Module({
    imports: [
        TypeOrmModule.forRoot(typeOrmConfig),
    ],
})
export class ConfigModule { }