package com.rentar.backendgraphql.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;

@Component
public class JwtUtil {

    private static final String SECRET = "rentar_jwt_secret_key_1234567890_super_secret";
    private final Key key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    public UserAuth parseToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            Integer userId = claims.get("user_id", Integer.class);
            String email = claims.get("email", String.class);
            String rol = claims.get("rol", String.class);
            Integer clienteId = claims.get("cliente_id", Integer.class);

            return new UserAuth(userId, email, rol, clienteId);
        } catch (Exception e) {
            return null;
        }
    }
}
