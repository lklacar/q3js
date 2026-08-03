package com.q3js.master.event.service;

import com.q3js.master.event.domain.GameEventPlayer;
import com.q3js.master.event.domain.IngestedEvent;
import com.q3js.master.event.dto.EventRequest;
import com.q3js.master.event.repository.EventRepository;

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
            player(request.player()),
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
            player(request.killer()),
            player(request.victim()),
            request.meansOfDeath(),
            request.gameTime(),
            request.serverTime(),
            request.map().trim()
        );
    }

    private static GameEventPlayer player(EventRequest.EventPlayer player) {
        return new GameEventPlayer(player.clientNum(), player.name());
    }
}
