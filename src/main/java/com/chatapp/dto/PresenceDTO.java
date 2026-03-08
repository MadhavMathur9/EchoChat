package com.chatapp.dto;

public record PresenceDTO(
    String type, // "JOIN" or "LEAVE"
    String senderName,
    int activeCount
) {}
