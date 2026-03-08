package com.chatapp.dto;

import com.chatapp.domain.Message;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MessageMapper {

    @Mapping(target = "id", expression = "java(message.getId().toString())")
    MessageDTO toDto(Message message);
}
