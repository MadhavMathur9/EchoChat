package com.chatapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessagePayload(
    @NotBlank
    @Size(max = 4000)
    String content
) {}
