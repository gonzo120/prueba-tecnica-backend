import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global pipes
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Global interceptors
    app.useGlobalInterceptors(new LoggingInterceptor());

    // CORS
    app.enableCors();

    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 Payment Service running on port ${port}`);
}
bootstrap();