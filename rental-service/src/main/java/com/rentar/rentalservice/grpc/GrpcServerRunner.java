package com.rentar.rentalservice.grpc;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/** Levanta el servidor gRPC junto con el contexto de Spring. */
@Component
public class GrpcServerRunner implements SmartLifecycle {

    private static final Logger log = LoggerFactory.getLogger(GrpcServerRunner.class);

    private final RentalGrpcService rentalService;
    private final int port;
    private Server server;
    private Thread keepAlive;
    private volatile boolean running = false;

    public GrpcServerRunner(RentalGrpcService rentalService, @Value("${grpc.port}") int port) {
        this.rentalService = rentalService;
        this.port = port;
    }

    @Override
    public void start() {
        try {
            server = ServerBuilder.forPort(port).addService(rentalService).build().start();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo iniciar el servidor gRPC en el puerto " + port, e);
        }
        running = true;
        log.info("[rental-service] gRPC escuchando en :{}", port);

        // Hilo NO daemon: mantiene viva la JVM (no hay servidor web).
        keepAlive = new Thread(() -> {
            try {
                server.awaitTermination();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "grpc-await");
        keepAlive.setDaemon(false);
        keepAlive.start();
    }

    @Override
    public void stop() {
        running = false;
        if (server != null) {
            server.shutdown();
            try {
                server.awaitTermination(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    @Override
    public boolean isRunning() {
        return running;
    }
}
