package com.chatapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DemoRequest(
    @NotBlank
    @Size(max = 500)
    String prompt
) {}
