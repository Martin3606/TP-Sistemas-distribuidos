package com.rentar.backendgraphql.config;

public class UserAuth {
    private final Integer userId;
    private final String email;
    private final String rol;
    private final Integer clienteId;

    public UserAuth(Integer userId, String email, String rol, Integer clienteId) {
        this.userId = userId;
        this.email = email;
        this.rol = rol;
        this.clienteId = clienteId;
    }

    public Integer getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getRol() {
        return rol;
    }

    public Integer getClienteId() {
        return clienteId;
    }

    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(rol);
    }

    public boolean isCliente() {
        return "CLIENTE".equalsIgnoreCase(rol);
    }
}
