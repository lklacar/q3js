package com.q3js.master.database.config;

import io.quarkus.flyway.FlywayConfigurationCustomizer;
import jakarta.enterprise.context.ApplicationScoped;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.flywaydb.database.postgresql.PostgreSQLConfigurationExtension;

@ApplicationScoped
public class FlywayConfiguration implements FlywayConfigurationCustomizer {

    @Override
    public void customize(FluentConfiguration configuration) {
        // Concurrent index builds must not wait on Flyway's own lock transaction.
        configuration.getConfigurationExtension(PostgreSQLConfigurationExtension.class)
                .setTransactionalLock(false);
    }
}
