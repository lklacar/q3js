package com.q3js.master.event;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.BadRequestException;

import java.util.Locale;

@ApplicationScoped
public class EventService {
    private final EventRepository eventRepository;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    public void ingest(EventRequest request, String sourceIp) {
        String type = request.event().trim().toLowerCase(Locale.ROOT);
        IngestedEvent event = switch (type) {
            case "join", "leave" -> lifecycleEvent(type, request);
            case "kill" -> killEvent(request);
            default -> throw new BadRequestException("Unsupported event type.");
        };
        eventRepository.insert(event, sourceIp);
    }

    private IngestedEvent lifecycleEvent(String type, EventRequest request) {
        if (request.player() == null || request.killer() != null || request.victim() != null || request.meansOfDeath() != null) {
            throw new BadRequestException("Lifecycle events require only a player.");
        }
        return new IngestedEvent(
            type,
            request.player(),
            null,
            null,
            null,
            request.gameTime(),
            request.serverTime(),
            request.map().trim()
        );
    }

    private IngestedEvent killEvent(EventRequest request) {
        if (request.player() != null || request.killer() == null || request.victim() == null || request.meansOfDeath() == null) {
            throw new BadRequestException("Kill events require a killer, victim, and means of death.");
        }
        return new IngestedEvent(
            "kill",
            null,
            request.killer(),
            request.victim(),
            request.meansOfDeath(),
            request.gameTime(),
            request.serverTime(),
            request.map().trim()
        );
    }
}
