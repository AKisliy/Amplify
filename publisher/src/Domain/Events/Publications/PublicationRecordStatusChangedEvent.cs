namespace Publisher.Domain.Events.Publications;

public class PublicationRecordStatusChangedEvent : BaseEvent
{
    public PublicationRecord PublicationRecord { get; set; }

    public PublicationRecordStatusChangedEvent(PublicationRecord publicationRecord)
    {
        PublicationRecord = publicationRecord;
    }
}
