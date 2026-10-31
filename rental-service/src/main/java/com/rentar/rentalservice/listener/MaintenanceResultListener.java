package com.rentar.rentalservice.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rentar.rentalservice.model.Reserva;
import com.rentar.rentalservice.model.ResultadoMantenimiento;
import com.rentar.rentalservice.repository.ReservaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class MaintenanceResultListener {

    private static final Logger log = LoggerFactory.getLogger(MaintenanceResultListener.class);
    private final ReservaRepository reservaRepository;
    private final ObjectMapper objectMapper;

    public MaintenanceResultListener(ReservaRepository reservaRepository, ObjectMapper objectMapper) {
        this.reservaRepository = reservaRepository;
        this.objectMapper = objectMapper;
    }

    
    // ⚠️ ATENCIÓN: Reemplazá "rental.mantenimiento.queue" por el nombre exacto 
    // de la cola que definió tu compañero para que el Rental Service escuche este evento.
    @RabbitListener(queues = "q.rental.maintenance.result")
    @Transactional
    public void procesarResultadoMantenimiento(String mensajeJson) {
        try {
            JsonNode evento = objectMapper.readTree(mensajeJson);
            Integer reservaId = evento.get("reservaId").asInt();
            String resultadoStr = evento.get("resultado").asText(); // "REALIZADO" o "NO_REALIZADO"

            log.info("[*] Recibido resultado de mantenimiento para Reserva ID: {} -> {}", reservaId, resultadoStr);

            // 1. Buscar la reserva en la base de datos
            Reserva reserva = reservaRepository.findById(reservaId).orElse(null);
            
            if (reserva != null) {
                // 2. Actualizar el estado del mantenimiento
                reserva.setResultadoMantenimiento(ResultadoMantenimiento.valueOf(resultadoStr));
                reservaRepository.save(reserva);
                log.info("[x] Reserva ID: {} actualizada exitosamente con resultado: {}", reservaId, resultadoStr);
            } else {
                log.warn("[!] No se encontró la Reserva ID: {} para actualizar su mantenimiento.", reservaId);
            }

        } catch (Exception e) {
            log.error("[!] Error procesando el mensaje de mantenimiento: {}", mensajeJson, e);
            // Al lanzar la excepción, Spring Boot AMQP automáticamente rechaza el mensaje (NACK)
            // y, si hay una Dead Letter Exchange configurada, lo mandará ahí.
            throw new RuntimeException("Fallo al procesar evento de mantenimiento", e);
        }
    }
}