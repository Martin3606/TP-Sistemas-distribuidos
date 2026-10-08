package com.rentar.backendgraphql.config;

import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Collections;

@Component
public class GraphQLAuthInterceptor implements WebGraphQlInterceptor {

    private final JwtUtil jwtUtil;

    public GraphQLAuthInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Mono<WebGraphQlResponse> intercept(WebGraphQlRequest request, Chain chain) {
        String authHeader = request.getHeaders().getFirst("Authorization");
        UserAuth userAuth = jwtUtil.parseToken(authHeader);

        if (userAuth != null) {
            request.configureExecutionInput((executionInput, builder) ->
                    builder.graphQLContext(Collections.singletonMap("userAuth", userAuth)).build()
            );
        }

        return chain.next(request);
    }
}
