package com.tmc.complaintmanager.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI civicConnectOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("CivicConnect API")
                        .description("Thane Municipal Corporation (TMC) Complaint Management System REST API")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("TMC CivicConnect Operations")
                                .email("support@tmc.gov.in")
                                .url("https://tmc.gov.in"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")));
    }
}
