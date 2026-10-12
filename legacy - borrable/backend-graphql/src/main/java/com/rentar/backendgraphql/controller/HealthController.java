package com.rentar.backendgraphql.controller;

import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class HealthController {

    // Resuelve el campo "health" definido en schema.graphqls
    @QueryMapping
    public String health() {
        return "ok";
    }
}
