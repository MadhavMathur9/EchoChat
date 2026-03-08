package com.chatapp.dto;

import com.chatapp.domain.SenderType;

import java.time.Instant;

public record MessageDTO(
    String id,
    String senderUuid,
    String senderName,
    SenderType senderType,
    String content,
    Instant timestamp
) {}
