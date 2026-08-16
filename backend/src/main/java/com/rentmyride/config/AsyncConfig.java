package com.rentmyride.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * A small, dedicated thread pool for background work (currently: sending email/SMS/WhatsApp
 * notifications). Without this, @Async methods would run on Spring's default SimpleAsyncTaskExecutor,
 * which spawns a brand-new thread per call with no limit — fine for occasional use, but not
 * something to rely on under real load. Naming the pool ("notif-") also makes threads easy to
 * spot in a thread dump or logs.
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "notificationExecutor")
    public Executor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("notif-");
        executor.initialize();
        return executor;
    }
}
