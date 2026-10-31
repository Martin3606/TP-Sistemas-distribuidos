package com.rentar.rentalservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class RentalServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(RentalServiceApplication.class, args);
    }

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Registramos el módulo JSR310 para que parsee sin problemas las fechas (LocalDateTime)
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }
}