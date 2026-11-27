from rest_framework import serializers
from .models import Message, InternalMessage


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "report",
            "sender",
            "sender_name",
            "content",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "report",
            "sender",
            "sender_name",
            "is_read",
            "read_at",
            "created_at",
        ]

    def get_sender_name(self, obj):
        name = f"{obj.sender.first_name} {obj.sender.last_name}".strip()
        return name or obj.sender.email

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "Message content cannot be empty."
            )
        if len(value) > 5000:
            raise serializers.ValidationError(
                "Message cannot exceed 5000 characters."
            )
        return value


class InternalMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source="sender.email", read_only=True)
    sender_name = serializers.SerializerMethodField()
    recipient_email = serializers.EmailField(
        source="recipient.email",
        read_only=True,
    )
    recipient_name = serializers.SerializerMethodField()
    parent_message_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = InternalMessage
        fields = [
            "id",
            "sender",
            "sender_email",
            "sender_name",
            "recipient",
            "recipient_email",
            "recipient_name",
            "subject",
            "content",
            "parent_message",
            "parent_message_id",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sender",
            "sender_email",
            "sender_name",
            "recipient",
            "recipient_email",
            "recipient_name",
            "parent_message",
            "parent_message_id",
            "is_read",
            "read_at",
            "created_at",
        ]

    def get_sender_name(self, obj):
        name = f"{obj.sender.first_name} {obj.sender.last_name}".strip()
        return name or obj.sender.email

    def get_recipient_name(self, obj):
        name = f"{obj.recipient.first_name} {obj.recipient.last_name}".strip()
        return name or obj.recipient.email

    def validate_subject(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Subject cannot be empty.")
        if len(value) > 200:
            raise serializers.ValidationError(
                "Subject cannot exceed 200 characters."
            )
        return value

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "Message content cannot be empty."
            )
        if len(value) > 5000:
            raise serializers.ValidationError(
                "Message cannot exceed 5000 characters."
            )
        return value
