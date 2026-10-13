package com.chatapp.dto;

public record DemoResponse(
    String response,
    boolean rateLimited
) {}
